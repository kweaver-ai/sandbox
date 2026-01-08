"""
会话应用服务

编排会话相关的用例。
"""
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from sandbox_control_plane.src.domain.entities.session import Session
from sandbox_control_plane.src.domain.entities.execution import Execution
from sandbox_control_plane.src.domain.value_objects.resource_limit import ResourceLimit
from sandbox_control_plane.src.domain.value_objects.execution_status import SessionStatus, ExecutionStatus
from sandbox_control_plane.src.domain.repositories.session_repository import ISessionRepository
from sandbox_control_plane.src.domain.repositories.execution_repository import IExecutionRepository
from sandbox_control_plane.src.domain.repositories.template_repository import ITemplateRepository
from sandbox_control_plane.src.domain.services.scheduler import IScheduler, ScheduleRequest
from sandbox_control_plane.src.application.commands.create_session import CreateSessionCommand
from sandbox_control_plane.src.application.commands.execute_code import ExecuteCodeCommand
from sandbox_control_plane.src.application.queries.get_session import GetSessionQuery
from sandbox_control_plane.src.application.queries.get_execution import GetExecutionQuery
from sandbox_control_plane.src.application.dtos.session_dto import SessionDTO
from sandbox_control_plane.src.application.dtos.execution_dto import ExecutionDTO
from sandbox_control_plane.src.shared.errors.domain import NotFoundError, ValidationError


