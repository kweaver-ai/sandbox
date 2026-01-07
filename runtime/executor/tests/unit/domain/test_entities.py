"""
Unit tests for Domain Entities.

Tests domain entities that encapsulate business logic:
- Execution entity with state transitions
- ExecutionContext with workspace management
"""

import pytest
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock

from executor.domain.entities import Execution
from executor.domain.value_objects import (
    ExecutionContext,
    ExecutionResult,
    ExecutionStatus,
)


class TestExecutionContext:
    """Tests for ExecutionContext value object."""

    def test_create_context(self):
        """Test creating an execution context."""
        context = ExecutionContext(
            workspace_path=Path("/workspace"),
            session_id="session_001",
            execution_id="exec_001",
            control_plane_url="http://localhost:8000",
            env_vars={"KEY": "VALUE"},
            stdin="input",
        )

        assert context.session_id == "session_001"
        assert context.execution_id == "exec_001"
        assert context.env_vars == {"KEY": "VALUE"}
        assert context.stdin == "input"

    def test_context_with_defaults(self):
        """Test context with default values."""
        context = ExecutionContext(
            workspace_path=Path("/workspace"),
            session_id="session_001",
            execution_id="exec_001",
            control_plane_url="http://localhost:8000",
        )

        assert context.session_id == "session_001"
        assert context.execution_id == "exec_001"
        assert context.env_vars == {}
        assert context.stdin == ""


class TestExecution:
    """Tests for Execution entity."""

    def test_create_execution(self):
        """Test creating an execution entity."""
        context = ExecutionContext(
            workspace_path=Path("/workspace"),
            session_id="session_001",
            execution_id="exec_001",
            control_plane_url="http://localhost:8000",
        )

        execution = Execution(
            execution_id="exec_001",
            session_id="session_001",
            code="print('hello')",
            language="python",
            context=context,
        )

        assert execution.execution_id == "exec_001"
        assert execution.status == ExecutionStatus.PENDING
        assert execution.retry_count == 0

    def test_mark_as_running_transitions_state(self):
        """Test state transition from PENDING to RUNNING."""
        context = ExecutionContext(
            workspace_path=Path("/workspace"),
            session_id="session_001",
            execution_id="exec_001",
            control_plane_url="http://localhost:8000",
        )

        execution = Execution(
            execution_id="exec_001",
            session_id="session_001",
            code="test",
            language="python",
            context=context,
        )

        assert execution.status == ExecutionStatus.PENDING

        execution.mark_as_running()

        assert execution.status == ExecutionStatus.RUNNING
        assert execution.started_at is not None

    def test_mark_as_completed_transitions_state(self):
        """Test state transition from RUNNING to COMPLETED."""
        context = ExecutionContext(
            workspace_path=Path("/workspace"),
            session_id="session_001",
            execution_id="exec_001",
            control_plane_url="http://localhost:8000",
        )

        execution = Execution(
            execution_id="exec_001",
            session_id="session_001",
            code="test",
            language="python",
            context=context,
        )

        execution.mark_as_running()

        result = ExecutionResult(
            status=ExecutionStatus.SUCCESS,
            stdout="output",
            stderr="",
            exit_code=0,
            execution_time_ms=100,
        )

        execution.mark_as_completed(result)

        assert execution.status == ExecutionStatus.COMPLETED
        assert execution.completed_at is not None
        assert execution.result == result

    def test_mark_as_timeout(self):
        """Test state transition to TIMEOUT."""
        context = ExecutionContext(
            workspace_path=Path("/workspace"),
            session_id="session_001",
            execution_id="exec_001",
            control_plane_url="http://localhost:8000",
        )

        execution = Execution(
            execution_id="exec_001",
            session_id="session_001",
            code="test",
            language="python",
            context=context,
        )

        execution.mark_as_running()
        execution.mark_as_timeout()

        assert execution.status == ExecutionStatus.TIMEOUT
        assert execution.completed_at is not None

    def test_mark_as_failed(self):
        """Test state transition to FAILED."""
        context = ExecutionContext(
            workspace_path=Path("/workspace"),
            session_id="session_001",
            execution_id="exec_001",
            control_plane_url="http://localhost:8000",
        )

        execution = Execution(
            execution_id="exec_001",
            session_id="session_001",
            code="test",
            language="python",
            context=context,
        )

        execution.mark_as_running()
        error_msg = "Syntax error"
        execution.mark_as_failed(error_msg)

        assert execution.status == ExecutionStatus.FAILED
        assert execution.completed_at is not None
        assert execution.error_message == error_msg

    def test_increment_retry_count(self):
        """Test incrementing retry count."""
        context = ExecutionContext(
            workspace_path=Path("/workspace"),
            session_id="session_001",
            execution_id="exec_001",
            control_plane_url="http://localhost:8000",
        )

        execution = Execution(
            execution_id="exec_001",
            session_id="session_001",
            code="test",
            language="python",
            context=context,
        )

        assert execution.retry_count == 0

        execution.increment_retry()
        assert execution.retry_count == 1

        execution.increment_retry()
        assert execution.retry_count == 2

    def test_execution_duration(self):
        """Test calculating execution duration."""
        context = ExecutionContext(
            workspace_path=Path("/workspace"),
            session_id="session_001",
            execution_id="exec_001",
            control_plane_url="http://localhost:8000",
        )

        execution = Execution(
            execution_id="exec_001",
            session_id="session_001",
            code="test",
            language="python",
            context=context,
        )

        execution.mark_as_running()

        # Simulate some time passing
        import time
        time.sleep(0.01)

        result = ExecutionResult(
            status=ExecutionStatus.SUCCESS,
            stdout="output",
            stderr="",
            exit_code=0,
            execution_time_ms=10,
        )

        execution.mark_as_completed(result)

        duration_ms = execution.duration_ms
        assert duration_ms is not None
        assert duration_ms >= 10

    def test_execution_duration_before_completion(self):
        """Test that duration returns None for incomplete executions."""
        context = ExecutionContext(
            workspace_path=Path("/workspace"),
            session_id="session_001",
            execution_id="exec_001",
            control_plane_url="http://localhost:8000",
        )

        execution = Execution(
            execution_id="exec_001",
            session_id="session_001",
            code="test",
            language="python",
            context=context,
        )

        # No duration before completion
        assert execution.duration_ms is None

        execution.mark_as_running()
        # Still no duration while running
        assert execution.duration_ms is None
