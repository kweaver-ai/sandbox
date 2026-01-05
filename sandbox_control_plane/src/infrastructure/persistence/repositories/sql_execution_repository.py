"""
执行仓储实现

使用 SQLAlchemy 实现执行仓储接口。
"""
from typing import List, Optional
from datetime import datetime
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.repositories.execution_repository import IExecutionRepository
from src.domain.entities.execution import Execution
from src.infrastructure.persistence.models.execution_model import ExecutionModel


class SqlExecutionRepository(IExecutionRepository):
    """
    执行仓储实现

    这是基础设施层的 Adapter，实现领域层定义的 Port。
    """

    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, execution: Execution) -> None:
        """保存执行记录"""
        model = await self._session.get(ExecutionModel, execution.id)

        if model:
            # 更新现有记录
            model.session_id = execution.session_id
            model.code = execution.code
            model.language = execution.language
            model.status = execution.state.status.value
            model.stdout = execution.stdout
            model.stderr = execution.stderr
            model.exit_code = execution.state.exit_code
            model.execution_time = execution.execution_time
            model.artifacts = [
                {
                    "path": a.path,
                    "size": a.size,
                    "mime_type": a.mime_type,
                    "type": a.type.value,
                    "created_at": a.created_at.isoformat(),
                    "checksum": a.checksum,
                }
                for a in execution.artifacts
            ]
            model.retry_count = execution.retry_count
            model.last_heartbeat_at = execution.last_heartbeat_at
            model.completed_at = execution.completed_at
        else:
            # 创建新记录
            model = ExecutionModel.from_entity(execution)
            self._session.add(model)

        await self._session.flush()

    async def find_by_id(self, execution_id: str) -> Optional[Execution]:
        """根据 ID 查找执行记录"""
        model = await self._session.get(ExecutionModel, execution_id)
        return model.to_entity() if model else None

    async def find_by_session_id(
        self,
        session_id: str,
        limit: int = 100
    ) -> List[Execution]:
        """根据会话 ID 查找执行记录"""
        stmt = (
            select(ExecutionModel)
            .where(ExecutionModel.session_id == session_id)
            .order_by(ExecutionModel.created_at.desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return [model.to_entity() for model in result.scalars().all()]

    async def find_by_status(self, status: str, limit: int = 100) -> List[Execution]:
        """根据状态查找执行记录"""
        stmt = (
            select(ExecutionModel)
            .where(ExecutionModel.status == status)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return [model.to_entity() for model in result.scalars().all()]

    async def find_crashed_executions(self, max_retry_count: int) -> List[Execution]:
        """查找可重试的崩溃执行"""
        stmt = (
            select(ExecutionModel)
            .where(ExecutionModel.status == "crashed")
            .where(ExecutionModel.retry_count < max_retry_count)
        )
        result = await self._session.execute(stmt)
        return [model.to_entity() for model in result.scalars().all()]

    async def find_heartbeat_timeouts(
        self,
        timeout_threshold: datetime
    ) -> List[Execution]:
        """查找心跳超时的执行"""
        stmt = (
            select(ExecutionModel)
            .where(ExecutionModel.status == "running")
            .where(ExecutionModel.last_heartbeat_at < timeout_threshold)
        )
        result = await self._session.execute(stmt)
        return [model.to_entity() for model in result.scalars().all()]

    async def delete(self, execution_id: str) -> None:
        """删除执行记录"""
        stmt = delete(ExecutionModel).where(ExecutionModel.id == execution_id)
        await self._session.execute(stmt)
        await self._session.flush()

    async def delete_by_session_id(self, session_id: str) -> None:
        """删除会话的所有执行记录"""
        stmt = delete(ExecutionModel).where(ExecutionModel.session_id == session_id)
        await self._session.execute(stmt)
        await self._session.flush()

    async def count_by_status(self, status: str) -> int:
        """统计指定状态的执行数量"""
        stmt = (
            select(func.count())
            .select_from(ExecutionModel)
            .where(ExecutionModel.status == status)
        )
        result = await self._session.execute(stmt)
        return result.scalar() or 0
