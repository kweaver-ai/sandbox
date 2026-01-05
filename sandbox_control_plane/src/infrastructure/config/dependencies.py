"""
依赖注入配置

配置应用层的依赖注入，使用 dependency_injector 或类似模式。
"""
from functools import lru_cache
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from redis.asyncio import Redis

from src.infrastructure.config.settings import get_settings, Settings
from src.infrastructure.persistence.repositories.sql_session_repository import SqlSessionRepository
from src.infrastructure.persistence.repositories.sql_execution_repository import SqlExecutionRepository
from src.domain.repositories.session_repository import ISessionRepository
from src.domain.repositories.execution_repository import IExecutionRepository
from src.application.services.session_service import SessionService
from src.application.services.execution_service import ExecutionService


# ============== 数据库 ==============

@lru_cache()
def _get_engine():
    """获取数据库引擎（单例）"""
    settings = get_settings()
    return create_async_engine(
        settings.database_url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_recycle=settings.db_pool_recycle,
        pool_pre_ping=True,
        echo=settings.debug,
    )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    获取数据库会话

    用于 FastAPI 依赖注入。
    """
    engine = _get_engine()
    async_session_maker = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


# ============== Redis ==============

@lru_cache()
def _get_redis_client():
    """获取 Redis 客户端（单例）"""
    settings = get_settings()
    return Redis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
    )


async def get_redis() -> AsyncGenerator[Redis, None]:
    """
    获取 Redis 客户端

    用于 FastAPI 依赖注入。
    """
    redis = _get_redis_client()
    try:
        yield redis
    finally:
        await redis.close()


# ============== 仓储 ==============

async def get_session_repository(
    db: AsyncSession = Depends(get_db),
) -> ISessionRepository:
    """
    获取会话仓储

    用于 FastAPI 依赖注入。
    """
    return SqlSessionRepository(db)


async def get_execution_repository(
    db: AsyncSession = Depends(get_db),
) -> IExecutionRepository:
    """
    获取执行仓储

    用于 FastAPI 依赖注入。
    """
    return SqlExecutionRepository(db)


# ============== 应用服务 ==============

async def get_session_service(
    session_repo: ISessionRepository = Depends(get_session_repository),
    template_repo: ITemplateRepository = Depends(get_template_repository),
    scheduler: IScheduler = Depends(get_scheduler),
) -> SessionService:
    """
    获取会话应用服务

    用于 FastAPI 依赖注入。
    """
    return SessionService(
        session_repo=session_repo,
        template_repo=template_repo,
        scheduler=scheduler,
    )


async def get_execution_service(
    execution_repo: IExecutionRepository = Depends(get_execution_repository),
    session_repo: ISessionRepository = Depends(get_session_repository),
) -> ExecutionService:
    """
    获取执行应用服务

    用于 FastAPI 依赖注入。
    """
    return ExecutionService(
        execution_repo=execution_repo,
        session_repo=session_repo,
    )


# TODO: 添加其他依赖注入
# - get_template_repository
# - get_scheduler
# - get_runtime_client
# - get_storage_client
