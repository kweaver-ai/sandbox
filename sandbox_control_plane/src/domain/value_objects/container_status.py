"""
容器状态值对象

定义容器的生命周期状态。
"""
from enum import Enum


class ContainerStatus(Enum):
    """容器状态枚举"""
    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"
    EXITED = "exited"
    DELETING = "deleting"

    def __str__(self) -> str:
        return self.value
