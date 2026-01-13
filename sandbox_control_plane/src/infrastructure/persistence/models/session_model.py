"""
会话 ORM 模型

SQLAlchemy 模型定义，用于数据库持久化。
按照 sandbox-design-v2.1.md 2.1.3 章节设计。
"""
from datetime import datetime
from sqlalchemy import func

from sqlalchemy import Column, String, Enum, DateTime, Integer, Text, JSON, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from src.infrastructure.persistence.database import Base


class SessionModel(Base):
    """
    会话 ORM 模型

    这是基础设施层的实现细节，映射到数据库表。
    按照 sandbox-design-v2.1.md 2.1.3 章节设计。
    """
    __tablename__ = "sessions"

    # Primary fields
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    template_id: Mapped[str] = mapped_column(String(64), nullable=False)

    # Status
    status = Column(
        Enum("creating", "running", "completed", "failed", "timeout", "terminated", name="session_status"),
        nullable=False,
        default="creating",
    )

    # Runtime configuration
    runtime_type = Column(
        Enum("python3.11", "nodejs20", "java17", "go1.21", name="runtime_type"),
        nullable=False,
    )

    # Runtime node and container
    runtime_node = Column(String(128), nullable=True)  # 当前运行的节点（可为空，支持会话迁移）
    container_id = Column(String(128), nullable=True)  # 当前容器 ID
    pod_name = Column(String(128), nullable=True)  # 当前 Pod 名称

    # Workspace and resources (存储格式化后的字符串)
    workspace_path = Column(String(256), nullable=True)  # S3 路径：s3://bucket/sessions/{session_id}/
    resources_cpu = Column(String(16), nullable=False)  # 如 "1", "2"
    resources_memory = Column(String(16), nullable=False)  # 如 "512Mi", "1Gi"
    resources_disk = Column(String(16), nullable=False)  # 如 "1Gi", "10Gi"

    # Environment and timeout
    env_vars = Column(JSON, nullable=True)
    timeout = Column(Integer, nullable=False, default=300)

    # Timestamps
    last_activity_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    completed_at = Column(DateTime, nullable=True)

    # Dependency installation fields (新增)
    requested_dependencies = Column(JSON, nullable=True)  # List[str]: 用户请求的依赖
    installed_dependencies = Column(JSON, nullable=True)  # List[Dict]: 实际安装的依赖
    dependency_install_status = Column(
        Enum("pending", "installing", "completed", "failed", name="dependency_install_status"),
        nullable=False,
        default="pending",
    )
    dependency_install_error = Column(Text, nullable=True)  # 安装失败原因
    dependency_install_started_at = Column(DateTime, nullable=True)
    dependency_install_completed_at = Column(DateTime, nullable=True)

    # Indexes
    __table_args__ = (
        Index("ix_sessions_status", "status"),
        Index("ix_sessions_template_id", "template_id"),
        Index("ix_sessions_created_at", "created_at"),
        Index("ix_sessions_runtime_node", "runtime_node"),
        Index("ix_sessions_last_activity_at", "last_activity_at"),
    )

    def to_entity(self):
        """转换为领域实体"""
        from src.domain.entities.session import Session, InstalledDependency
        from src.domain.value_objects.resource_limit import ResourceLimit
        from src.domain.value_objects.execution_status import SessionStatus

        # 数据库中已存储格式化后的字符串，直接使用
        session = Session(
            id=self.id,
            template_id=self.template_id,
            status=SessionStatus(self.status),
            resource_limit=ResourceLimit(
                cpu=self.resources_cpu,
                memory=self.resources_memory,
                disk=self.resources_disk,
                max_processes=128  # Default value
            ),
            workspace_path=self.workspace_path or "",
            runtime_type=self.runtime_type,
            runtime_node=self.runtime_node,
            container_id=self.container_id,
            pod_name=self.pod_name,
            env_vars=self.env_vars or {},
            timeout=self.timeout,
            created_at=self.created_at,
            updated_at=self.updated_at,
            completed_at=self.completed_at,
            last_activity_at=self.last_activity_at,
            # 依赖安装字段（新增）
            requested_dependencies=self.requested_dependencies or [],
            dependency_install_status=self.dependency_install_status or "pending",
            dependency_install_error=self.dependency_install_error,
        )

        # 转换 installed_dependencies JSON 为 InstalledDependency 对象列表
        if self.installed_dependencies:
            session.installed_dependencies = [
                InstalledDependency(
                    name=dep.get("name"),
                    version=dep.get("version"),
                    install_location=dep.get("install_location", "/workspace/.venv/"),
                    install_time=datetime.fromisoformat(dep["install_time"]) if dep.get("install_time") else datetime.now(),
                    is_from_template=dep.get("is_from_template", False)
                )
                for dep in self.installed_dependencies
            ]

        return session

    @classmethod
    def from_entity(cls, session):
        """从领域实体创建 ORM 模型"""
        # 转换 installed_dependencies 对象列表为 JSON
        installed_dependencies_json = None
        if session.installed_dependencies:
            installed_dependencies_json = [
                {
                    "name": dep.name,
                    "version": dep.version,
                    "install_location": dep.install_location,
                    "install_time": dep.install_time.isoformat(),
                    "is_from_template": dep.is_from_template,
                }
                for dep in session.installed_dependencies
            ]

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
            env_vars=session.env_vars,
            timeout=session.timeout,
            completed_at=session.completed_at,
            last_activity_at=session.last_activity_at,
            created_at=session.created_at,
            updated_at=session.updated_at,
            # 依赖安装字段（新增）
            requested_dependencies=session.requested_dependencies or None,
            installed_dependencies=installed_dependencies_json,
            dependency_install_status=session.dependency_install_status,
            dependency_install_error=session.dependency_install_error,
        )
