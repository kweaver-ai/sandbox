"""
容器实体

定义容器运行实例。
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.domain.value_objects.container_status import ContainerStatus


@dataclass
class Container:
    """
    容体实体

    表示一个运行中的容器实例（Docker 容器或 Kubernetes Pod）。
    """
    id: str
    session_id: str
    runtime_type: str  # "docker" or "kubernetes"
    node_id: str
    container_name: str
    image_url: str
    status: ContainerStatus
    ip_address: Optional[str] = None
    cpu_cores: float = 0.5
    memory_mb: int = 512
    disk_mb: int = 1024
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    exited_at: Optional[datetime] = None

    def __post_init__(self):
        """初始化后验证"""
        if not self.session_id:
            raise ValueError("session_id cannot be empty")
        if not self.container_name:
            raise ValueError("container_name cannot be empty")

    # ============== 领域行为 ==============

    def mark_as_started(self) -> None:
        """标记容器为已启动"""
        if self.status != ContainerStatus.CREATED:
            raise ValueError(f"Cannot mark container as started from status: {self.status}")

        self.status = ContainerStatus.RUNNING
        self.started_at = datetime.now()

    def mark_as_exited(self, exit_code: int = 0) -> None:
        """标记容器为已退出"""
        if self.status not in {ContainerStatus.CREATED, ContainerStatus.RUNNING}:
            raise ValueError(f"Cannot mark container as exited from status: {self.status}")

        self.status = ContainerStatus.EXITED
        self.exited_at = datetime.now()

    def mark_as_deleting(self) -> None:
        """标记容器为删除中"""
        if self.status == ContainerStatus.DELETING:
            return  # 已经是删除中状态

        self.status = ContainerStatus.DELETING

    # ============== 领域查询 ==============

    def is_running(self) -> bool:
        """是否正在运行"""
        return self.status == ContainerStatus.RUNNING

    def is_stopped(self) -> bool:
        """是否已停止"""
        return self.status in {ContainerStatus.EXITED, ContainerStatus.DELETING}

    def get_uptime_seconds(self) -> Optional[float]:
        """获取运行时间（秒）"""
        if not self.started_at:
            return None

        end_time = self.exited_at or datetime.now()
        return (end_time - self.started_at).total_seconds()
