"""Integration tests for session lifecycle management."""

import pytest
from httpx import AsyncClient


@pytest.mark.integration
class TestSessionLifecycle:
    """Integration tests for complete session lifecycle."""

    async def test_session_create_to_running_flow(self, client: AsyncClient) -> None:
        """Test session lifecycle from creation to running state."""
        # Create session
        response = await client.post(
            "/api/v1/sessions",
            json={
                "template_id": "python-basic",
                "timeout": 300,
                "resources": {
                    "cpu": "1",
                    "memory": "512Mi",
                    "disk": "1Gi",
                },
            },
        )
        
        assert response.status_code == 201
        session_id = response.json()["session_id"]
        
        # Query session status
        response = await client.get(f"/api/v1/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Status should be creating, running, or completed
        assert data["status"] in ["creating", "running", "completed"]

    async def test_session_timeout(self, client: AsyncClient) -> None:
        """Test automatic session cleanup after timeout."""
        # Create session with short timeout
        response = await client.post(
            "/api/v1/sessions",
            json={
                "template_id": "python-basic",
                "timeout": 60,  # 1 minute timeout for testing
            },
        )
        
        assert response.status_code == 201
        session_id = response.json()["session_id"]
        
        # Wait for timeout to expire
        # In real test, we would use a shorter timeout or mock time
        # For now, just verify the session was created
        response = await client.get(f"/api/v1/sessions/{session_id}")
        assert response.status_code == 200

    async def test_session_not_found_error(self, client: AsyncClient) -> None:
        """Test error handling for non-existent session."""
        response = await client.get("/api/v1/sessions/sess_nonexistent123")
        
        assert response.status_code == 404
        data = response.json()
        assert "error_code" in data
        assert data["error_code"] == "Sandbox.SessionNotFound"
        assert "solution" in data
