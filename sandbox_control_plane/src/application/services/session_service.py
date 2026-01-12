"""
会话应用服务

编排会话相关的用例。
"""
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import logging

from src.domain.entities.session import Session
from src.domain.entities.execution import Execution
from src.domain.value_objects.resource_limit import ResourceLimit
from src.domain.value_objects.execution_status import SessionStatus, ExecutionStatus
from src.domain.value_objects.execution_request import ExecutionRequest
from src.domain.repositories.session_repository import ISessionRepository
from src.domain.repositories.execution_repository import IExecutionRepository
from src.domain.repositories.template_repository import ITemplateRepository
from src.domain.services.scheduler import IScheduler, ScheduleRequest
from src.domain.services.storage import IStorageService
from src.application.commands.create_session import CreateSessionCommand
from src.infrastructure.config.settings import get_settings
from src.application.commands.execute_code import ExecuteCodeCommand
from src.application.queries.get_session import GetSessionQuery
from src.application.queries.get_execution import GetExecutionQuery
from src.application.dtos.session_dto import SessionDTO
from src.application.dtos.execution_dto import ExecutionDTO
from src.shared.errors.domain import NotFoundError, ValidationError

logger = logging.getLogger(__name__)


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
        scheduler: IScheduler,
        storage_service: Optional[IStorageService] = None
    ):
        self._session_repo = session_repo
        self._execution_repo = execution_repo
        self._template_repo = template_repo
        self._scheduler = scheduler
        self._storage_service = storage_service

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
        settings = get_settings()
        workspace_path = f"s3://{settings.s3_bucket}/sessions/{session_id}"

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
                    node_id=runtime_node.id,  # 传入调度选择的节点 ID
                )

                # 更新会话状态为 RUNNING
                session.container_id = container_id
                session.status = SessionStatus.RUNNING
                await self._session_repo.save(session)

                import logging
                logging.info(
                    f"Session {session_id} created successfully, "
                    f"container={container_id}, node={runtime_node.id}"
                )
        except Exception as e:
            # 容器创建失败，销毁部分创建的容器（如有），标记会话为失败状态
            if container_id and hasattr(self._scheduler, 'destroy_container'):
                try:
                    await self._scheduler.destroy_container(container_id)
                except Exception:
                    pass  # 忽略清理错误

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
        4. 清理 S3 文件（如果配置了存储服务）
        5. 更新会话状态
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
                logger.warning(f"Failed to destroy container {session.container_id}: {e}")

        # 清理 S3 文件（如果配置了存储服务）
        if self._storage_service:
            try:
                # workspace_path 格式: s3://bucket/sessions/{session_id}/
                # 提取前缀用于批量删除
                if session.workspace_path.startswith("s3://"):
                    # 使用完整的 workspace_path 作为前缀
                    deleted_count = await self._storage_service.delete_prefix(session.workspace_path)
                    logger.info(
                        f"Deleted {deleted_count} files for session {session_id} "
                        f"(workspace: {session.workspace_path})"
                    )
            except Exception as e:
                # 记录错误但不中断流程
                logger.warning(f"Failed to cleanup files for session {session_id}: {e}")

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
        from src.domain.value_objects.execution_status import ExecutionState

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

        # 4.5. 提交事务，确保执行记录在执行器回调之前可见
        await self._execution_repo.commit()

        # 5. 提交到执行器
        if not session.container_id:
            raise ValidationError(f"Session has no container: {command.session_id}")

        # 构建执行请求
        execution_request = ExecutionRequest(
            code=command.code,
            language=command.language,
            event=command.event_data or {},
            timeout=command.timeout or 300,
            env_vars=session.env_vars,
            execution_id=execution_id,
            session_id=session.id,
        )

        # 通过调度器提交到执行器
        await self._scheduler.execute(
            session_id=session.id,
            container_id=session.container_id,
            execution_request=execution_request,
        )

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

