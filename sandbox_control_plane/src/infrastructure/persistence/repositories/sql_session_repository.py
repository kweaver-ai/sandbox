"""
会话仓储实现

使用 SQLAlchemy 实现会话仓储接口。
"""
from typing import List, Optional
from datetime import datetime
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.repositories.session_repository import ISessionRepository
from src.domain.entities.session import Session
from src.infrastructure.persistence.models.session_model import SessionModel


class SqlSessionRepository(ISessionRepository):
    """
    会话仓储实现

    这是基础设施层的 Adapter，实现领域层定义的 Port。
    """

    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, session: Session) -> None:
        """保存会话"""
        model = await self._session.get(SessionModel, session.id)

        if model:
            # 更新现有记录
            model.template_id = session.template_id
            model.status = session.status.value
            model.runtime_type = session.runtime_type
            model.runtime_node = session.runtime_node
            model.container_id = session.container_id
            model.pod_name = session.pod_name
            model.workspace_path = session.workspace_path
            model.resources_cpu = session.resource_limit.cpu
            model.resources_memory = session.resource_limit.memory
            model.resources_disk = session.resource_limit.disk
            model.resources_max_processes = session.resource_limit.max_processes
            model.env_vars = session.env_vars
            model.timeout = session.timeout
            model.last_activity_at = session.last_activity_at
            model.updated_at = session.updated_at
            model.completed_at = session.completed_at
        else:
            # 创建新记录
            model = SessionModel.from_entity(session)
            self._session.add(model)

        await self._session.flush()

    async def find_by_id(self, session_id: str) -> Optional[Session]:
        """根据 ID 查找会话"""
        model = await self._session.get(SessionModel, session_id)
        return model.to_entity() if model else None

    async def find_by_container_id(self, container_id: str) -> Optional[Session]:
        """根据容器 ID 查找会话"""
        stmt = select(SessionModel).where(SessionModel.container_id == container_id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def find_by_status(self, status: str, limit: int = 100) -> List[Session]:
        """根据状态查找会话"""
        stmt = (
            select(SessionModel)
            .where(SessionModel.status == status)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return [model.to_entity() for model in result.scalars().all()]

    async def find_by_template(self, template_id: str) -> List[Session]:
        """根据模板 ID 查找会话"""
        stmt = select(SessionModel).where(SessionModel.template_id == template_id)
        result = await self._session.execute(stmt)
        return [model.to_entity() for model in result.scalars().all()]

    async def find_idle_sessions(self, idle_threshold: datetime) -> List[Session]:
        """查找空闲会话"""
        stmt = (
            select(SessionModel)
            .where(
                SessionModel.status.in_(["creating", "running"]),
                SessionModel.last_activity_at < idle_threshold
            )
        )
        result = await self._session.execute(stmt)
        return [model.to_entity() for model in result.scalars().all()]

    async def find_expired_sessions(self, created_before: datetime) -> List[Session]:
        """查找过期会话"""
        stmt = (
            select(SessionModel)
            .where(SessionModel.created_at < created_before)
            .where(SessionModel.status.in_(["creating", "running"]))
        )
        result = await self._session.execute(stmt)
        return [model.to_entity() for model in result.scalars().all()]

    async def delete(self, session_id: str) -> None:
        """删除会话"""
        stmt = delete(SessionModel).where(SessionModel.id == session_id)
        await self._session.execute(stmt)
        await self._session.flush()

    async def exists(self, session_id: str) -> bool:
        """检查会话是否存在"""
        model = await self._session.get(SessionModel, session_id)
        return model is not None

    async def count_by_status(self, status: str) -> int:
        """统计指定状态的会话数量"""
        stmt = (
            select(func.count())
            .select_from(SessionModel)
            .where(SessionModel.status == status)
        )
        result = await self._session.execute(stmt)
        return result.scalar() or 0

    async def count_by_node(self, runtime_node: str) -> int:
        """统计指定节点的会话数量"""
        stmt = (
            select(func.count())
            .select_from(SessionModel)
            .where(SessionModel.runtime_node == runtime_node)
            .where(SessionModel.status.in_(["creating", "running"]))
        )
        result = await self._session.execute(stmt)
        return result.scalar() or 0

    async def find_sessions(
        self,
        status: Optional[str] = None,
        template_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Session]:
        """
        查找会话列表（支持筛选和分页）

        Args:
            status: 会话状态筛选（可选）
            template_id: 模板 ID 筛选（可选）
            limit: 返回数量限制（1-200，默认 50）
            offset: 偏移量（用于分页）

        Returns:
            会话列表
        """
        # 验证 limit 范围
        limit = max(1, min(limit, 200))
        offset = max(0, offset)

        # 构建查询
        stmt = select(SessionModel)

        # 添加筛选条件
        if status:
            stmt = stmt.where(SessionModel.status == status)
        if template_id:
            stmt = stmt.where(SessionModel.template_id == template_id)

        # 排序和分页
        stmt = (
            stmt
            .order_by(SessionModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )

        result = await self._session.execute(stmt)
        return [model.to_entity() for model in result.scalars().all()]

    async def count_sessions(
        self,
        status: Optional[str] = None,
        template_id: Optional[str] = None
    ) -> int:
        """
        统计会话数量（支持筛选）

        Args:
            status: 会话状态筛选（可选）
            template_id: 模板 ID 筛选（可选）

        Returns:
            会话总数
        """
        stmt = select(func.count()).select_from(SessionModel)

        # 添加筛选条件
        if status:
            stmt = stmt.where(SessionModel.status == status)
        if template_id:
            stmt = stmt.where(SessionModel.template_id == template_id)

        result = await self._session.execute(stmt)
        return result.scalar() or 0
