"""
Unit tests for Domain Value Objects.

Tests value objects that follow hexagonal architecture principles:
- Immutability (frozen dataclasses)
- Validation in __post_init__
- Type safety with proper enums
"""

import pytest
from datetime import datetime
from dataclasses import FrozenInstanceError

from executor.domain.value_objects import (
    ExecutionRequest,
    ExecutionResult,
    ExecutionStatus,
    Artifact,
    ArtifactType,
    ResourceLimit,
    ExecutionMetrics,
    HeartbeatSignal,
    ContainerLifecycleEvent,
    ExitReason,
)


class TestExecutionRequest:
    """Tests for ExecutionRequest value object."""

    def test_create_valid_request(self):
        """Test creating a valid execution request."""
        request = ExecutionRequest(
            execution_id="exec_12345678_abc12345",
            session_id="session_001",
            code="print('hello')",
            language="python",
            timeout=10,
            stdin="",
            env_vars={},
        )

        assert request.execution_id == "exec_12345678_abc12345"
        assert request.code == "print('hello')"
        assert request.language == "python"
        assert request.timeout == 10

    def test_request_is_immutable(self):
        """Test that ExecutionRequest is immutable (frozen)."""
        request = ExecutionRequest(
            execution_id="exec_001",
            session_id="session_001",
            code="test",
            language="python",
            timeout=10,
            stdin="",
            env_vars={},
        )

        # Should raise FrozenInstanceError when trying to modify
        with pytest.raises(FrozenInstanceError):
            request.code = "modified"

    def test_to_context_creates_valid_context(self):
        """Test that to_context() creates a valid ExecutionContext."""
        from pathlib import Path

        request = ExecutionRequest(
            execution_id="exec_001",
            session_id="session_001",
            code="test",
            language="python",
            timeout=10,
            stdin="input",
            env_vars={"KEY": "VALUE"},
        )

        context = request.to_context(
            workspace_path=Path("/workspace"),
            control_plane_url="http://localhost:8000",
        )

        assert context.execution_id == "exec_001"
        assert context.session_id == "session_001"
        assert context.stdin == "input"
        assert context.env_vars == {"KEY": "VALUE"}


class TestExecutionResult:
    """Tests for ExecutionResult value object."""

    def test_create_success_result(self):
        """Test creating a successful execution result."""
        result = ExecutionResult(
            status=ExecutionStatus.SUCCESS,
            stdout="output",
            stderr="",
            exit_code=0,
            execution_time_ms=100,
        )

        assert result.status == ExecutionStatus.SUCCESS
        assert result.exit_code == 0

    def test_result_with_metrics(self):
        """Test result with execution metrics."""
        metrics = ExecutionMetrics(
            duration_ms=100,
            cpu_time_ms=80,
            peak_memory_mb=50,
        )

        result = ExecutionResult(
            status=ExecutionStatus.SUCCESS,
            stdout="output",
            stderr="",
            exit_code=0,
            execution_time_ms=100,
            metrics=metrics,
        )

        assert result.metrics.duration_ms == 100
        assert result.metrics.peak_memory_mb == 50

    def test_result_with_artifacts(self):
        """Test result with artifacts."""
        artifact = Artifact(
            path="output.txt",
            size=100,
            mime_type="text/plain",
            type=ArtifactType.OUTPUT,
            created_at=datetime.now(),
        )

        result = ExecutionResult(
            status=ExecutionStatus.SUCCESS,
            stdout="output",
            stderr="",
            exit_code=0,
            execution_time_ms=100,
            artifacts=[artifact],
        )

        assert len(result.artifacts) == 1
        assert result.artifacts[0].path == "output.txt"

    def test_result_is_immutable(self):
        """Test that ExecutionResult is mutable (not frozen)."""
        result = ExecutionResult(
            status=ExecutionStatus.SUCCESS,
            stdout="output",
            stderr="",
            exit_code=0,
            execution_time_ms=100,
        )

        # ExecutionResult is NOT frozen, so we can modify it
        result.status = ExecutionStatus.FAILED
        assert result.status == ExecutionStatus.FAILED


