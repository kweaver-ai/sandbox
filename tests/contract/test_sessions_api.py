"""Contract tests for session management API endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.contract
class TestSessionsAPIContract:
    """Contract tests for /sessions endpoints."""

    async def test_create_session_contract(self, client: AsyncClient) -> None:
        """Test POST /sessions contract."""
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
        
        # Validate response structure
        assert response.status_code == 201
        data = response.json()
        assert "session_id" in data
        assert data["session_id"].startswith("sess_")
        assert "status" in data
        assert data["status"] == "creating"
        assert "template_id" in data
        assert data["template_id"] == "python-basic"

    async def test_get_session_contract(self, client: AsyncClient) -> None:
        """Test GET /sessions/{id} contract."""
        # First create a session
        create_response = await client.post(
            "/api/v1/sessions",
            json={
                "template_id": "python-basic",
                "timeout": 300,
            },
        )
        session_id = create_response.json()["session_id"]
        
        # Get session details
        response = await client.get(f"/api/v1/sessions/{session_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == session_id
        assert "status" in data
        assert "runtime_type" in data

    async def test_get_session_not_found_contract(self, client: AsyncClient) -> None:
        """Test GET /sessions/{id} with non-existent session."""
        response = await client.get("/api/v1/sessions/sess_invalid123")
        
        assert response.status_code == 404
        data = response.json()
        assert "error_code" in data
        assert data["error_code"] == "Sandbox.SessionNotFound"
        assert "description" in data
        assert "error_detail" in data

    async def test_list_sessions_contract(self, client: AsyncClient) -> None:
        """Test GET /sessions with filters."""
        response = await client.get(
            "/api/v1/sessions",
            params={"status": "creating", "limit": 10},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert "total" in data
        assert isinstance(data["sessions"], list)

    async def test_terminate_session_contract(self, client: AsyncClient) -> None:
        """Test DELETE /sessions/{id} contract."""
        # First create a session
        create_response = await client.post(
            "/api/v1/sessions",
            json={
                "template_id": "python-basic",
                "timeout": 300,
            },
        )
        session_id = create_response.json()["session_id"]
        
        # Terminate session
        response = await client.delete(f"/api/v1/sessions/{session_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
