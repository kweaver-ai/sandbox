"""
容器仓储实现

使用 SQLAlchemy 实现容器仓储接口。
"""
from typing import List, Optional
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.repositories.container_repository import IContainerRepository
from src.domain.entities.container import Container
from src.infrastructure.persistence.models.container_model import ContainerModel


class SqlContainerRepository(IContainerRepository):
    """
    容器仓储实现

    这是基础设施层的 Adapter，实现领域层定义的 Port。
    """

    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, container: Container) -> None:
        """保存容器"""
        model = await self._session.get(ContainerModel, container.id)

        if model:
            # 更新现有记录
            model.session_id = container.session_id
            model.runtime_type = container.runtime_type
            model.node_id = container.node_id
            model.container_name = container.name
            model.image_url = container.image_url
            model.status = container.status.value
            model.ip_address = container.ip_address
            model.executor_port = container.executor_port
            model.cpu_cores = float(container.resource_limit.cpu)
            model.memory_mb = int(container.resource_limit.memory)
            model.disk_mb = int(container.resource_limit.disk)
        else:
            # 创建新记录
            model = ContainerModel.from_entity(container)
            self._session.add(model)

        await self._session.flush()

    async def find_by_id(self, container_id: str) -> Container | None:
        """根据 ID 查找容器"""
        model = await self._session.get(ContainerModel, container_id)
        return model.to_entity() if model else None

    async def find_by_session_id(self, session_id: str) -> Container | None:
        """根据会话 ID 查找容器"""
        stmt = select(ContainerModel).where(ContainerModel.session_id == session_id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def find_all(
        self,
        status: str | None = None,
        runtime_type: str | None = None,
        offset: int = 0,
        limit: int = 100
    ) -> List[Container]:
        """查找所有容器"""
        stmt = select(ContainerModel).offset(offset).limit(limit)

        if status:
            stmt = stmt.where(ContainerModel.status == status)
        if runtime_type:
            stmt = stmt.where(ContainerModel.runtime_type == runtime_type)

        result = await self._session.execute(stmt)
        return [model.to_entity() for model in result.scalars().all()]

    async def delete(self, container_id: str) -> None:
        """删除容器"""
        stmt = delete(ContainerModel).where(ContainerModel.id == container_id)
        await self._session.execute(stmt)
        await self._session.flush()

    async def exists(self, container_id: str) -> bool:
        """检查容器是否存在"""
        model = await self._session.get(ContainerModel, container_id)
        return model is not None

    async def count(self) -> int:
        """统计容器数量"""
        stmt = select(func.count()).select_from(ContainerModel)
        result = await self._session.execute(stmt)
        return result.scalar() or 0

    async def count_by_status(self, status: str) -> int:
        """统计指定状态的容器数量"""
        stmt = (
            select(func.count())
            .select_from(ContainerModel)
            .where(ContainerModel.status == status)
        )
        result = await self._session.execute(stmt)
        return result.scalar() or 0
