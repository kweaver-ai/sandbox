"""
Pytest 配置和共享 fixtures
"""
import pytest
from datetime import datetime

from src.domain.entities.session import Session
from src.domain.entities.execution import Execution
from src.domain.value_objects.resource_limit import ResourceLimit
from src.domain.value_objects.execution_status import SessionStatus, ExecutionStatus, ExecutionState
from src.domain.value_objects.artifact import Artifact


# ============== Session Fixtures ==============

@pytest.fixture
def session_id():
    """测试会话 ID"""
    return "sess_20240115_abc12345"


@pytest.fixture
def resource_limit():
    """测试资源限制"""
    return ResourceLimit(
        cpu="1",
        memory="512Mi",
        disk="1Gi",
        max_processes=128
    )


@pytest.fixture
def session(session_id, resource_limit):
    """测试会话实体"""
    return Session(
        id=session_id,
        template_id="python-datascience",
        status=SessionStatus.CREATING,
        resource_limit=resource_limit,
        workspace_path=f"s3://sandbox-bucket/sessions/{session_id}",
        runtime_type="docker"
    )


@pytest.fixture
def running_session(session_id, resource_limit):
    """测试运行中会话实体"""
    return Session(
        id=session_id,
        template_id="python-datascience",
        status=SessionStatus.RUNNING,
        resource_limit=resource_limit,
        workspace_path=f"s3://sandbox-bucket/sessions/{session_id}",
        runtime_type="docker",
        runtime_node="node-1",
        container_id="container-123"
    )


# ============== Execution Fixtures ==============

@pytest.fixture
def execution_id():
    """测试执行 ID"""
    return "exec_20240115_xyz78901"


@pytest.fixture
def execution(session_id, execution_id):
    """测试执行实体"""
    return Execution(
        id=execution_id,
        session_id=session_id,
        code="print('hello world')",
        language="python",
        state=ExecutionState(status=ExecutionStatus.PENDING)
    )


@pytest.fixture
def running_execution(session_id, execution_id):
    """测试运行中执行实体"""
    return Execution(
        id=execution_id,
        session_id=session_id,
        code="print('hello world')",
        language="python",
        state=ExecutionState(status=ExecutionStatus.RUNNING),
        last_heartbeat_at=datetime.now()
    )


@pytest.fixture
def completed_execution(session_id, execution_id):
    """测试已完成执行实体"""
    return Execution(
        id=execution_id,
        session_id=session_id,
        code="print('hello world')",
        language="python",
        state=ExecutionState(
            status=ExecutionStatus.COMPLETED,
            exit_code=0
        ),
        stdout="hello world\n",
        stderr="",
        execution_time=0.5,
        completed_at=datetime.now()
    )


# ============== Template Fixtures ==============

@pytest.fixture
def template_id():
    """测试模板 ID"""
    return "python-datascience"


@pytest.fixture
def template(template_id):
    """测试模板实体"""
    return Template(
        id=template_id,
        name="Python Data Science",
        image="python:3.11-datascience",
        base_image="python:3.11-slim",
        pre_installed_packages=["numpy", "pandas", "scikit-learn"]
    )


# ============== Artifact Fixtures ==============

@pytest.fixture
def artifact():
    """测试制品"""
    return Artifact.create(
        path="output.txt",
        size=100,
        mime_type="text/plain"
    )


# ============== Asyncio Configuration ==============

@pytest.fixture(scope="session")
def event_loop_policy():
    """配置事件循环策略"""
    import asyncio
    return asyncio.DefaultEventLoopPolicy()
