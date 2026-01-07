"""Unit tests for session manager."""

import pytest
from datetime import datetime, timedelta

from sandbox_control_plane.session_manager.manager import SessionManager
from sandbox_control_plane.session_manager.lifecycle import SessionStatus, SessionStateMachine
from sandbox_control_plane.utils.errors import SessionNotFoundError


@pytest.mark.unit
class TestSessionStateMachine:
    """Tests for session state machine."""

    def test_valid_transition_creating_to_running(self):
        """Test valid transition: creating -> running."""
        assert SessionStateMachine.can_transition(
            SessionStatus.CREATING, SessionStatus.RUNNING
        )

    def test_valid_transition_running_to_completed(self):
        """Test valid transition: running -> completed."""
        assert SessionStateMachine.can_transition(
            SessionStatus.RUNNING, SessionStatus.COMPLETED
        )

    def test_invalid_transition_completed_to_running(self):
        """Test invalid transition: completed -> running."""
        assert not SessionStateMachine.can_transition(
            SessionStatus.COMPLETED, SessionStatus.RUNNING
        )

    def test_validate_transition_raises_on_invalid(self):
        """Test that validate_transition raises on invalid transition."""
        with pytest.raises(ValueError):
            SessionStateMachine.validate_transition(
                SessionStatus.COMPLETED, SessionStatus.RUNNING
            )


@pytest.mark.unit
class TestSessionManager:
    """Tests for session manager."""

    @pytest.fixture
    def session_manager(self):
        """Get session manager instance."""
        return SessionManager()

    def test_session_id_generation(self, session_manager):
        """Test that session IDs are generated correctly."""
        from sandbox_control_plane.utils.id_generator import generate_session_id
        
        session_id = generate_session_id()
        assert session_id.startswith("sess_")
        assert len(session_id) == 21  # sess_ + 16 chars

    def test_resource_validation(self):
        """Test resource limit validation."""
        from sandbox_control_plane.utils.validation import validate_resource_limits
        
        cpu, memory, disk = validate_resource_limits("1", "512Mi", "1Gi")
        assert cpu == 1.0
        assert memory == 512
        assert disk == 1024

    def test_invalid_cpu_raises_error(self):
        """Test that invalid CPU raises error."""
        from sandbox_control_plane.utils.validation import validate_resource_limits
        from sandbox_control_plane.utils.errors import InvalidParameterError
        
        with pytest.raises((ValueError, InvalidParameterError)):
            validate_resource_limits("10", "512Mi", "1Gi")  # CPU too high
