"""
数据库连接管理

配置和管理 SQLAlchemy 异步引擎和会话。
"""
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from urllib.parse import urlparse

import aiomysql

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession, AsyncEngine
from sqlalchemy.orm import DeclarativeBase

from src.infrastructure.config.settings import get_settings
from src.infrastructure.logging import get_logger


class Base(DeclarativeBase):
    """SQLAlchemy 基类"""
    pass


logger = get_logger(__name__)


# Import all models so they're registered with Base.metadata
# This is required for create_all() to find all tables
from src.infrastructure.persistence.models.template_model import TemplateModel
from src.infrastructure.persistence.models.session_model import SessionModel
from src.infrastructure.persistence.models.execution_model import ExecutionModel
from src.infrastructure.persistence.models.runtime_node_model import RuntimeNodeModel


class DatabaseManager:
    """
    数据库管理器

    负责创建和管理数据库连接。
    """

    def __init__(self):
        self._engine: AsyncEngine | None = None
        self._session_factory: async_sessionmaker[AsyncSession] | None = None

    async def ensure_database_exists(self) -> None:
        """
        确保数据库存在，如果不存在则创建

        使用原始连接（不通过 SQLAlchemy）来创建数据库，
        因为 SQLAlchemy 需要数据库已存在才能创建引擎。
        """
        settings = get_settings()

        # 解析数据库连接信息
        # 从 mysql+aiomysql://user:pass@host:port/db 中提取信息
        parsed = urlparse(settings.effective_database_url)

        db_user = parsed.username
        db_password = parsed.password
        db_host = parsed.hostname
        db_port = parsed.port or 3306
        db_name = parsed.path.lstrip('/')

        # 使用连接池方式连接（更稳定）
        pool = await aiomysql.create_pool(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            db=None,  # 不指定数据库，连接到 MySQL 服务器
            autocommit=True,
            minsize=1,
            maxsize=1,
        )

        try:
            async with pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    # 检查数据库是否存在
                    await cursor.execute(
                        f"SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA "
                        f"WHERE SCHEMA_NAME = '{db_name}'"
                    )
                    result = await cursor.fetchone()

                    if result is None:
                        # 数据库不存在，创建它
                        await cursor.execute(
                            f"CREATE DATABASE `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                        )
                        logger.info(f"Database '{db_name}' created successfully")
                    else:
                        logger.debug(f"Database '{db_name}' already exists")
        finally:
            pool.close()
            await pool.wait_closed()

    async def initialize(self) -> None:
        """初始化数据库引擎（确保数据库存在）"""
        # 先确保数据库存在
        await self.ensure_database_exists()

        # 然后创建引擎
        settings = get_settings()
        self._engine = create_async_engine(
            settings.effective_database_url,
            echo=settings.log_level == "DEBUG",
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_recycle=settings.db_pool_recycle,
        )
        self._session_factory = async_sessionmaker(
            bind=self._engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

    async def create_tables(self) -> None:
        """创建所有数据库表"""
        if self._engine is None:
            raise RuntimeError("DatabaseManager not initialized. Call initialize() first.")

        async with self._engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def initialize_with_seed(
        self,
        create_tables: bool = False,
        seed_data: bool = False,
        force_seed: bool = False
    ) -> dict:
        """
        初始化数据库并可选地创建表和种子数据

        Args:
            create_tables: 是否创建数据库表
            seed_data: 是否初始化种子数据
            force_seed: 是否强制重新创建种子数据

        Returns:
            包含初始化结果的字典
        """
        result = {
            "tables_created": False,
            "seeded": False,
            "seed_stats": {}
        }

        if create_tables:
            await self.create_tables()
            result["tables_created"] = True

        if seed_data:
            from src.infrastructure.persistence.seed.seeder import seed_default_data
            stats = await seed_default_data(force=force_seed)
            result["seeded"] = True
            result["seed_stats"] = stats

        return result

    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        获取数据库会话（上下文管理器）

        用法:
            async with db_manager.get_session() as session:
                # 使用 session
        """
        if self._session_factory is None:
            raise RuntimeError("DatabaseManager not initialized. Call initialize() first.")

        async with self._session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def close(self) -> None:
        """关闭数据库连接"""
        if self._engine:
            await self._engine.dispose()


# 全局数据库管理器实例
db_manager = DatabaseManager()
