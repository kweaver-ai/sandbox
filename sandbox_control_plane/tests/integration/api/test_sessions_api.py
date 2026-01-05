"""
会话 API 集成测试

测试会话相关的 HTTP API 端点。
"""
import pytest
from httpx import AsyncClient


class TestSessionsAPI:
    """会话 API 集成测试"""

    @pytest.mark.asyncio
    async def test_create_session(self, client: AsyncClient):
        """测试创建会话 API"""
        response = await client.post(
            "/api/v1/sessions",
            json={
                "template_id": "python-datascience",
                "timeout": 300,
                "cpu": "1",
                "memory": "512Mi",
                "disk": "1Gi",
                "env_vars": {}
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["template_id"] == "python-datascience"
        assert data["status"] == "creating"

    @pytest.mark.asyncio
    async def test_create_session_invalid_template(self, client: AsyncClient):
        """测试使用不存在的模板创建会话"""
        response = await client.post(
            "/api/v1/sessions",
            json={
                "template_id": "non-existent",
                "timeout": 300
            }
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_session_invalid_timeout(self, client: AsyncClient):
        """测试使用无效超时值创建会话"""
        response = await client.post(
            "/api/v1/sessions",
            json={
                "template_id": "python-datascience",
                "timeout": 5000  # 超过最大值 3600
            }
        )

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_get_session(self, client: AsyncClient, session_id: str):
        """测试获取会话 API"""
        response = await client.get(f"/api/v1/sessions/{session_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == session_id

    @pytest.mark.asyncio
    async def test_get_session_not_found(self, client: AsyncClient):
        """测试获取不存在的会话"""
        response = await client.get("/api/v1/sessions/non-existent")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_terminate_session(self, client: AsyncClient, session_id: str):
        """测试终止会话 API"""
        response = await client.delete(f"/api/v1/sessions/{session_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "terminated"

    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient):
        """测试健康检查 API"""
        response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "uptime" in data


# ============== Fixtures ==============

@pytest.fixture
async def client(test_app):
    """创建测试客户端"""
    async with AsyncClient(app=test_app, base_url="http://test") as client:
        yield client


@pytest.fixture
async def session_id(client: AsyncClient) -> str:
    """创建测试会话并返回 ID"""
    response = await client.post(
        "/api/v1/sessions",
        json={
            "template_id": "python-datascience",
            "timeout": 300
        }
    )
    data = response.json()
    return data["id"]


@pytest.fixture
async def test_app():
    """创建测试应用"""
    from src.interfaces.rest.main import create_app

    # TODO: 配置测试数据库和依赖注入
    app = create_app()
    yield app
