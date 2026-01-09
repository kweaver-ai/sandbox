"""Contract tests for code execution API endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.contract
class TestExecutionsAPIContract:
    """Contract tests for /executions endpoints."""

    async def test_submit_execution_contract(self, client: AsyncClient) -> None:
        """Test POST /sessions/{id}/execute contract."""
        # This would require a valid session
        response = await client.post(
            "/api/v1/sessions/sess_test123/execute",
            json={
                "code": "def handler(event):\n    return {'result': 'hello'}",
                "language": "python",
                "timeout": 30,
                "event": {"name": "test"},
            },
        )
        
        # Should return 200 or 404 (if session doesn't exist)
        assert response.status_code in [200, 404]

    async def test_get_execution_status_contract(self, client: AsyncClient) -> None:
        """Test GET /executions/{id}/status contract."""
        response = await client.get("/api/v1/executions/exec_test123/status")
        
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert "execution_id" in data
            assert "status" in data

    async def test_get_execution_result_contract(self, client: AsyncClient) -> None:
        """Test GET /executions/{id}/result contract."""
        response = await client.get("/api/v1/executions/exec_test123/result")
        
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert "execution_id" in data
            assert "status" in data

    async def test_list_session_executions_contract(self, client: AsyncClient) -> None:
        """Test GET /sessions/{id}/executions contract."""
        response = await client.get("/api/v1/sessions/sess_test123/executions")
        
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert "executions" in data
            assert "total" in data
