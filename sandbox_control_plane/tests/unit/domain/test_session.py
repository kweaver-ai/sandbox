"""
会话实体单元测试

测试 Session 实体的领域行为。
"""
import pytest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from src.domain.entities.session import Session
from src.domain.value_objects.resource_limit import ResourceLimit
from src.domain.value_objects.execution_status import SessionStatus


class TestSession:
    """会话实体测试"""

    def test_create_session(self):
        """测试创建会话"""
        session = Session(
            id="sess_20240115_abc123",
            template_id="python-datascience",
            status=SessionStatus.CREATING,
            resource_limit=ResourceLimit.default(),
            workspace_path="s3://sandbox-bucket/sessions/sess_20240115_abc123",
            runtime_type="docker",
        )

        assert session.id == "sess_20240115_abc123"
        assert session.template_id == "python-datascience"
        assert session.status == SessionStatus.CREATING
        assert session.is_active() is True

    def test_mark_as_running(self):
        """测试标记会话为运行中"""
        session = Session(
            id="sess_20240115_abc123",
            template_id="python-datascience",
            status=SessionStatus.CREATING,
            resource_limit=ResourceLimit.default(),
            workspace_path="s3://sandbox-bucket/sessions/sess_20240115_abc123",
            runtime_type="docker",
        )

        session.mark_as_running(
            runtime_node="node-1",
            container_id="container-123"
        )

        assert session.status == SessionStatus.RUNNING
        assert session.runtime_node == "node-1"
        assert session.container_id == "container-123"

    def test_mark_as_running_invalid_transition(self):
        """测试无效状态转换"""
        session = Session(
            id="sess_20240115_abc123",
            template_id="python-datascience",
            status=SessionStatus.RUNNING,
            resource_limit=ResourceLimit.default(),
            workspace_path="s3://sandbox-bucket/sessions/sess_20240115_abc123",
            runtime_type="docker",
        )

        with pytest.raises(ValueError, match="Cannot mark session as running"):
            session.mark_as_running("node-1", "container-123")

    def test_mark_as_terminated(self):
        """测试终止会话"""
        session = Session(
            id="sess_20240115_abc123",
            template_id="python-datascience",
            status=SessionStatus.RUNNING,
            resource_limit=ResourceLimit.default(),
            workspace_path="s3://sandbox-bucket/sessions/sess_20240115_abc123",
            runtime_type="docker",
        )

        session.mark_as_terminated()

        assert session.is_terminated() is True
        assert session.is_active() is False

    def test_is_idle(self):
        """测试空闲检查"""
        # 创建一个超过 30 分钟未活动的会话
        old_time = datetime.now() - timedelta(minutes=35)

        session = Session(
            id="sess_20240115_abc123",
            template_id="python-datascience",
            status=SessionStatus.RUNNING,
            resource_limit=ResourceLimit.default(),
            workspace_path="s3://sandbox-bucket/sessions/sess_20240115_abc123",
            runtime_type="docker",
            last_activity_at=old_time,
        )

        assert session.is_idle(threshold_minutes=30) is True

    def test_should_cleanup(self):
        """测试是否应该清理"""
        # 空闲会话
        old_time = datetime.now() - timedelta(minutes=35)

        session = Session(
            id="sess_20240115_abc123",
            template_id="python-datascience",
            status=SessionStatus.RUNNING,
            resource_limit=ResourceLimit.default(),
            workspace_path="s3://sandbox-bucket/sessions/sess_20240115_abc123",
            runtime_type="docker",
            last_activity_at=old_time,
        )

        assert session.should_cleanup() is True

    def test_add_execution(self):
        """测试添加执行记录"""
        from src.domain.entities.execution import Execution
        from src.domain.value_objects.execution_status import ExecutionStatus, ExecutionState

        session = Session(
            id="sess_20240115_abc123",
            template_id="python-datascience",
            status=SessionStatus.RUNNING,
            resource_limit=ResourceLimit.default(),
            workspace_path="s3://sandbox-bucket/sessions/sess_20240115_abc123",
            runtime_type="docker",
        )

        execution = Execution(
            id="exec_20240115_xyz789",
            session_id=session.id,
            code="print('hello')",
            language="python",
            state=ExecutionState(status=ExecutionStatus.PENDING),
        )

        session.add_execution(execution)

        assert len(session.get_executions()) == 1
        assert session.get_executions()[0].id == "exec_20240115_xyz789"

    def test_add_execution_wrong_session(self):
        """测试添加错误会话的执行记录"""
        from src.domain.entities.execution import Execution
        from src.domain.value_objects.execution_status import ExecutionStatus, ExecutionState

        session = Session(
            id="sess_20240115_abc123",
            template_id="python-datascience",
            status=SessionStatus.RUNNING,
            resource_limit=ResourceLimit.default(),
            workspace_path="s3://sandbox-bucket/sessions/sess_20240115_abc123",
            runtime_type="docker",
        )

        execution = Execution(
            id="exec_20240115_xyz789",
            session_id="different_session_id",  # 错误的会话 ID
            code="print('hello')",
            language="python",
            state=ExecutionState(status=ExecutionStatus.PENDING),
        )

        with pytest.raises(ValueError, match="does not belong to this session"):
            session.add_execution(execution)

    def test_invalid_timeout(self):
        """测试无效的超时值"""
        with pytest.raises(ValueError, match="timeout must be positive"):
            Session(
                id="sess_20240115_abc123",
                template_id="python-datascience",
                status=SessionStatus.CREATING,
                resource_limit=ResourceLimit.default(),
                workspace_path="s3://sandbox-bucket/sessions/sess_20240115_abc123",
                runtime_type="docker",
                timeout=-1,  # 无效值
            )

    def test_invalid_workspace_path(self):
        """测试无效的 workspace 路径"""
        with pytest.raises(ValueError, match="workspace_path cannot be empty"):
            Session(
                id="sess_20240115_abc123",
                template_id="python-datascience",
                status=SessionStatus.CREATING,
                resource_limit=ResourceLimit.default(),
                workspace_path="",  # 无效值
                runtime_type="docker",
            )
