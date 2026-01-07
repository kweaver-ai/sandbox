"""
运行时节点 ORM 模型

SQLAlchemy 模型定义，用于数据库持久化。
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Column, String, Enum, DateTime, Integer, Numeric, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import func

from sandbox_control_plane.src.infrastructure.persistence.database import Base


class RuntimeNodeModel(Base):
    """
    运行时节点 ORM 模型

    这是基础设施层的实现细节，映射到数据库表。
    """
    __tablename__ = "runtime_nodes"

    # Primary fields
    node_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    hostname: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    # Runtime type
    runtime_type = Column(
        Enum("docker", "kubernetes", name="node_runtime"),
        nullable=False
    )

    # Network
    ip_address = Column(String(45), nullable=False)
    api_endpoint = Column(String(512), nullable=True)

    # Status
    status = Column(
        Enum(
            "online",
            "offline",
            "draining",
            "maintenance",
            name="node_status"
        ),
        nullable=False,
        default="online",
    )

    # Resources
    total_cpu_cores = Column(Numeric(5, 1), nullable=False)
    total_memory_mb = Column(Integer, nullable=False)
    allocated_cpu_cores = Column(Numeric(5, 1), nullable=False, default=0)
    allocated_memory_mb = Column(Integer, nullable=False, default=0)

    # Container capacity
    running_containers = Column(Integer, nullable=False, default=0)
    max_containers = Column(Integer, nullable=False)

    # Cache
    cached_images = Column(JSON, nullable=True)
    labels = Column(JSON, nullable=True)

    # Timestamps
    last_heartbeat_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    # Indexes
    __table_args__ = (
        Index("ix_runtime_nodes_status", "status"),
    )
