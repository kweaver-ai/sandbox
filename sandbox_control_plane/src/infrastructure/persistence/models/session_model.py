"""
会话 ORM 模型

SQLAlchemy 模型定义，用于数据库持久化。
"""
from datetime import datetime
from sqlalchemy import Column, String, Enum, DateTime, Integer, Text, JSON
from sqlalchemy.orm import DeclarativeBase

from sandbox_control_plane.src.domain.value_objects.execution_status import SessionStatus


class Base(DeclarativeBase):
    """SQLAlchemy 基类"""
    pass


class SessionModel(Base):
    """
    会话 ORM 模型

    这是基础设施层的实现细节，映射到数据库表。
    """
    __tablename__ = "sessions"

    id = Column(String(64), primary_key=True)
    template_id = Column(String(64), nullable=False)
    status = Column(
        Enum("creating", "running", "completed", "failed", "timeout", "terminated"),
        nullable=False
    )
    runtime_type = Column(Enum("docker", "kubernetes"), nullable=False)
    runtime_node = Column(String(128))
    container_id = Column(String(128))
    pod_name = Column(String(128))
    workspace_path = Column(String(256))
    resources_cpu = Column(String(16))
    resources_memory = Column(String(16))
    resources_disk = Column(String(16))
    resources_max_processes = Column(Integer)
    env_vars = Column(JSON)
    timeout = Column(Integer, nullable=False, default=300)
    last_activity_at = Column(DateTime, nullable=False, default=datetime.now)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)
    completed_at = Column(DateTime, nullable=True)

    def to_entity(self):
        """转换为领域实体"""
        from sandbox_control_plane.src.domain.entities.session import Session
        from sandbox_control_plane.src.domain.value_objects.resource_limit import ResourceLimit

        return Session(
            id=self.id,
            template_id=self.template_id,
            status=SessionStatus(self.status),
            resource_limit=ResourceLimit(
                cpu=self.resources_cpu,
                memory=self.resources_memory,
                disk=self.resources_disk,
                max_processes=self.resources_max_processes or 128
            ),
            workspace_path=self.workspace_path,
            runtime_type=self.runtime_type,
            runtime_node=self.runtime_node,
            container_id=self.container_id,
            pod_name=self.pod_name,
            env_vars=self.env_vars or {},
            timeout=self.timeout,
            created_at=self.created_at,
            updated_at=self.updated_at,
            completed_at=self.completed_at,
            last_activity_at=self.last_activity_at
        )

    @classmethod
    def from_entity(cls, session):
        """从领域实体创建 ORM 模型"""
        return cls(
            id=session.id,
            template_id=session.template_id,
            status=session.status.value,
            runtime_type=session.runtime_type,
            runtime_node=session.runtime_node,
            container_id=session.container_id,
            pod_name=session.pod_name,
            workspace_path=session.workspace_path,
            resources_cpu=session.resource_limit.cpu,
            resources_memory=session.resource_limit.memory,
            resources_disk=session.resource_limit.disk,
            resources_max_processes=session.resource_limit.max_processes,
            env_vars=session.env_vars,
            timeout=session.timeout,
            created_at=session.created_at,
            updated_at=session.updated_at,
            completed_at=session.completed_at,
            last_activity_at=session.last_activity_at
        )
