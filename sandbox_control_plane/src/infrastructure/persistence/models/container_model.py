"""
容器 ORM 模型

SQLAlchemy 模型定义，用于数据库持久化。
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Column, String, Enum, DateTime, Integer, Numeric, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import func

from src.infrastructure.persistence.database import Base


class ContainerModel(Base):
    """
    容器 ORM 模型

    这是基础设施层的实现细节，映射到数据库表。
    """
    __tablename__ = "containers"

    # Primary fields
    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String(64), nullable=False
    )

    # Runtime type
    runtime_type = Column(
        Enum("docker", "kubernetes", name="container_runtime"),
        nullable=False
    )

    # Node assignment
    node_id = Column(
        String(64), nullable=False
    )

    # Container information
    container_name = Column(String(255), nullable=False)
    image_url = Column(String(512), nullable=False)

    # Status
    status = Column(
        Enum(
            "created",
            "running",
            "paused",
            "exited",
            "deleting",
            name="container_status"
        ),
        nullable=False,
        default="created",
    )

    # Network
    ip_address = Column(String(45), nullable=True)
    executor_port = Column(Integer, nullable=True)

    # Resource limits
    cpu_cores = Column(Numeric(3, 1), nullable=False)
    memory_mb = Column(Integer, nullable=False)
    disk_mb = Column(Integer, nullable=False)

    # Timestamps
    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
    started_at = Column(DateTime, nullable=True)
    exited_at = Column(DateTime, nullable=True)

    # Indexes
    __table_args__ = (
        Index("ix_containers_session_id", "session_id"),
        Index("ix_containers_node_id", "node_id"),
    )

    def to_entity(self):
        """转换为领域实体"""
        from src.domain.entities.container import Container
        from src.domain.value_objects.resource_limit import ResourceLimit
        from src.domain.value_objects.container_status import ContainerStatus

        return Container(
            id=self.id,
            session_id=self.session_id,
            runtime_type=self.runtime_type,
            node_id=self.node_id,
            name=self.container_name,
            image_url=self.image_url,
            status=ContainerStatus(self.status),
            ip_address=self.ip_address,
            executor_port=self.executor_port,
            resource_limit=ResourceLimit(
                cpu=str(self.cpu_cores),
                memory=str(self.memory_mb),
                disk=str(self.disk_mb),
                max_processes=128,
            ),
            created_at=self.created_at,
            started_at=self.started_at,
            exited_at=self.exited_at,
        )

    @classmethod
    def from_entity(cls, container):
        """从领域实体创建 ORM 模型"""
        return cls(
            id=container.id,
            session_id=container.session_id,
            runtime_type=container.runtime_type,
            node_id=container.node_id,
            container_name=container.name,
            image_url=container.image_url,
            status=container.status.value,
            ip_address=container.ip_address,
            executor_port=container.executor_port,
            cpu_cores=Decimal(container.resource_limit.cpu),
            memory_mb=int(container.resource_limit.memory),
            disk_mb=int(container.resource_limit.disk),
            created_at=container.created_at,
            started_at=container.started_at,
            exited_at=container.exited_at,
        )
