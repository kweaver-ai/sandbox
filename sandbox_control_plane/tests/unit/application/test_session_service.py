"""
会话应用服务单元测试

测试 SessionService 的用例编排逻辑。
"""
import pytest
from unittest.mock import Mock, AsyncMock

from src.application.services.session_service import SessionService
from src.application.commands.create_session import CreateSessionCommand
from src.domain.entities.session import Session
from src.domain.entities.template import Template
from src.domain.value_objects.resource_limit import ResourceLimit
from src.domain.value_objects.execution_status import SessionStatus
from src.domain.services.scheduler import RuntimeNode
from src.shared.errors.domain import NotFoundError
from src.domain.repositories.execution_repository import IExecutionRepository


class TestSessionService:
    """会话应用服务测试"""

    @pytest.fixture
    def session_repo(self):
        """模拟会话仓储"""
        repo = Mock()
        repo.save = AsyncMock()
        repo.find_by_id = AsyncMock()
        return repo

    @pytest.fixture
    def template_repo(self):
        """模拟模板仓储"""
        repo = Mock()
        repo.find_by_id = AsyncMock()
        return repo

    @pytest.fixture
    def scheduler(self):
        """模拟调度器"""
        scheduler = Mock()
        scheduler.schedule = AsyncMock()
        scheduler.create_container_for_session = AsyncMock(return_value="container-123")
        scheduler.destroy_container = AsyncMock()
        return scheduler

    @pytest.fixture
    def execution_repo(self):
        """模拟执行仓储"""
        repo = Mock()
        repo.save = AsyncMock()
        repo.find_by_id = AsyncMock()
        repo.find_by_session_id = AsyncMock(return_value=[])
        return repo

    @pytest.fixture
    def service(self, session_repo, template_repo, scheduler, execution_repo):
        """创建会话服务"""
        return SessionService(
            session_repo=session_repo,
            execution_repo=execution_repo,
            template_repo=template_repo,
            scheduler=scheduler
        )

    @pytest.mark.asyncio
    async def test_create_session_success(self, service, template_repo, scheduler, session_repo):
        """测试成功创建会话"""
        # 设置模拟返回值
        template = Template(
            id="python-datascience",
            name="Python Data Science",
            image="python:3.11-datascience",
            base_image="python:3.11-slim"
        )
        template_repo.find_by_id.return_value = template

        runtime_node = RuntimeNode(
            id="node-1",
            type="docker",
            url="http://node-1:2375",
            status="healthy",
            cpu_usage=0.5,
            mem_usage=0.6,
            session_count=5,
            max_sessions=100,
            cached_templates=["python-datascience"]
        )
        scheduler.schedule.return_value = runtime_node

        # 执行命令
        command = CreateSessionCommand(
            template_id="python-datascience",
            timeout=300,
            resource_limit=ResourceLimit.default()
        )

        result = await service.create_session(command)

        # 验证
        assert result.template_id == "python-datascience"
        assert result.status == SessionStatus.RUNNING.value
        assert session_repo.save.call_count == 2  # 一次创建，一次更新容器ID和状态

    @pytest.mark.asyncio
    async def test_create_session_template_not_found(self, service, template_repo):
        """测试模板不存在"""
        template_repo.find_by_id.return_value = None

        command = CreateSessionCommand(
            template_id="non-existent",
            timeout=300
        )

        with pytest.raises(NotFoundError, match="Template not found"):
            await service.create_session(command)

    @pytest.mark.asyncio
    async def test_get_session_success(self, service, session_repo):
        """测试成功获取会话"""
        session = Session(
            id="sess_20240115_abc123",
            template_id="python-datascience",
            status=SessionStatus.RUNNING,
            resource_limit=ResourceLimit.default(),
            workspace_path="s3://sandbox-workspace/sessions/sess_20240115_abc123",
            runtime_type="docker"
        )
        session_repo.find_by_id.return_value = session

        from src.application.queries.get_session import GetSessionQuery
        query = GetSessionQuery(session_id="sess_20240115_abc123")

        result = await service.get_session(query)

        assert result.id == "sess_20240115_abc123"
        assert result.template_id == "python-datascience"

    @pytest.mark.asyncio
    async def test_get_session_not_found(self, service, session_repo):
        """测试会话不存在"""
        session_repo.find_by_id.return_value = None

        from src.application.queries.get_session import GetSessionQuery
        query = GetSessionQuery(session_id="non-existent")

        with pytest.raises(NotFoundError, match="Session not found"):
            await service.get_session(query)

    @pytest.mark.asyncio
    async def test_terminate_session_success(self, service, session_repo):
        """测试成功终止会话"""
        session = Session(
            id="sess_20240115_abc123",
            template_id="python-datascience",
            status=SessionStatus.RUNNING,
            resource_limit=ResourceLimit.default(),
            workspace_path="s3://sandbox-workspace/sessions/sess_20240115_abc123",
            runtime_type="docker"
        )
        session_repo.find_by_id.return_value = session

        result = await service.terminate_session("sess_20240115_abc123")

        assert result.status == SessionStatus.TERMINATED.value
        session_repo.save.assert_called_once()

    @pytest.mark.asyncio
    async def test_terminate_already_terminated(self, service, session_repo):
        """测试终止已终止的会话"""
        session = Session(
            id="sess_20240115_abc123",
            template_id="python-datascience",
            status=SessionStatus.TERMINATED,
            resource_limit=ResourceLimit.default(),
            workspace_path="s3://sandbox-workspace/sessions/sess_20240115_abc123",
            runtime_type="docker"
        )
        session_repo.find_by_id.return_value = session

        result = await service.terminate_session("sess_20240115_abc123")

        assert result.status == SessionStatus.TERMINATED.value
        # 不应该再次调用 save
        session_repo.save.assert_not_called()
