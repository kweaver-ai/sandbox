#!/usr/bin/env python3
"""
数据库表初始化脚本

创建所有数据库表并初始化默认数据。
"""
import asyncio
import sys
from decimal import Decimal
from pathlib import Path
from sqlalchemy import select

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from src.infrastructure.persistence.database import db_manager
from src.infrastructure.persistence.models.runtime_node_model import RuntimeNodeModel
from src.infrastructure.persistence.models.template_model import TemplateModel

# Import all models so they're registered with Base.metadata
from src.infrastructure.persistence.models.session_model import SessionModel
from src.infrastructure.persistence.models.execution_model import ExecutionModel
from src.infrastructure.persistence.models.container_model import ContainerModel


async def init_runtime_nodes(session) -> None:
    """初始化默认运行时节点"""
    # 检查是否已存在节点
    result = await session.execute(select(RuntimeNodeModel))
    existing_nodes = result.scalars().all()

    if existing_nodes:
        print(f"Found {len(existing_nodes)} existing runtime nodes, skipping initialization")
        return

    # 创建默认 Docker 运行时节点
    # 这个节点指向本地 Docker daemon，用于运行 executor 容器
    default_node = RuntimeNodeModel(
        node_id="docker-local",
        hostname="sandbox-control-plane",
        runtime_type="docker",
        ip_address="127.0.0.1",
        api_endpoint="unix:///var/run/docker.sock",
        status="online",
        total_cpu_cores=Decimal("8.0"),  # 默认 8 核 CPU
        total_memory_mb=16384,  # 默认 16GB 内存
        max_containers=50,  # 默认最大 50 个容器
        running_containers=0,
        allocated_cpu_cores=Decimal("0"),
        allocated_memory_mb=0,
        cached_images=[],  # 初始没有缓存的镜像
        labels={"environment": "development", "type": "default"},
    )
    session.add(default_node)
    await session.flush()
    print("Created default Docker runtime node: docker-local")


async def init_templates(session) -> None:
    """初始化默认模板"""
    # 检查是否已存在模板
    result = await session.execute(select(TemplateModel))
    existing_templates = result.scalars().all()

    if existing_templates:
        print(f"Found {len(existing_templates)} existing templates, skipping initialization")
        return

    # 创建默认 Python 基础模板
    default_template = TemplateModel(
        id="python-basic",
        name="Python Basic",
        description="基础 Python 执行环境",
        image_url="sandbox-template-python-basic:latest",
        runtime_type="python3.11",
        default_cpu_cores=Decimal("1.0"),
        default_memory_mb=512,
        default_disk_mb=1024,
        default_timeout_sec=300,
        is_active=True,
        pre_installed_packages=[],
    )
    session.add(default_template)
    await session.flush()
    print("Created default template: python-basic")


async def main():
    """创建所有数据库表并初始化默认数据"""
    print("Initializing database...")

    # Initialize database manager
    db_manager.initialize()
    print("Database manager initialized")

    # Create all tables
    await db_manager.create_tables()
    print("Database tables created successfully")

    # Initialize default data
    async with db_manager.get_session() as session:
        await init_runtime_nodes(session)
        await init_templates(session)
        print("Default data initialized successfully")

    # Close connection
    await db_manager.close()
    print("Database connection closed")


if __name__ == "__main__":
    asyncio.run(main())
