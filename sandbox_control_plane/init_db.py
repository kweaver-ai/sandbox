#!/usr/bin/env python3
"""
数据库表初始化脚本

创建所有数据库表。
"""
import asyncio
from sandbox_control_plane.src.infrastructure.persistence.database import db_manager

# Import all models so they're registered with Base.metadata
from sandbox_control_plane.src.infrastructure.persistence.models.session_model import SessionModel
from sandbox_control_plane.src.infrastructure.persistence.models.execution_model import ExecutionModel
from sandbox_control_plane.src.infrastructure.persistence.models.template_model import TemplateModel
from sandbox_control_plane.src.infrastructure.persistence.models.container_model import ContainerModel
from sandbox_control_plane.src.infrastructure.persistence.models.runtime_node_model import RuntimeNodeModel


async def main():
    """创建所有数据库表"""
    print("Initializing database...")

    # Initialize database manager
    db_manager.initialize()
    print("Database manager initialized")

    # Create all tables
    await db_manager.create_tables()
    print("Database tables created successfully")

    # Close connection
    await db_manager.close()
    print("Database connection closed")


if __name__ == "__main__":
    asyncio.run(main())
