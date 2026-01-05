"""
创建会话命令

定义创建会话的命令对象。
"""
from dataclasses import dataclass
from typing import Dict

from src.domain.value_objects.resource_limit import ResourceLimit


@dataclass
class CreateSessionCommand:
    """创建会话命令"""
    template_id: str
    timeout: int = 300
    resource_limit: ResourceLimit | None = None
    env_vars: Dict[str, str] | None = None

    def __post_init__(self):
        """初始化后验证"""
        if self.timeout <= 0:
            raise ValueError("timeout must be positive")

        # 设置默认值
        if self.resource_limit is None:
            self.resource_limit = ResourceLimit.default()
        if self.env_vars is None:
            self.env_vars = {}
