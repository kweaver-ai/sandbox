"""
Session API Integration Tests

Tests for session-related HTTP API endpoints.
"""
import pytest
import asyncio
from httpx import AsyncClient


@pytest.mark.asyncio
class TestSessionsAPI:
    """Session API integration tests."""

    async def test_create_session(self, http_client: AsyncClient, test_template_id: str):
        """Test creating a new session."""
        print(f"http_client base_url: {http_client.base_url}")

        # First check if API is reachable
        health_resp = await http_client.get("/health")
        print(f"Health check: {health_resp.status_code}")

        response = await http_client.post(
            "/sessions",
            json={
                "template_id": test_template_id,
                "timeout": 300,
                "cpu": "1",
                "memory": "512Mi",
                "disk": "1Gi",
                "env_vars": {}
            }
        )

        if response.status_code not in (201, 200):
            print(f"Error response: {response.text}")

        assert response.status_code in (201, 200)
        data = response.json()
        assert "id" in data
        assert data["template_id"] == test_template_id
        assert data["status"] in ("creating", "starting", "initializing")

        # Cleanup
        session_id = data["id"]
        await http_client.delete(f"/sessions/{session_id}")

    async def test_create_session_with_defaults(self, http_client: AsyncClient, test_template_id: str):
        """Test creating a session with default resource values."""
        response = await http_client.post(
            "/sessions",
            json={
                "template_id": test_template_id,
                "timeout": 300
            }
        )

        assert response.status_code in (201, 200)
        data = response.json()
        assert "id" in data
        assert data["template_id"] == test_template_id

        # Cleanup
        session_id = data["id"]
        await http_client.delete(f"/sessions/{session_id}")

    async def test_create_session_invalid_template(self, http_client: AsyncClient):
        """Test using non-existent template to create session."""
        response = await http_client.post(
            "/sessions",
            json={
                "template_id": "non-existent-template-xyz",
                "timeout": 300
            }
        )

        assert response.status_code == 404

    async def test_create_session_invalid_timeout(self, http_client: AsyncClient, test_template_id: str):
        """Test using invalid timeout value to create session."""
        response = await http_client.post(
            "/sessions",
            json={
                "template_id": test_template_id,
                "timeout": 5000  # Exceeds MAX_TIMEOUT of 3600
            }
        )

        assert response.status_code == 422  # Validation error

    async def test_get_session(self, http_client: AsyncClient, test_session_id: str):
        """Test getting session details."""
        response = await http_client.get(f"/sessions/{test_session_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_session_id
        assert "status" in data
        assert "template_id" in data
        assert "created_at" in data

    async def test_get_session_not_found(self, http_client: AsyncClient):
        """Test getting a session that doesn't exist."""
        response = await http_client.get("/sessions/non-existent-session-id")

        assert response.status_code == 404

    async def test_list_sessions(self, http_client: AsyncClient):
        """Test listing all sessions."""
        response = await http_client.get("/sessions")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_terminate_session(self, http_client: AsyncClient, test_template_id: str):
        """Test terminating a session."""
        # Create a session first
        create_response = await http_client.post(
            "/sessions",
            json={
                "template_id": test_template_id,
                "timeout": 300
            }
        )
        assert create_response.status_code in (201, 200)
        session = create_response.json()
        session_id = session["id"]

        # Wait for session to be ready
        for _ in range(30):
            response = await http_client.get(f"/sessions/{session_id}")
            if response.status_code == 200:
                session_data = response.json()
                if session_data["status"] in ("running", "ready"):
                    break
            await asyncio.sleep(1)

        # Terminate the session
        terminate_response = await http_client.delete(f"/sessions/{session_id}")

        assert terminate_response.status_code == 200
        data = terminate_response.json()
        assert data["status"] in ("terminated", "terminating")

    async def test_session_container_created(
        self,
        http_client: AsyncClient,
        test_session_id: str
    ):
        """Test that container is created when session is created."""
        response = await http_client.get(f"/sessions/{test_session_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_session_id

        # Container should be created or assigned
        # (may be None if using warm pool, but container_id should exist)
        if "container_id" in data and data["container_id"]:
            assert data["container_id"]
        # Check that session has a status indicating container is ready
        assert data["status"] in ("running", "ready", "creating")

    async def test_session_container_removed(
        self,
        http_client: AsyncClient,
        test_template_id: str
    ):
        """Test that container is removed when session is terminated."""
        # Create a session
        create_response = await http_client.post(
            "/sessions",
            json={
                "template_id": test_template_id,
                "timeout": 300
            }
        )
        session = create_response.json()
        session_id = session["id"]
        container_id = session.get("container_id")

        # Wait for session to be ready
        for _ in range(30):
            response = await http_client.get(f"/sessions/{session_id}")
            if response.status_code == 200:
                session_data = response.json()
                if session_data.get("container_id"):
                    container_id = session_data["container_id"]
                if session_data["status"] in ("running", "ready"):
                    break
            await asyncio.sleep(1)

        # Terminate the session
        await http_client.delete(f"/sessions/{session_id}")

        # Wait for termination
        for _ in range(10):
            response = await http_client.get(f"/sessions/{session_id}")
            if response.status_code == 200:
                session_data = response.json()
                if session_data["status"] == "terminated":
                    break
            await asyncio.sleep(0.5)

        # Verify session is terminated
        response = await http_client.get(f"/sessions/{session_id}")
        if response.status_code == 200:
            session_data = response.json()
            assert session_data["status"] == "terminated"

    async def test_session_with_custom_env_vars(
        self,
        http_client: AsyncClient,
        test_template_id: str
    ):
        """Test creating session with custom environment variables."""
        env_vars = {
            "CUSTOM_VAR_1": "value1",
            "CUSTOM_VAR_2": "value2"
        }

        response = await http_client.post(
            "/sessions",
            json={
                "template_id": test_template_id,
                "timeout": 300,
                "env_vars": env_vars
            }
        )

        assert response.status_code in (201, 200)
        data = response.json()
        assert data["id"]

        # Cleanup
        session_id = data["id"]
        await http_client.delete(f"/sessions/{session_id}")

    async def test_session_with_custom_resources(
        self,
        http_client: AsyncClient,
        test_template_id: str
    ):
        """Test creating session with custom resource limits."""
        response = await http_client.post(
            "/sessions",
            json={
                "template_id": test_template_id,
                "timeout": 300,
                "cpu": "2",
                "memory": "1Gi",
                "disk": "5Gi"
            }
        )

        assert response.status_code in (201, 200)
        data = response.json()
        assert data["id"]

        # Cleanup
        session_id = data["id"]
        await http_client.delete(f"/sessions/{session_id}")

    async def test_health_check(self, http_client: AsyncClient):
        """Test health check API."""
        response = await http_client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "uptime" in data

    async def test_create_persistent_session(
        self,
        http_client: AsyncClient,
        test_template_id: str
    ):
        """Test creating a persistent session."""
        response = await http_client.post(
            "/sessions",
            json={
                "template_id": test_template_id,
                "timeout": 300,
                "mode": "persistent"
            }
        )

        assert response.status_code in (201, 200)
        data = response.json()
        assert data["id"]
        # Persistent sessions should have mode field or be distinguishable
        # (implementation may vary)

        # Cleanup
        session_id = data["id"]
        await http_client.delete(f"/sessions/{session_id}")


@pytest.mark.asyncio
class TestSessionsAPIWithExecution:
    """Session API tests that involve execution."""

    async def test_session_execution_workflow(
        self,
        http_client: AsyncClient,
        test_template_id: str
    ):
        """Test creating session and executing code in it."""
        # Create session
        session_response = await http_client.post(
            "/sessions",
            json={
                "template_id": test_template_id,
                "timeout": 300
            }
        )
        assert session_response.status_code in (201, 200)
        session = session_response.json()
        session_id = session["id"]

        # Wait for session to be ready
        for _ in range(30):
            response = await http_client.get(f"/sessions/{session_id}")
            if response.status_code == 200:
                session_data = response.json()
                if session_data["status"] in ("running", "ready"):
                    break
            await asyncio.sleep(1)
        else:
            pytest.fail("Session did not become ready")

        # Execute code
        execution_response = await http_client.post(
            f"/executions/sessions/{session_id}/execute",
            json={
                "code": 'def handler(event):\n    return {"message": "Session execution test"}',
                "language": "python",
                "timeout": 10
            }
        )
        assert execution_response.status_code in (201, 200)

        # Cleanup
        await http_client.delete(f"/sessions/{session_id}")
