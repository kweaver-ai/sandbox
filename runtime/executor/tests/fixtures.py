"""
Test fixtures for sandbox-executor tests.

Provides sample data and mock servers for testing.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from typing import Generator
from datetime import datetime
import httpx
import asyncio
from unittest.mock import AsyncMock

from executor.domain.value_objects import ExecutionRequest, ExecutionResult, ExecutionMetrics, ExecutionStatus, Artifact


@pytest.fixture
def sample_execution_request() -> ExecutionRequest:
    """Sample execution request for Python code."""
    return ExecutionRequest(
        execution_id="exec_test_001",
        session_id="session_test_001",
        code='def handler(event):\n    return {"message": "Hello", "input": event.get("name", "World")}',
        language="python",
        timeout=10,
        stdin='{"name": "Alice"}',
        env_vars={},
    )


@pytest.fixture
def sample_execution_request_error() -> ExecutionRequest:
    """Sample execution request with runtime error."""
    return ExecutionRequest(
        execution_id="exec_test_002",
        session_id="session_test_002",
        code="def handler(event):\n    return undefined_var",
        language="python",
        timeout=10,
        stdin="{}",
        env_vars={},
    )


@pytest.fixture
def sample_execution_result() -> ExecutionResult:
    """Sample successful execution result."""
    return ExecutionResult(
        execution_id="exec_test_001",
        status=ExecutionStatus.SUCCESS,
        stdout="\n===SANDBOX_RESULT===\n{\"message\": \"Hello\"}\n===SANDBOX_RESULT_END===\n",
        stderr="",
        exit_code=0,
        execution_time_ms=82,
        return_value={"message": "Hello"},
        metrics=ExecutionMetrics(
            duration_ms=82.3,
            cpu_time_ms=76.1,
            peak_memory_mb=45.2,
            max_rss_kb=46300,
            filesystem_reads=0,
            filesystem_writes=0,
        ),
        artifacts=[],
    )


@pytest.fixture
def temp_workspace() -> Generator[Path, None, None]:
    """Create a temporary workspace directory for testing."""
    workspace = Path(tempfile.mkdtemp())
    yield workspace
    # Cleanup
    shutil.rmtree(workspace, ignore_errors=True)


@pytest.fixture
def mock_control_plane() -> Generator[AsyncMock, None, None]:
    """Mock Control Plane HTTP client."""
    async def _mock_client():
        client = AsyncMock(spec=httpx.AsyncClient)
        # Mock successful responses
        async def mock_post(*args, **kwargs):
            response = AsyncMock()
            response.status_code = 200
            response.json.return_value = {"message": "OK"}
            response.raise_for_status.return_value = None
            return response

        client.post = mock_post
        client.get = mock_post
        return client

    # For now, return a simple mock
    # In real usage, this would be integrated with httpx.AsyncClient
    mock = AsyncMock(spec=httpx.AsyncClient)
    yield mock


@pytest.fixture
def execution_timeout_request() -> ExecutionRequest:
    """Sample execution request that will timeout."""
    return ExecutionRequest(
        execution_id="exec_test_timeout",
        session_id="session_test_timeout",
        code="import time; time.sleep(60); print('Done')",
        language="python",
        timeout=10,
        stdin="{}",
        env_vars={},
    )
