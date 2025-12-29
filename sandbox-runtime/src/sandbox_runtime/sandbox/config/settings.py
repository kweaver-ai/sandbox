"""
全局配置管理
"""

from dataclasses import dataclass
from typing import Optional
import os


@dataclass
class GlobalConfig:
    """
    全局配置类
    """

    # 沙箱池配置
    pool_size: int = 5
    cpu_quota: int = 1
    memory_limit: int = 256
    allow_network: bool = False
    max_idle_time: int = 300
    max_task_count: int = 100

    # 执行配置
    default_timeout: int = 3000
    default_memory_limit: int = 256

    # 日志配置
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    @classmethod
    def from_env(cls) -> "GlobalConfig":
        """
        从环境变量加载配置
        """
        return cls(
            pool_size=int(os.getenv("SANDBOX_POOL_SIZE", "5")),
            cpu_quota=int(os.getenv("SANDBOX_CPU_QUOTA", "1")),
            memory_limit=int(os.getenv("SANDBOX_MEMORY_LIMIT", "256")),
            allow_network=os.getenv("SANDBOX_ALLOW_NETWORK", "false").lower() == "true",
            max_idle_time=int(os.getenv("SANDBOX_MAX_IDLE_TIME", "300")),
            max_task_count=int(os.getenv("SANDBOX_MAX_TASK_COUNT", "100")),
            default_timeout=int(os.getenv("DEFAULT_TIMEOUT", "3000")),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
        )


# 全局配置实例
config = GlobalConfig.from_env()
