"""
运行时节点仓储实现

使用 SQLAlchemy 实现运行时节点仓储接口。
"""
from typing import List, Optional
from decimal import Decimal
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.repositories.runtime_node_repository import IRuntimeNodeRepository
from src.infrastructure.persistence.models.runtime_node_model import RuntimeNodeModel


class SqlRuntimeNodeRepository(IRuntimeNodeRepository):
    """
    运行时节点仓储实现

    这是基础设施层的 Adapter，实现领域层定义的 Port。
    """

    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, node) -> None:
        """保存节点（创建或更新）"""
        model = await self._session.get(RuntimeNodeModel, node.node_id)

        if model:
            # 更新现有记录
            model.hostname = node.hostname
            model.runtime_type = node.type
            model.ip_address = node.ip_address
            model.api_endpoint = node.url
            model.status = "online"
            model.total_cpu_cores = Decimal(str(node.total_cpu_cores))
            model.total_memory_mb = node.total_memory_mb
            model.max_containers = node.max_sessions
            model.cached_images = node.cached_templates
        else:
            # 创建新记录
            model = RuntimeNodeModel(
                node_id=node.node_id,
                hostname=node.hostname,
                runtime_type=node.type,
                ip_address=node.ip_address,
                api_endpoint=node.url,
                status="online",
                total_cpu_cores=Decimal(str(node.total_cpu_cores)),
                total_memory_mb=node.total_memory_mb,
                max_containers=node.max_sessions,
                cached_images=node.cached_templates,
                running_containers=0,
                allocated_cpu_cores=Decimal("0"),
                allocated_memory_mb=0,
            )
            self._session.add(model)

        await self._session.flush()

    async def find_by_id(self, node_id: str) -> Optional:
        """根据 ID 查找节点"""
        model = await self._session.get(RuntimeNodeModel, node_id)
        return model if model else None

    async def find_by_hostname(self, hostname: str) -> Optional:
        """根据主机名查找节点"""
        stmt = select(RuntimeNodeModel).where(RuntimeNodeModel.hostname == hostname)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_by_status(self, status: str) -> List:
        """根据状态查找节点"""
        stmt = select(RuntimeNodeModel).where(RuntimeNodeModel.status == status)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find_all(
        self,
        offset: int = 0,
        limit: int = 100
    ) -> List:
        """查找所有节点"""
        stmt = (
            select(RuntimeNodeModel)
            .offset(offset)
            .limit(limit)
            .order_by(RuntimeNodeModel.hostname)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def update_status(
        self,
        node_id: str,
        status: str
    ) -> None:
        """更新节点状态"""
        stmt = (
            update(RuntimeNodeModel)
            .where(RuntimeNodeModel.node_id == node_id)
            .values(status=status)
        )
        await self._session.execute(stmt)
        await self._session.flush()

    async def update_heartbeat(self, node_id: str) -> None:
        """更新节点心跳时间"""
        stmt = (
            update(RuntimeNodeModel)
            .where(RuntimeNodeModel.node_id == node_id)
            .values(last_heartbeat_at=func.now())
        )
        await self._session.execute(stmt)
        await self._session.flush()

    async def allocate_resources(
        self,
        node_id: str,
        cpu_cores: float,
        memory_mb: int
    ) -> None:
        """分配资源"""
        stmt = (
            update(RuntimeNodeModel)
            .where(RuntimeNodeModel.node_id == node_id)
            .values(
                allocated_cpu_cores=RuntimeNodeModel.allocated_cpu_cores + Decimal(str(cpu_cores)),
                allocated_memory_mb=RuntimeNodeModel.allocated_memory_mb + memory_mb,
            )
        )
        await self._session.execute(stmt)
        await self._session.flush()

    async def release_resources(
        self,
        node_id: str,
        cpu_cores: float,
        memory_mb: int
    ) -> None:
        """释放资源"""
        stmt = (
            update(RuntimeNodeModel)
            .where(RuntimeNodeModel.node_id == node_id)
            .values(
                allocated_cpu_cores=RuntimeNodeModel.allocated_cpu_cores - Decimal(str(cpu_cores)),
                allocated_memory_mb=RuntimeNodeModel.allocated_memory_mb - memory_mb,
            )
        )
        await self._session.execute(stmt)
        await self._session.flush()

    async def increment_container_count(self, node_id: str) -> None:
        """增加容器计数"""
        stmt = (
            update(RuntimeNodeModel)
            .where(RuntimeNodeModel.node_id == node_id)
            .values(running_containers=RuntimeNodeModel.running_containers + 1)
        )
        await self._session.execute(stmt)
        await self._session.flush()

    async def decrement_container_count(self, node_id: str) -> None:
        """减少容器计数"""
        stmt = (
            update(RuntimeNodeModel)
            .where(RuntimeNodeModel.node_id == node_id)
            .values(
                running_containers=RuntimeNodeModel.running_containers - 1
            )
        )
        await self._session.execute(stmt)
        await self._session.flush()
