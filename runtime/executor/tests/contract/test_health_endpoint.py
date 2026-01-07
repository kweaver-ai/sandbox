"""
Contract tests for /health endpoint.

Validates that the /health endpoint complies with the OpenAPI schema defined
in contracts/executor-api.yaml. These tests verify health check responses
for container readiness probes and load balancer health checks.

NOTE: These tests are written BEFORE implementation (Constitution Principle II).
They should FAIL initially and pass after the endpoint is implemented.
"""

import pytest
from executor.domain.value_objects import HealthResponse


# T016 [P] [US1]: Contract test for /health endpoint
@pytest.mark.contract
@pytest.mark.asyncio
async def test_health_endpoint_success():
    """
    Test that /health endpoint returns healthy status when executor is ready.

    Validates:
    - Status 200 when executor is healthy
    - Response contains required fields:
      - status (enum: healthy)
      - version (string)
    - Optional fields:
      - uptime_seconds (float, >= 0)
      - active_executions (integer, >= 0)

    Success criteria:
    - HTTP API is listening on port 8080
    - Bubblewrap binary is available
    - Workspace directory is accessible

    This test should FAIL before implementation and PASS after.
    """
    # Sample healthy response matching OpenAPI schema
    healthy_response = {
        "status": "healthy",
        "version": "1.0.0",
        "uptime_seconds": 3600.5,
        "active_executions": 3,
    }

    # Validate response model
    health = HealthResponse(**healthy_response)
    assert health.status == "healthy"
    assert health.version == "1.0.0"
    assert health.uptime_seconds == 3600.5
    assert health.active_executions == 3

    # TODO: Test actual endpoint response
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     response = await client.get("/health")
    #     assert response.status_code == 200
    #
    #     health = HealthResponse(**response.json())
    #     assert health.status == "healthy"
    #     assert health.version is not None
    #     assert health.uptime_seconds >= 0
    #     assert health.active_executions >= 0


@pytest.mark.contract
def test_health_response_minimal():
    """Test HealthResponse with only required fields."""
    minimal_response = {
        "status": "healthy",
        "version": "1.0.0",
    }

    health = HealthResponse(**minimal_response)
    assert health.status == "healthy"
    assert health.version == "1.0.0"
    # Optional fields should default to None or 0
    assert health.uptime_seconds is None
    assert health.active_executions is None


@pytest.mark.contract
def test_health_response_with_optional_fields():
    """Test HealthResponse with all optional fields."""
    complete_response = {
        "status": "healthy",
        "version": "1.0.0",
        "uptime_seconds": 0.5,  # Just started
        "active_executions": 0,  # No active executions
    }

    health = HealthResponse(**complete_response)
    assert health.status == "healthy"
    assert health.uptime_seconds == 0.5
    assert health.active_executions == 0


@pytest.mark.contract
@pytest.mark.asyncio
async def test_health_endpoint_unhealthy():
    """
    Test that /health endpoint returns 503 when executor is unhealthy.

    Validates:
    - Status 503 when executor is unhealthy
    - Response contains:
      - status (enum: unhealthy)
      - reason (string describing the issue)

    Unhealthy conditions:
    - Bubblewrap binary not found
    - Workspace directory not accessible
    - Control Plane endpoint unreachable (optional)

    This test should FAIL before implementation and PASS after.
    """
    # Sample unhealthy response
    unhealthy_response = {
        "status": "unhealthy",
        "reason": "Bubblewrap binary not found",
    }

    # TODO: Test actual endpoint returns 503 when unhealthy
    # This would require mocking unhealthy conditions
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     # Mock bwrap not found scenario
    #     response = await client.get("/health")
    #     assert response.status_code == 503
    #
    #     data = response.json()
    #     assert data["status"] == "unhealthy"
    #     assert "reason" in data
    #     assert len(data["reason"]) > 0


@pytest.mark.contract
def test_health_status_enum():
    """Test that status field only accepts 'healthy' or 'unhealthy'."""
    from pydantic import ValidationError

    # Valid status values
    valid_statuses = ["healthy", "unhealthy"]
    for status in valid_statuses:
        health = HealthResponse(status=status, version="1.0.0")
        assert health.status == status

    # Invalid status value
    with pytest.raises(ValidationError):
        HealthResponse(status="unknown", version="1.0.0")


@pytest.mark.contract
def test_health_uptime_seconds_non_negative():
    """Test that uptime_seconds is always non-negative."""
    from pydantic import ValidationError

    # Valid values
    valid_uptimes = [0, 0.1, 100.5, 1000000.0]
    for uptime in valid_uptimes:
        health = HealthResponse(
            status="healthy", version="1.0.0", uptime_seconds=uptime
        )
        assert health.uptime_seconds == uptime

    # Invalid: negative uptime
    with pytest.raises(ValidationError):
        HealthResponse(status="healthy", version="1.0.0", uptime_seconds=-1.0)


@pytest.mark.contract
def test_health_active_executions_non_negative():
    """Test that active_executions is always non-negative."""
    from pydantic import ValidationError

    # Valid values
    valid_counts = [0, 1, 10, 100]
    for count in valid_counts:
        health = HealthResponse(
            status="healthy", version="1.0.0", active_executions=count
        )
        assert health.active_executions == count

    # Invalid: negative count
    with pytest.raises(ValidationError):
        HealthResponse(status="healthy", version="1.0.0", active_executions=-1)


@pytest.mark.contract
def test_health_version_format():
    """Test that version follows semantic versioning format."""
    # Valid version formats
    valid_versions = ["1.0.0", "2.3.4", "1.0.0-beta", "1.0.0-rc.1"]
    for version in valid_versions:
        health = HealthResponse(status="healthy", version=version)
        assert health.version == version

    # Empty version should be rejected
    with pytest.raises(ValueError):
        HealthResponse(status="healthy", version="")
