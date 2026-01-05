"""
会话应用服务

编排会话相关的用例。
"""
from typing import List
from datetime import datetime, timedelta
import uuid

from src.domain.entities.session import Session
from src.domain.value_objects.resource_limit import ResourceLimit
from src.domain.value_objects.execution_status import SessionStatus
from src.domain.repositories.session_repository import ISessionRepository
from src.domain.repositories.template_repository import ITemplateRepository
from src.domain.services.scheduler import IScheduler
from src.application.commands.create_session import CreateSessionCommand
from src.application.queries.get_session import GetSessionQuery
from src.application.dtos.session_dto import SessionDTO
from src.application.dtos.execution_dto import ExecutionDTO
from src.shared.errors.domain import NotFoundError, ValidationError


class SessionService:
    """
    会话应用服务

    编排会话创建、执行、终止等用例。
    """

    def __init__(
        self,
        session_repo: ISessionRepository,
        template_repo: ITemplateRepository,
        scheduler: IScheduler
    ):
        self._session_repo = session_repo
        self._template_repo = template_repo
        self._scheduler = scheduler

    async def create_session(self, command: CreateSessionCommand) -> SessionDTO:
        """
        创建会话用例

        流程：
        1. 验证模板存在
        2. 生成会话 ID
        3. 调用调度器选择运行时节点
        4. 创建会话实体
        5. 保存到仓储
        """
        # 1. 验证模板
        template = await self._template_repo.find_by_id(command.template_id)
        if not template:
            raise NotFoundError(f"Template not found: {command.template_id}")

        # 2. 生成会话 ID
        session_id = self._generate_session_id()

        # 3. 调用调度器
        runtime_node = await self._scheduler.schedule(
            template_id=command.template_id,
            resource_limit=command.resource_limit or ResourceLimit.default()
        )

        # 4. 创建会话实体
        session = Session(
            id=session_id,
            template_id=command.template_id,
            status=SessionStatus.CREATING,
            resource_limit=command.resource_limit or ResourceLimit.default(),
            workspace_path=f"s3://sandbox-bucket/sessions/{session_id}",
            runtime_type=runtime_node.type,
            env_vars=command.env_vars or {},
            timeout=command.timeout
        )

        # 5. 保存到仓储
        await self._session_repo.save(session)

        # 6. 异步创建容器（后台任务）
        # await runtime_node.create_container(session)

        return SessionDTO.from_entity(session)

    async def get_session(self, query: GetSessionQuery) -> SessionDTO:
        """获取会话用例"""
        session = await self._session_repo.find_by_id(query.session_id)
        if not session:
            raise NotFoundError(f"Session not found: {query.session_id}")

        return SessionDTO.from_entity(session)

    async def terminate_session(self, session_id: str) -> SessionDTO:
        """
        终止会话用例

        流程：
        1. 查找会话
        2. 验证状态
        3. 调用运行时销毁容器
        4. 更新会话状态
        """
        session = await self._session_repo.find_by_id(session_id)
        if not session:
            raise NotFoundError(f"Session not found: {session_id}")

        if session.is_terminated():
            return SessionDTO.from_entity(session)

        # 调用运行时销毁容器
        # runtime_node = await self._scheduler.get_node(session.runtime_node)
        # await runtime_node.destroy_container(session_id, session.container_id)

        # 更新会话状态
        session.mark_as_terminated()
        await self._session_repo.save(session)

        return SessionDTO.from_entity(session)

    async def cleanup_idle_sessions(
        self,
        idle_threshold_minutes: int = 30,
        max_lifetime_hours: int = 6
    ) -> int:
        """
        清理空闲会话用例

        定时任务调用，清理空闲或过期的会话。
        """
        idle_threshold = datetime.now() - timedelta(minutes=idle_threshold_minutes)
        max_lifetime = datetime.now() - timedelta(hours=max_lifetime_hours)

        idle_sessions = await self._session_repo.find_idle_sessions(idle_threshold)
        expired_sessions = await self._session_repo.find_expired_sessions(max_lifetime)

        all_to_cleanup = set(idle_sessions + expired_sessions)
        cleaned_count = 0

        for session in all_to_cleanup:
            if session.is_active():
                # 销毁容器
                # await self._destroy_container(session)
                session.mark_as_terminated()
                await self._session_repo.save(session)
                cleaned_count += 1

        return cleaned_count

    def _generate_session_id(self) -> str:
        """生成会话 ID"""
        timestamp = datetime.now().strftime("%Y%m%d")
        unique = uuid.uuid4().hex[:8]
        return f"sess_{timestamp}_{unique}"
