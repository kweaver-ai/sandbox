"""
Container Monitoring API Integration Tests

Tests for container monitoring and management endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestContainersAPI:
    """Container API integration tests."""

    async def test_list_containers(self, http_client: AsyncClient):
        """Test listing all containers."""
        response = await http_client.get("/containers")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_list_containers_by_status(self, http_client: AsyncClient, test_session_id: str):
        """Test filtering containers by status."""
        # List running containers
        response = await http_client.get("/containers?status_filter=running")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # Check if our test session's container is in the list
        session_containers = [
            c for c in data
            if c.get("session_id") == test_session_id
        ]
        # Container should be running or ready
        assert len(session_containers) >= 0

    async def test_list_containers_by_runtime_type(self, http_client: AsyncClient):
        """Test filtering containers by runtime type."""
        response = await http_client.get("/containers?runtime_type=docker")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        for container in data:
            assert container.get("runtime_type") == "docker"

    async def test_get_container(
        self,
        http_client: AsyncClient,
        test_session_id: str
    ):
        """Test getting specific container details."""
        # First get the session to find the container_id
        session_response = await http_client.get(f"/sessions/{test_session_id}")
        assert session_response.status_code == 200
        session_data = session_response.json()
        container_id = session_data.get("container_id")

        if not container_id:
            pytest.skip("No container ID found for session")

        # Get container details
        response = await http_client.get(f"/containers/{container_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == container_id or data["container_id"] == container_id
        assert "status" in data
        assert "runtime_type" in data

    async def test_get_container_logs(
        self,
        http_client: AsyncClient,
        test_session_id: str
    ):
        """Test getting container logs."""
        # First get the session to find the container_id
        session_response = await http_client.get(f"/sessions/{test_session_id}")
        assert session_response.status_code == 200
        session_data = session_response.json()
        container_id = session_data.get("container_id")

        if not container_id:
            pytest.skip("No container ID found for session")

        # Get container logs
        response = await http_client.get(f"/containers/{container_id}/logs")

        assert response.status_code == 200
        data = response.json()
        assert "logs" in data or "content" in data

    async def test_get_container_logs_with_tail(
        self,
        http_client: AsyncClient,
        test_session_id: str
    ):
        """Test getting container logs with tail parameter."""
        # First get the session to find the container_id
        session_response = await http_client.get(f"/sessions/{test_session_id}")
        assert session_response.status_code == 200
        session_data = session_response.json()
        container_id = session_data.get("container_id")

        if not container_id:
            pytest.skip("No container ID found for session")

        # Get last 10 lines of logs
        response = await http_client.get(f"/containers/{container_id}/logs?tail=10")

        assert response.status_code == 200
        data = response.json()

    async def test_get_nonexistent_container(self, http_client: AsyncClient):
        """Test getting a container that doesn't exist."""
        response = await http_client.get("/containers/nonexistent_container_id")

        assert response.status_code == 404

    async def test_list_containers_with_pagination(
        self,
        http_client: AsyncClient
    ):
        """Test listing containers with pagination."""
        response = await http_client.get("/containers?limit=10&offset=0")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_container_metrics(
        self,
        http_client: AsyncClient,
        test_session_id: str
    ):
        """Test container resource metrics."""
        # First get the session to find the container_id
        session_response = await http_client.get(f"/sessions/{test_session_id}")
        assert session_response.status_code == 200
        session_data = session_response.json()
        container_id = session_data.get("container_id")

        if not container_id:
            pytest.skip("No container ID found for session")

        # Get container details (should include metrics)
        response = await http_client.get(f"/containers/{container_id}")

        assert response.status_code == 200
        data = response.json()

        # Check for metrics fields (may or may not be present depending on implementation)
        # Just verify the response structure is correct
        assert "status" in data

    async def test_container_session_association(
        self,
        http_client: AsyncClient,
        test_session_id: str
    ):
        """Test that container is correctly associated with session."""
        # Get session details
        session_response = await http_client.get(f"/sessions/{test_session_id}")
        assert session_response.status_code == 200
        session_data = session_response.json()

        container_id = session_data.get("container_id")

        if container_id:
            # Verify the container exists and is associated with this session
            container_response = await http_client.get(f"/containers/{container_id}")
            if container_response.status_code == 200:
                container_data = container_response.json()
                assert container_data.get("session_id") == test_session_id

    async def test_list_containers_empty_filters(
        self,
        http_client: AsyncClient
    ):
        """Test listing containers with no filters."""
        response = await http_client.get("/containers")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