class TestArtifact:
    """Tests for Artifact value object."""

    def test_create_valid_artifact(self):
        """Test creating a valid artifact."""
        artifact = Artifact(
            path="output/data.json",
            size=1024,
            mime_type="application/json",
            type=ArtifactType.ARTIFACT,
            created_at=datetime.now(),
        )

        assert artifact.path == "output/data.json"
        assert artifact.size == 1024
        assert artifact.type == ArtifactType.ARTIFACT

    def test_artifact_rejects_path_traversal(self):
        """Test that artifact rejects path traversal attempts."""
        with pytest.raises(ValueError, match=".*cannot contain.*"):
            Artifact(
                path="../etc/passwd",
                size=100,
                mime_type="text/plain",
                type=ArtifactType.ARTIFACT,
                created_at=datetime.now(),
            )

    def test_artifact_rejects_hidden_files(self):
        """Test that artifact rejects hidden files."""
        with pytest.raises(ValueError, match=".*cannot start with.*"):
            Artifact(
                path=".secret/key.txt",
                size=100,
                mime_type="text/plain",
                type=ArtifactType.ARTIFACT,
                created_at=datetime.now(),
            )

    def test_artifact_with_optional_fields(self):
        """Test artifact with optional checksum and download_url."""
        artifact = Artifact(
            path="output/result.pdf",
            size=2048,
            mime_type="application/pdf",
            type=ArtifactType.OUTPUT,
            created_at=datetime.now(),
            checksum="abc123",
            download_url="http://storage/result.pdf",
        )

        assert artifact.checksum == "abc123"
        assert artifact.download_url == "http://storage/result.pdf"


class TestExecutionMetrics:
    """Tests for ExecutionMetrics value object."""

    def test_create_metrics(self):
        """Test creating execution metrics."""
        metrics = ExecutionMetrics(
            duration_ms=1000,
            cpu_time_ms=800,
            peak_memory_mb=128,
            io_read_bytes=4096,
            io_write_bytes=2048,
        )

        assert metrics.duration_ms == 1000
        assert metrics.cpu_time_ms == 800
        assert metrics.peak_memory_mb == 128
        assert metrics.io_read_bytes == 4096
        assert metrics.io_write_bytes == 2048

    def test_metrics_with_optional_fields(self):
        """Test metrics with optional fields omitted."""
        metrics = ExecutionMetrics(
            duration_ms=100,
            cpu_time_ms=80,
        )

        assert metrics.duration_ms == 100
        assert metrics.peak_memory_mb is None


class TestHeartbeatSignal:
    """Tests for HeartbeatSignal value object."""

    def test_create_heartbeat(self):
        """Test creating a heartbeat signal."""
        signal = HeartbeatSignal(
            timestamp=datetime.now(),
            progress={"status": "running", "percent": 50},
        )

        assert signal.progress["status"] == "running"
        assert signal.progress["percent"] == 50

    def test_heartbeat_is_immutable(self):
        """Test that heartbeat signal is immutable."""
        signal = HeartbeatSignal(
            timestamp=datetime.now(),
            progress={},
        )

        with pytest.raises(FrozenInstanceError):
            signal.progress = {"modified": True}


class TestContainerLifecycleEvent:
    """Tests for ContainerLifecycleEvent value object."""

    def test_create_ready_event(self):
        """Test creating a container ready event."""
        event = ContainerLifecycleEvent(
            event_type="ready",
            container_id="container-123",
            pod_name="pod-456",
            executor_port=8080,
            ready_at=datetime.now(),
        )

        assert event.event_type == "ready"
        assert event.container_id == "container-123"

    def test_create_exited_event(self):
        """Test creating a container exited event."""
        event = ContainerLifecycleEvent(
            event_type="exited",
            container_id="container-123",
            pod_name="pod-456",
            executor_port=8080,
            exited_at=datetime.now(),
            exit_reason=ExitReason.SIGTERM,
            exit_code=143,
        )

        assert event.event_type == "exited"
        assert event.exit_reason == ExitReason.SIGTERM
        assert event.exit_code == 143


class TestResourceLimit:
    """Tests for ResourceLimit value object."""

    def test_create_resource_limits(self):
        """Test creating resource limits."""
        limits = ResourceLimit(
            timeout_seconds=300,
            max_memory_mb=512,
            max_processes=128,
            max_file_size_mb=100,
        )

        assert limits.timeout_seconds == 300
        assert limits.max_memory_mb == 512
        assert limits.max_processes == 128
        assert limits.max_file_size_mb == 100
