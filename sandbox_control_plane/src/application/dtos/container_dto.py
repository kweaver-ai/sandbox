"""
容器 DTO

定义容器数据传输对象。
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from sandbox_control_plane.src.domain.entities.container import Container


@dataclass
class ContainerDTO:
    """容器数据传输对象"""
    id: str
    session_id: str
    runtime_type: str
    node_id: str
    container_name: str
    image_url: str
    status: str
    ip_address: Optional[str] = None
    cpu_cores: float = 0.5
    memory_mb: int = 512
    disk_mb: int = 1024
    created_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    exited_at: Optional[datetime] = None

    @classmethod
    def from_entity(cls, container: Container) -> "ContainerDTO":
        """从领域实体创建 DTO"""
        return cls(
            id=container.id,
            session_id=container.session_id,
            runtime_type=container.runtime_type,
            node_id=container.node_id,
            container_name=container.container_name,
            image_url=container.image_url,
            status=container.status,
            ip_address=container.ip_address,
            cpu_cores=container.cpu_cores,
            memory_mb=container.memory_mb,
            disk_mb=container.disk_mb,
            created_at=container.created_at,
            started_at=container.started_at,
            exited_at=container.exited_at,
        )

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "runtime_type": self.runtime_type,
            "node_id": self.node_id,
            "container_name": self.container_name,
            "image_url": self.image_url,
            "status": self.status,
            "ip_address": self.ip_address,
            "cpu_cores": self.cpu_cores,
            "memory_mb": self.memory_mb,
            "disk_mb": self.disk_mb,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "exited_at": self.exited_at.isoformat() if self.exited_at else None,
        }