class SessionService:
    """
    会话应用服务

    编排会话创建、执行、终止等用例。
    """

    def __init__(
        self,
        session_repo: ISessionRepository,
        execution_repo: IExecutionRepository,
        template_repo: ITemplateRepository,
        scheduler: IScheduler
    ):
        self._session_repo = session_repo
        self._execution_repo = execution_repo
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
        6. 创建 Docker 容器
        7. 更新会话状态为 running
        """
        # 1. 验证模板
        template = await self._template_repo.find_by_id(command.template_id)
        if not template:
            raise NotFoundError(f"Template not found: {command.template_id}")

        # 2. 生成会话 ID
        session_id = self._generate_session_id()

        # 3. 调用调度器
        schedule_request = ScheduleRequest(
            template_id=command.template_id,
            resource_limit=command.resource_limit or ResourceLimit.default(),
            session_id=session_id
        )
        runtime_node = await self._scheduler.schedule(schedule_request)

        # 4. 创建会话实体
        # 从模板镜像推断运行时类型
        runtime_type = self._infer_runtime_type(template.image)

        resource_limit = command.resource_limit or ResourceLimit.default()
        workspace_path = f"s3://sandbox-bucket/sessions/{session_id}"

        session = Session(
            id=session_id,
            template_id=command.template_id,
            status=SessionStatus.CREATING,
            resource_limit=resource_limit,
            workspace_path=workspace_path,
            runtime_type=runtime_type,
            runtime_node=runtime_node.id,
            env_vars=command.env_vars or {},
            timeout=command.timeout
        )

        # 5. 保存到仓储
        await self._session_repo.save(session)

        # 6. 创建 Docker 容器（如果调度器支持）
        container_id = None
        try:
            if hasattr(self._scheduler, 'create_container_for_session'):
                container_id = await self._scheduler.create_container_for_session(
                    session_id=session_id,
                    template_id=command.template_id,
                    image=template.image,
                    resource_limit=resource_limit,
                    env_vars=session.env_vars,
                    workspace_path=workspace_path,
                )

                # 更新会话的容器 ID
                session.container_id = container_id
                session.status = SessionStatus.RUNNING
                await self._session_repo.save(session)
        except Exception as e:
            # 容器创建失败，标记会话为失败状态
            session.status = SessionStatus.FAILED
            await self._session_repo.save(session)
            raise ValidationError(f"Failed to create container: {e}")

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
        3. 销毁 Docker 容器（如果调度器支持）
        4. 更新会话状态
        """
        session = await self._session_repo.find_by_id(session_id)
        if not session:
            raise NotFoundError(f"Session not found: {session_id}")

        if session.is_terminated():
            return SessionDTO.from_entity(session)

        # 销毁 Docker 容器（如果调度器支持且容器存在）
        if session.container_id and hasattr(self._scheduler, 'destroy_container'):
            try:
                await self._scheduler.destroy_container(
                    container_id=session.container_id
                )
            except Exception as e:
                # 记录错误但不中断流程
                import logging
                logging.warning(f"Failed to destroy container {session.container_id}: {e}")

        # 更新会话状态
        session.mark_as_terminated()
        await self._session_repo.save(session)

        return SessionDTO.from_entity(session)

    async def execute_code(self, command: ExecuteCodeCommand) -> ExecutionDTO:
        """
        执行代码用例

        流程：
        1. 验证会话存在且运行中
        2. 生成执行 ID
        3. 创建执行实体
        4. 保存到仓储
        5. 提交到执行器
        """
        # 1. 验证会话
        session = await self._session_repo.find_by_id(command.session_id)
        if not session:
            raise NotFoundError(f"Session not found: {command.session_id}")

        if not session.is_active():
            raise ValidationError(f"Session is not active: {command.session_id}")

        # 2. 生成执行 ID
        execution_id = self._generate_execution_id()

        # 3. 创建执行实体
        from sandbox_control_plane.src.domain.value_objects.execution_status import ExecutionState

        execution = Execution(
            id=execution_id,
            session_id=command.session_id,
            code=command.code,
            language=command.language,
            timeout=command.timeout,
            event_data=command.event_data or {},
            state=ExecutionState(status=ExecutionStatus.PENDING)
        )

        # 4. 保存到仓储
        await self._execution_repo.save(execution)

        # 5. 提交到执行器
        # TODO: 实现执行器调用
        # executor_client = ExecutorClient(session.executor_url)
        # await executor_client.submit_execution(execution_id, code, language, timeout, event_data)

        return ExecutionDTO.from_entity(execution)

    async def get_execution(self, query: GetExecutionQuery) -> ExecutionDTO:
        """获取执行详情用例"""
        execution = await self._execution_repo.find_by_id(query.execution_id)
        if not execution:
            raise NotFoundError(f"Execution not found: {query.execution_id}")

        return ExecutionDTO.from_entity(execution)

    async def list_executions(
        self,
        session_id: str,
        status_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[ExecutionDTO]:
        """列出会话的所有执行用例"""
        executions = await self._execution_repo.find_by_session_id(
            session_id=session_id,
            status=status_filter,
            limit=limit,
            offset=offset
        )

        return [ExecutionDTO.from_entity(e) for e in executions]

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
                # 销毁容器（如果调度器支持且容器存在）
                if session.container_id and hasattr(self._scheduler, 'destroy_container'):
                    try:
                        await self._scheduler.destroy_container(
                            container_id=session.container_id
                        )
                    except Exception as e:
                        # 记录错误但不中断流程
                        import logging
                        logging.warning(f"Failed to destroy container {session.container_id}: {e}")

                session.mark_as_terminated()
                await self._session_repo.save(session)
                cleaned_count += 1

        return cleaned_count

    def _generate_session_id(self) -> str:
        """生成会话 ID"""
        timestamp = datetime.now().strftime("%Y%m%d")
        unique = uuid.uuid4().hex[:8]
        return f"sess_{timestamp}_{unique}"

    def _infer_runtime_type(self, image: str) -> str:
        """从镜像名称推断运行时类型"""
        image_lower = image.lower()
        if "python" in image_lower or "python3" in image_lower:
            return "python3.11"
        elif "node" in image_lower or "nodejs" in image_lower:
            return "nodejs20"
        elif "java" in image_lower:
            return "java17"
        elif "go" in image_lower or "golang" in image_lower:
            return "go1.21"
        else:
            # 默认使用 Python
            return "python3.11"

    def _generate_execution_id(self) -> str:
        """生成执行 ID"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        unique = uuid.uuid4().hex[:8]
        return f"exec_{timestamp}_{unique}"

