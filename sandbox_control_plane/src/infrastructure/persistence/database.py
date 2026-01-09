"""
数据库连接管理

配置和管理 SQLAlchemy 异步引擎和会话。
"""
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession, AsyncEngine
from sqlalchemy.orm import DeclarativeBase

from sandbox_control_plane.src.infrastructure.config.settings import get_settings


class Base(DeclarativeBase):
    """SQLAlchemy 基类"""
    pass


class DatabaseManager:
    """
    数据库管理器

    负责创建和管理数据库连接。
    """

    def __init__(self):
        self._engine: AsyncEngine | None = None
        self._session_factory: async_sessionmaker[AsyncSession] | None = None

    def initialize(self) -> None:
        """初始化数据库引擎"""
        settings = get_settings()
        self._engine = create_async_engine(
            settings.database_url,
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
