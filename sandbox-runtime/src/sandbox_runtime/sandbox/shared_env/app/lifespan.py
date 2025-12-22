from typing import Optional
from sandbox_runtime.sandbox.sandbox.async_pool import AsyncSandboxPool
from sandbox_runtime.sandbox.core.executor import LambdaSandboxExecutor
from sandbox_runtime.sandbox.sandbox.config import SandboxConfig

# 全局executor实例
executor: Optional[LambdaSandboxExecutor] = None


async def init_sandbox_pool():
    """
    初始化异步沙箱池和全局executor

    Returns:
        LambdaSandboxExecutor: 全局executor实例
    """
    global executor

    # 如果已经初始化，则直接返回
    if executor is not None:
        return executor

    # 创建沙箱配置
    config = SandboxConfig(
        cpu_quota=2, memory_limit=128 * 1024, allow_network=True, max_task_count=50
    )

    # 创建沙箱池
    pool = AsyncSandboxPool(pool_size=2, config=config)
    await pool.start()

    # 创建执行器
    executor = LambdaSandboxExecutor(pool=pool)


async def shutdown_sandbox_pool():
    """
    关闭异步沙箱池和全局executor
    """
    global executor

    if executor:
        executor.shutdown()
        executor = None
