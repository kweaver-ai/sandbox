"""
数据库种子数据初始化

提供统一的种子数据初始化逻辑，可以在应用启动或独立脚本中调用。
"""
from sqlalchemy import select
from structlog import get_logger

from src.infrastructure.persistence.database import db_manager
from src.infrastructure.persistence.models.runtime_node_model import RuntimeNodeModel
from src.infrastructure.persistence.models.template_model import TemplateModel
from src.infrastructure.persistence.seed.default_data import (
    get_default_runtime_nodes,
    get_default_templates,
)

logger = get_logger(__name__)


async def seed_runtime_nodes(force: bool = False) -> int:
    """
    初始化默认运行时节点

    Args:
        force: 如果为 True，即使节点已存在也会重新创建

    Returns:
        创建的节点数量
    """
    async with db_manager.get_session() as session:
        # 检查是否已存在节点
        result = await session.execute(select(RuntimeNodeModel))
        existing_nodes = result.scalars().all()

        if existing_nodes and not force:
            logger.info(
                "Runtime nodes already exist, skipping initialization",
                count=len(existing_nodes)
            )
            return 0

        # 如果 force=True，删除现有节点
        if existing_nodes and force:
            for node in existing_nodes:
                await session.delete(node)
            await session.flush()
            logger.info("Deleted existing runtime nodes", count=len(existing_nodes))

        # 创建默认节点
        default_nodes = get_default_runtime_nodes()
        for node in default_nodes:
            session.add(node)

        await session.flush()
        logger.info("Created default runtime nodes", count=len(default_nodes))
        return len(default_nodes)


async def seed_templates(force: bool = False) -> int:
    """
    初始化默认模板

    Args:
        force: 如果为 True，即使模板已存在也会重新创建

    Returns:
        创建的模板数量
    """
    async with db_manager.get_session() as session:
        # 检查是否已存在模板
        result = await session.execute(select(TemplateModel))
        existing_templates = result.scalars().all()

        if existing_templates and not force:
            logger.info(
                "Templates already exist, skipping initialization",
                count=len(existing_templates)
            )
            return 0

        # 如果 force=True，删除现有模板
        if existing_templates and force:
            for template in existing_templates:
                await session.delete(template)
            await session.flush()
            logger.info("Deleted existing templates", count=len(existing_templates))

        # 创建默认模板
        default_templates = get_default_templates()
        for template in default_templates:
            session.add(template)

        await session.flush()
        logger.info("Created default templates", count=len(default_templates))
        return len(default_templates)


async def seed_default_data(force: bool = False) -> dict:
    """
    初始化所有默认数据

    Args:
        force: 如果为 True，即使数据已存在也会重新创建

    Returns:
        包含创建项数量的字典
    """
    logger.info("Starting default data seeding", force=force)

    node_count = await seed_runtime_nodes(force=force)
    template_count = await seed_templates(force=force)

    result = {
        "runtime_nodes": node_count,
        "templates": template_count,
        "total": node_count + template_count
    }

    logger.info("Completed default data seeding", **result)
    return result
