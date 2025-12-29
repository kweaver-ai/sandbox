"""
核心执行器,协调沙箱执行流程
"""

import asyncio
import json
import time
import logging
from typing import Dict, Any, Optional
from io import StringIO
import sys

from sandbox_runtime.sandbox.core.context import LambdaContext, create_context
from sandbox_runtime.sandbox.core.result import (
    StandardExecutionResult,
    ExecutionMetrics,
    ResultBuilder,
)
from sandbox_runtime.sandbox.core.errors import (
    ExitCode,
    CodeLoadError,
    HandlerExecutionError,
)
from sandbox_runtime.sandbox.sandbox.async_pool import AsyncSandboxPool
from sandbox_runtime.sandbox.utils.monitoring import MemoryMonitor
from sandbox_runtime.sandbox.utils.validation import (
    validate_handler_code,
    validate_event,
)

from sandbox_runtime.utils.loggers import get_logger

logger = get_logger(__name__)


class LambdaSandboxExecutor:
    """
    Lambda 沙箱执行器
    统一入口,协调整个执行流程
    """

    def __init__(self, pool: Optional[AsyncSandboxPool] = None):
        self.pool = pool or AsyncSandboxPool()

        if not self.pool.is_running:
            self.pool.start()

    async def invoke(
        self,
        handler_code: str,
        event: Dict[str, Any],
        context_kwargs: Optional[Dict[str, Any]] = None,
    ) -> StandardExecutionResult:
        """
        函数调用核心接口

        Args:
            handler_code: 用户 handler 代码字符串
            event: 业务输入数据
            context_kwargs: 自定义 Context 参数

        Returns:
            StandardExecutionResult: 标准化执行结果
        """
        builder = ResultBuilder()
        start_time = time.time()
        sandbox = None

        try:
            # 1. 参数校验
            validate_handler_code(handler_code)
            validate_event(event)

            # 2. 创建 Context
            context = create_context(**(context_kwargs or {}))

            # 3. 获取沙箱
            sandbox = await self.pool.acquire(timeout=5.0)

            # 4. 启动内存监控
            memory_monitor = MemoryMonitor(sandbox.process.pid)
            memory_monitor.start()

            # 5. 执行任务
            task_data = {
                "handler_code": handler_code,
                "event": event,
                "context": context.to_dict(),
            }

            result_data = await sandbox.execute(task_data)

            # 6. 停止内存监控
            memory_monitor.stop()
            peak_memory = memory_monitor.get_peak_memory()

            # 7. 构建结果
            duration_ms = (time.time() - start_time) * 1000

            metrics = ExecutionMetrics(
                duration_ms=duration_ms,
                memory_peak_mb=peak_memory,
                cpu_time_ms=result_data.get("cpu_time_ms", 0),
            )

            builder.set_exit_code(result_data.get("exit_code", 0))
            builder.set_stdout(result_data.get("stdout", ""))
            builder.set_stderr(result_data.get("stderr", ""))
            builder.set_result(result_data.get("result"))
            builder.set_metrics(metrics)

            logger.info(
                f"任务执行完成: exit_code={result_data.get('exit_code')}, "
                f"duration={duration_ms:.2f}ms, memory={peak_memory:.2f}MB"
            )

        except Exception as e:
            # 异常处理
            duration_ms = (time.time() - start_time) * 1000
            logger.error(f"任务执行异常: {e}", exc_info=True)

            builder.set_exit_code(ExitCode.SYSTEM_ERROR)
            builder.set_stderr(f"System error: {str(e)}")
            builder.set_metrics(ExecutionMetrics(duration_ms=duration_ms))

        finally:
            # 归还沙箱
            if sandbox:
                await self.pool.release(sandbox)

        return builder.build()

    def shutdown(self) -> None:
        """
        关闭执行器
        """
        self.pool.shutdown()


# 便捷函数
def invoke(
    handler_code: str,
    event: Dict[str, Any],
    context_kwargs: Optional[Dict[str, Any]] = None,
) -> StandardExecutionResult:
    """
    全局便捷调用函数
    """
    executor = LambdaSandboxExecutor()
    return executor.invoke(handler_code, event, context_kwargs)
