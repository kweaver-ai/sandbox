"""
Unit tests for Application Services.

Tests application services that orchestrate domain objects:
- HeartbeatService
- LifecycleService
"""

import pytest
import asyncio
from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

from executor.application.services.heartbeat_service import HeartbeatService
from executor.application.services.lifecycle_service import LifecycleService
from executor.domain.value_objects import (
    HeartbeatSignal,
    ContainerLifecycleEvent,
    ExitReason,
    ExecutionStatus,
    ExecutionResult,
)


class TestHeartbeatService:
    """Tests for HeartbeatService."""

    @pytest.fixture
    def mock_callback_port(self):
        """Create a mock callback port."""
        mock = AsyncMock()
        mock.report_heartbeat.return_value = True
        return mock

    @pytest.fixture
    def heartbeat_service(self, mock_callback_port):
        """Create a HeartbeatService instance."""
        return HeartbeatService(
            callback_port=mock_callback_port,
            interval=1.0,  # 1 second for testing
        )

    @pytest.mark.asyncio
    async def test_start_heartbeat_creates_task(self, heartbeat_service):
        """Test that starting heartbeat creates a background task."""
        execution_id = "exec_001"

        await heartbeat_service.start_heartbeat(execution_id)

        assert execution_id in heartbeat_service._tasks
        assert execution_id in heartbeat_service._stop_events

        # Cleanup
        await heartbeat_service.stop_heartbeat(execution_id)

    @pytest.mark.asyncio
    async def test_send_heartbeat(self, heartbeat_service, mock_callback_port):
        """Test sending a heartbeat signal."""
        execution_id = "exec_001"
        signal = HeartbeatSignal(
            timestamp=datetime.now(),
            progress={"status": "running"},
        )

        result = await heartbeat_service.send_heartbeat(execution_id, signal)

        assert result is True
        mock_callback_port.report_heartbeat.assert_called_once_with(execution_id, signal)

    @pytest.mark.asyncio
    async def test_stop_heartbeat_stops_task(self, heartbeat_service):
        """Test that stopping heartbeat cancels the task."""
        execution_id = "exec_001"

        await heartbeat_service.start_heartbeat(execution_id)

        # Wait a bit to ensure heartbeat is running
        await asyncio.sleep(0.1)

        # Stop the heartbeat
        await heartbeat_service.stop_heartbeat(execution_id)

        # Task should be removed
        assert execution_id not in heartbeat_service._tasks
        assert execution_id not in heartbeat_service._stop_events

    @pytest.mark.asyncio
    async def test_heartbeat_sends_signals_periodically(self, heartbeat_service, mock_callback_port):
        """Test that heartbeat sends signals periodically."""
        execution_id = "exec_001"

        await heartbeat_service.start_heartbeat(execution_id)

        # Wait for at least 2 heartbeats
        await asyncio.sleep(2.5)

        # Should have been called at least twice
        assert mock_callback_port.report_heartbeat.call_count >= 2

        # Cleanup
        await heartbeat_service.stop_heartbeat(execution_id)

    @pytest.mark.asyncio
    async def test_stop_all_stops_all_heartbeats(self, heartbeat_service):
        """Test that stop_all stops all active heartbeats."""
        exec_ids = ["exec_001", "exec_002", "exec_003"]

        # Start multiple heartbeats
        for exec_id in exec_ids:
            await heartbeat_service.start_heartbeat(exec_id)

        # Wait a bit
        await asyncio.sleep(0.1)

        # Stop all
        await heartbeat_service.stop_all()

        # All should be stopped
        assert len(heartbeat_service._tasks) == 0
        assert len(heartbeat_service._stop_events) == 0


class TestLifecycleService:
    """Tests for LifecycleService."""

    @pytest.fixture
    def mock_callback_port(self):
        """Create a mock callback port."""
        mock = AsyncMock()
        mock.report_lifecycle.return_value = True
        return mock

    @pytest.fixture
    def mock_heartbeat_port(self):
        """Create a mock heartbeat port."""
        mock = AsyncMock()
        mock.stop_all.return_value = None
        return mock

    @pytest.fixture
    def lifecycle_service(self, mock_callback_port, mock_heartbeat_port):
        """Create a LifecycleService instance."""
        return LifecycleService(
            callback_port=mock_callback_port,
            container_id="container-123",
            pod_name="pod-456",
            executor_port=8080,
            heartbeat_port=mock_heartbeat_port,
        )

    @pytest.mark.asyncio
    async def test_send_container_ready(self, lifecycle_service, mock_callback_port):
        """Test sending container_ready event."""
        result = await lifecycle_service.send_container_ready()

        assert result is True
        mock_callback_port.report_lifecycle.assert_called_once()

        # Verify the event has correct type
        event = mock_callback_port.report_lifecycle.call_args[0][0]
        assert event.event_type == "ready"
        assert event.container_id == "container-123"
        assert event.pod_name == "pod-456"

    @pytest.mark.asyncio
    async def test_shutdown_without_signal(self, lifecycle_service, mock_callback_port, mock_heartbeat_port):
        """Test shutdown without signal (normal exit)."""
        await lifecycle_service.shutdown()

        # Should stop heartbeats
        mock_heartbeat_port.stop_all.assert_called_once()

        # Should send container_exited event
        mock_callback_port.report_lifecycle.assert_called_once()

        event = mock_callback_port.report_lifecycle.call_args[0][0]
        assert event.event_type == "exited"
        assert event.exit_reason == ExitReason.NORMAL

    @pytest.mark.asyncio
    async def test_shutdown_with_sigterm(self, lifecycle_service, mock_callback_port, mock_heartbeat_port):
        """Test shutdown with SIGTERM signal."""
        import signal

        await lifecycle_service.shutdown(signal.SIGTERM)

        # Should stop heartbeats
        mock_heartbeat_port.stop_all.assert_called_once()

        # Should send container_exited with SIGTERM reason
        event = mock_callback_port.report_lifecycle.call_args[0][0]
        assert event.event_type == "exited"
        assert event.exit_reason == ExitReason.SIGTERM

    @pytest.mark.asyncio
    async def test_shutdown_with_sigkill(self, lifecycle_service, mock_callback_port, mock_heartbeat_port):
        """Test shutdown with SIGKILL signal."""
        import signal

        await lifecycle_service.shutdown(signal.SIGKILL)

        event = mock_callback_port.report_lifecycle.call_args[0][0]
        assert event.exit_reason == ExitReason.SIGKILL

    @pytest.mark.asyncio
    async def test_map_exit_code_to_reason(self):
        """Test mapping exit codes to ExitReason."""
        from executor.application.services.lifecycle_service import map_exit_code_to_reason

        assert map_exit_code_to_reason(0) == ExitReason.NORMAL
        assert map_exit_code_to_reason(143) == ExitReason.SIGTERM
        assert map_exit_code_to_reason(137) == ExitReason.SIGKILL
        assert map_exit_code_to_reason(139) == ExitReason.SIGKILL  # SIGSEGV
        assert map_exit_code_to_reason(1) == ExitReason.ERROR

    def test_get_container_id(self, lifecycle_service):
        """Test getting container ID."""
        assert lifecycle_service._container_id == "container-123"

    def test_get_pod_name(self, lifecycle_service):
        """Test getting pod name."""
        assert lifecycle_service._pod_name == "pod-456"

    def test_get_executor_port(self, lifecycle_service):
        """Test getting executor port."""
        assert lifecycle_service._executor_port == 8080
