#!/usr/bin/env python3
"""
数据库初始化脚本

创建数据库和所有表结构。
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import DeclarativeBase, Session
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text


class Base(DeclarativeBase):
    """SQLAlchemy 基类"""
    pass


# ==================== ORM Models ====================

class Template(Base):
    """沙箱环境模板"""
    __tablename__ = "templates"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    image_url = Column(String(512), nullable=False)
    base_image = Column(String(256), nullable=True)
    pre_installed_packages = Column(JSON, nullable=True)
    runtime_type = Column(
        Enum("python3.11", "nodejs20", "java17", "go1.21", name="runtime_type"),
        nullable=False,
    )
    default_cpu_cores = Column(Numeric(3, 1), nullable=False, default=0.5)
    default_memory_mb = Column(Integer, nullable=False, default=512)
    default_disk_mb = Column(Integer, nullable=False, default=1024)
    default_timeout_sec = Column(Integer, nullable=False, default=300)
    default_env_vars = Column(JSON, nullable=True)
    security_context = Column(JSON, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(
        DateTime,
        nullable=False,
        default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP"),
    )


class Session(Base):
    """沙箱执行会话 - 按照 sandbox-design-v2.1.md 2.1.3 章节设计"""
    __tablename__ = "sessions"

    id = Column(String(64), primary_key=True)
    template_id = Column(
        String(64), ForeignKey("templates.id", ondelete="CASCADE"), nullable=False
    )
    status = Column(
        Enum(
            "creating",
            "running",
            "completed",
            "failed",
            "timeout",
            "terminated",
            name="session_status",
        ),
        nullable=False,
        default="creating",
    )
    runtime_type = Column(
        Enum("python3.11", "nodejs20", "java17", "go1.21", name="runtime_type"),
        nullable=False,
    )
    runtime_node = Column(String(128), nullable=True)  # 当前运行的节点（可为空，支持会话迁移）
    container_id = Column(String(128), nullable=True)  # 当前容器 ID
    pod_name = Column(String(128), nullable=True)  # 当前 Pod 名称
    workspace_path = Column(String(256), nullable=True)  # S3 路径：s3://bucket/sessions/{session_id}/
    resources_cpu = Column(String(16), nullable=False)  # 如 "1", "2"
    resources_memory = Column(String(16), nullable=False)  # 如 "512Mi", "1Gi"
    resources_disk = Column(String(16), nullable=False)  # 如 "1Gi", "10Gi"
    env_vars = Column(JSON, nullable=True)
    timeout = Column(Integer, nullable=False, default=300)
    last_activity_at = Column(
        DateTime,
        nullable=False,
        default=text("CURRENT_TIMESTAMP"),
    )
    created_at = Column(
        DateTime,
        nullable=False,
        default=text("CURRENT_TIMESTAMP"),
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP"),
    )
    completed_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_sessions_status", "status"),
        Index("ix_sessions_template_id", "template_id"),
        Index("ix_sessions_created_at", "created_at"),
        Index("ix_sessions_runtime_node", "runtime_node"),
        Index("ix_sessions_last_activity_at", "last_activity_at"),
    )


class Execution(Base):
    """代码执行请求"""
    __tablename__ = "executions"

    id = Column(String(64), primary_key=True)
    session_id = Column(
        String(64), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    status = Column(
        Enum(
            "pending",
            "running",
            "completed",
            "failed",
            "timeout",
            "crashed",
            name="execution_status",
        ),
        nullable=False,
        default="pending",
    )
    code = Column(Text, nullable=False)
    language = Column(String(32), nullable=False)
    entrypoint = Column(String(255), nullable=True)
    event_data = Column(JSON, nullable=True)
    timeout_sec = Column(Integer, nullable=False)
    return_value = Column(JSON, nullable=True)
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    exit_code = Column(Integer, nullable=True)
    metrics = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(
        DateTime,
        nullable=False,
        default=text("CURRENT_TIMESTAMP"),
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP"),
    )

    __table_args__ = (
        Index("ix_executions_session_id", "session_id"),
        Index("ix_executions_status", "status"),
    )


class Container(Base):
    """容器实例 (Docker 或 Kubernetes)"""
    __tablename__ = "containers"

    id = Column(String(128), primary_key=True)
    session_id = Column(
        String(64), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    runtime_type = Column(
        Enum("docker", "kubernetes", name="container_runtime"), nullable=False
    )
    node_id = Column(
        String(64), ForeignKey("runtime_nodes.node_id", ondelete="CASCADE"), nullable=False
    )
    container_name = Column(String(255), nullable=False)
    image_url = Column(String(512), nullable=False)
    status = Column(
        Enum(
            "created",
            "running",
            "paused",
            "exited",
            "deleting",
            name="container_status",
        ),
        nullable=False,
        default="created",
    )
    ip_address = Column(String(45), nullable=True)
    executor_port = Column(Integer, nullable=True)
    cpu_cores = Column(Numeric(3, 1), nullable=False)
    memory_mb = Column(Integer, nullable=False)
    disk_mb = Column(Integer, nullable=False)
    created_at = Column(
        DateTime,
        nullable=False,
        default=text("CURRENT_TIMESTAMP"),
    )
    started_at = Column(DateTime, nullable=True)
    exited_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_containers_session_id", "session_id"),
        Index("ix_containers_node_id", "node_id"),
    )


class Artifact(Base):
    """执行输出制品"""
    __tablename__ = "artifacts"

    id = Column(String(64), primary_key=True)
    execution_id = Column(
        String(64), ForeignKey("executions.id", ondelete="CASCADE"), nullable=False
    )
    artifact_type = Column(
        Enum("file", "stdout", "stderr", "return_value", name="artifact_type"),
        nullable=False,
    )
    name = Column(String(255), nullable=True)
    s3_path = Column(String(512), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    content_type = Column(String(128), nullable=True)
    created_at = Column(
        DateTime,
        nullable=False,
        default=text("CURRENT_TIMESTAMP"),
    )

    __table_args__ = (
        Index("ix_artifacts_execution_id", "execution_id"),
    )


class RuntimeNode(Base):
    """容器运行时节点 (Docker 主机或 Kubernetes 节点)"""
    __tablename__ = "runtime_nodes"

    node_id = Column(String(64), primary_key=True)
    hostname = Column(String(255), nullable=False, unique=True)
    runtime_type = Column(
        Enum("docker", "kubernetes", name="node_runtime"), nullable=False
    )
    ip_address = Column(String(45), nullable=False)
    api_endpoint = Column(String(512), nullable=True)
    status = Column(
        Enum(
            "online",
            "offline",
            "draining",
            "maintenance",
            name="node_status",
        ),
        nullable=False,
        default="online",
    )
    total_cpu_cores = Column(Numeric(5, 1), nullable=False)
    total_memory_mb = Column(Integer, nullable=False)
    allocated_cpu_cores = Column(Numeric(5, 1), nullable=False, default=0)
    allocated_memory_mb = Column(Integer, nullable=False, default=0)
    running_containers = Column(Integer, nullable=False, default=0)
    max_containers = Column(Integer, nullable=False)
    cached_images = Column(JSON, nullable=True)
    labels = Column(JSON, nullable=True)
    last_heartbeat_at = Column(
        DateTime,
        nullable=False,
        default=text("CURRENT_TIMESTAMP"),
    )
    created_at = Column(
        DateTime,
        nullable=False,
        default=text("CURRENT_TIMESTAMP"),
    )

    __table_args__ = (
        Index("ix_runtime_nodes_status", "status"),
    )


async def create_database():
    """创建数据库"""
    from dotenv import load_dotenv
    load_dotenv()

    # 连接到 MySQL 服务器（不指定数据库）
    database_url = "mysql+aiomysql://root:12345678@127.0.0.1:3308"
    engine = create_async_engine(database_url, echo=True)

    async with engine.begin() as conn:
        # 删除旧数据库（如果存在）
        await conn.execute(text("DROP DATABASE IF EXISTS sandbox_control_plane"))
        print("✓ Old database dropped (if existed)")

        # 创建新数据库
        await conn.execute(text("CREATE DATABASE IF NOT EXISTS sandbox_control_plane"))
        print("✓ Database 'sandbox_control_plane' created")

    await engine.dispose()


async def create_tables():
    """创建所有表"""
    from dotenv import load_dotenv
    load_dotenv()

    # 连接到 sandbox_control_plane 数据库
    database_url = "mysql+aiomysql://root:12345678@127.0.0.1:3308/sandbox_control_plane"
    engine = create_async_engine(database_url, echo=True)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("✓ All tables created successfully")

    await engine.dispose()


async def seed_default_templates():
    """插入默认模板"""
    from dotenv import load_dotenv
    load_dotenv()

    database_url = "mysql+aiomysql://root:12345678@127.0.0.1:3308/sandbox_control_plane"
    engine = create_async_engine(database_url, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        # 检查是否已有模板
        from sqlalchemy import select
        result = await session.execute(select(Template).limit(1))
        if result.scalar_one_or_none():
            print("✓ Templates already exist, skipping seed")
            return

        # 创建默认模板
        templates = [
            Template(
                id="python-basic",
                name="Python Basic",
                description="基础 Python 3.11 环境",
                image_url="python:3.11-slim",
                base_image="python:3.11-slim",
                pre_installed_packages=["pip", "setuptools", "wheel"],
                runtime_type="python3.11",
                default_cpu_cores=Decimal("0.5"),
                default_memory_mb=512,
                default_disk_mb=1024,
                default_timeout_sec=300,
                default_env_vars={"PYTHONPATH": "/app"},
                security_context={"network_enabled": False, "allow_privilege_escalation": False},
            ),
            Template(
                id="python-datascience",
                name="Python Data Science",
                description="Python 数据科学环境，包含 NumPy, Pandas 等",
                image_url="python:3.11-datascience",
                base_image="python:3.11-slim",
                pre_installed_packages=["numpy", "pandas", "matplotlib", "scipy", "jupyter"],
                runtime_type="python3.11",
                default_cpu_cores=Decimal("2.0"),
                default_memory_mb=2048,
                default_disk_mb=5120,
                default_timeout_sec=600,
                default_env_vars={
                    "PYTHONPATH": "/app",
                    "JUPYTER_ENABLE": "true",
                },
                security_context={"network_enabled": False, "allow_privilege_escalation": False},
            ),
            Template(
                id="nodejs-basic",
                name="Node.js Basic",
                description="基础 Node.js 20 环境",
                image_url="node:20-slim",
                base_image="node:20-slim",
                pre_installed_packages=["npm", "yarn"],
                runtime_type="nodejs20",
                default_cpu_cores=Decimal("0.5"),
                default_memory_mb=512,
                default_disk_mb=1024,
                default_timeout_sec=300,
                default_env_vars={"NODE_ENV": "production"},
                security_context={"network_enabled": False, "allow_privilege_escalation": False},
            ),
        ]

        for template in templates:
            session.add(template)

        await session.commit()
        print(f"✓ Seeded {len(templates)} default templates")


async def main():
    """主函数"""
    print("=" * 60)
    print("Sandbox Control Plane - Database Initialization")
    print("=" * 60)

    # 1. 创建数据库
    print("\n[Step 1/3] Creating database...")
    await create_database()

    # 2. 创建表
    print("\n[Step 2/3] Creating tables...")
    await create_tables()

    # 3. 插入默认数据
    print("\n[Step 3/3] Seeding default data...")
    await seed_default_templates()

    print("\n" + "=" * 60)
    print("✅ Database initialization completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
