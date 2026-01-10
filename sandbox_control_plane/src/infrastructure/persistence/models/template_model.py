"""
模板 ORM 模型

SQLAlchemy 模型定义，用于数据库持久化。
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Column, String, Enum, DateTime, Integer, Text, JSON, Numeric, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import func

from src.infrastructure.persistence.database import Base


class TemplateModel(Base):
    """
    模板 ORM 模型

    这是基础设施层的实现细节，映射到数据库表。
    """
    __tablename__ = "templates"

    # Primary fields
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    # Description
    description = Column(Text, nullable=True)

    # Image configuration
    image_url = Column(String(512), nullable=False)
    base_image = Column(String(256), nullable=True)

    # Pre-installed packages (list of package names/specs)
    pre_installed_packages = Column(JSON, nullable=True)

    # Runtime type
    runtime_type = Column(
        Enum("python3.11", "nodejs20", "java17", "go1.21", name="runtime_type"),
        nullable=False,
    )

    # Default resource limits
    default_cpu_cores = Column(Numeric(3, 1), nullable=False, default=Decimal("0.5"))
    default_memory_mb = Column(Integer, nullable=False, default=512)
    default_disk_mb = Column(Integer, nullable=False, default=1024)
    default_timeout_sec = Column(Integer, nullable=False, default=300)

    # Default environment variables
    default_env_vars = Column(JSON, nullable=True)

    # Security context (security policies, seccomp rules, etc.)
    security_context = Column(JSON, nullable=True)

    # Status
    is_active = Column(Boolean, nullable=False, default=True)

    # Timestamps
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

    # Indexes
    __table_args__ = (
        Index("ix_templates_name", "name"),
        Index("ix_templates_runtime_type", "runtime_type"),
    )

    def to_entity(self):
        """转换为领域实体"""
        from src.domain.entities.template import Template
        from src.domain.value_objects.resource_limit import ResourceLimit

        # 将数据库中的数字转换为带单位的格式
        def format_resource(value):
            """将数字转换为带单位的格式"""
            if isinstance(value, (int, float)):
                return f"{int(value)}Mi"
            return str(value)

        return Template(
            id=self.id,
            name=self.name,
            image=self.image_url,
            base_image=self.base_image or self.image_url,
            pre_installed_packages=self.pre_installed_packages or [],
            default_resources=ResourceLimit(
                cpu=str(self.default_cpu_cores),
                memory=format_resource(self.default_memory_mb),
                disk=format_resource(self.default_disk_mb),
                max_processes=128,  # Default value
            ),
            security_context=self.security_context or {},
            created_at=self.created_at or datetime.now(),
            updated_at=self.updated_at or datetime.now(),
        )

    @classmethod
    def from_entity(cls, template):
        """从领域实体创建 ORM 模型"""
        import re

        def parse_mb_value(value: str) -> int:
            """解析资源值（将 '512Mi', '1Gi' 等转换为 MB）"""
            if not value:
                return 512  # 默认值

            # 提取数字部分
            numeric_str = re.sub(r'[^0-9.]', '', value)
            if not numeric_str:
                return 512

            numeric = float(numeric_str)

            # 根据单位转换
            if 'Gi' in value or 'GB' in value or 'G' in value:
                return int(numeric * 1024)
            elif 'Mi' in value or 'MB' in value or 'M' in value:
                return int(numeric)
            elif 'Ki' in value or 'KB' in value or 'K' in value:
                return int(numeric / 1024)
            else:
                # 如果没有单位，假设是 MB
                return int(numeric)

        return cls(
            id=template.id,
            name=template.name,
            description=None,  # Not in domain entity
            image_url=template.image,
            base_image=template.base_image,
            pre_installed_packages=template.pre_installed_packages,
            runtime_type="python3.11",  # Default, should be inferred
            default_cpu_cores=Decimal(template.default_resources.cpu),
            default_memory_mb=parse_mb_value(template.default_resources.memory),
            default_disk_mb=parse_mb_value(template.default_resources.disk),
            default_timeout_sec=300,  # Default
            default_env_vars=None,  # Not in domain entity
            security_context=template.security_context,
            is_active=True,
            created_at=template.created_at,
            updated_at=template.updated_at,
        )
