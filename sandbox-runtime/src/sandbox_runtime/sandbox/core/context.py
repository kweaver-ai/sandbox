"""
AWS Lambda Context 兼容实现
"""

import uuid
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class LambdaContext:
    """
    运行时上下文对象,提供函数执行所需的元信息
    """

    function_name: str = "unknown-function"
    function_version: str = "$LATEST"
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    log_group_name: str = "/lambda-sandbox/logs"
    log_stream_name: str = field(default_factory=lambda: str(uuid.uuid4()))
    remaining_time_in_millis: int = 3000
    memory_limit_in_mb: int = 256

    # 扩展字段
    invoked_function_arn: Optional[str] = None

    def get_remaining_time_in_millis(self) -> int:
        """
        获取剩余执行时间(毫秒)
        AWS Lambda 兼容方法
        """
        return self.remaining_time_in_millis

    def to_dict(self) -> dict:
        """
        转换为字典格式,用于序列化传输
        """
        return {
            "function_name": self.function_name,
            "function_version": self.function_version,
            "request_id": self.request_id,
            "log_group_name": self.log_group_name,
            "log_stream_name": self.log_stream_name,
            "remaining_time_in_millis": self.remaining_time_in_millis,
            "memory_limit_in_mb": self.memory_limit_in_mb,
            "invoked_function_arn": self.invoked_function_arn,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "LambdaContext":
        """
        从字典构造 Context 对象
        """
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


def create_context(**kwargs) -> LambdaContext:
    """
    Context 工厂方法,支持自定义参数覆盖
    """
    return LambdaContext(**kwargs)
