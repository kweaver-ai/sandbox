"""
标准化执行结果定义
"""

from dataclasses import dataclass, asdict
from typing import Any, Optional, Dict


@dataclass
class ExecutionMetrics:
    """
    执行性能指标
    """

    duration_ms: float = 0.0  # 执行总耗时(毫秒)
    memory_peak_mb: float = 0.0  # 峰值内存占用(MB)
    cpu_time_ms: float = 0.0  # CPU 时间(毫秒)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class StandardExecutionResult:
    """
    标准化执行结果,确保上游系统可确定性解析
    """

    exit_code: int  # 退出状态码(0=成功)
    stdout: str  # 标准输出流
    stderr: str  # 标准错误流
    result: Any  # 函数业务返回值
    metrics: ExecutionMetrics  # 性能指标

    def to_dict(self) -> dict:
        """
        转换为字典格式
        """
        return {
            "exit_code": self.exit_code,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "result": self.result,
            "metrics": self.metrics.to_dict(),
        }

    def is_success(self) -> bool:
        """
        判断执行是否成功
        """
        return self.exit_code == 0


class ResultBuilder:
    """
    结果构建器,简化 StandardExecutionResult 创建
    """

    def __init__(self):
        self.exit_code = 0
        self.stdout = ""
        self.stderr = ""
        self.result = None
        self.metrics = ExecutionMetrics()

    def set_exit_code(self, code: int) -> "ResultBuilder":
        self.exit_code = code
        return self

    def set_stdout(self, stdout: str) -> "ResultBuilder":
        self.stdout = stdout
        return self

    def set_stderr(self, stderr: str) -> "ResultBuilder":
        self.stderr = stderr
        return self

    def set_result(self, result: Any) -> "ResultBuilder":
        self.result = result
        return self

    def set_metrics(self, metrics: ExecutionMetrics) -> "ResultBuilder":
        self.metrics = metrics
        return self

    def build(self) -> StandardExecutionResult:
        return StandardExecutionResult(
            exit_code=self.exit_code,
            stdout=self.stdout,
            stderr=self.stderr,
            result=self.result,
            metrics=self.metrics,
        )
