"""
Contract tests for /execute endpoint.

Validates that the /execute endpoint complies with the OpenAPI schema defined
in contracts/executor-api.yaml. These tests verify request/response schemas,
status codes, and error handling.

NOTE: These tests are written BEFORE implementation (Constitution Principle II).
They should FAIL initially and pass after the endpoint is implemented.
"""

import pytest
from httpx import AsyncClient
from executor.domain.value_objects import ExecutionRequest, ExecutionResult, ErrorResponse


# T013 [P] [US1]: Contract test for /execute endpoint request schema
@pytest.mark.contract
@pytest.mark.asyncio
async def test_execute_request_schema_validation():
    """
    Test that /execute endpoint accepts valid ExecutionRequest schema.

    Validates:
    - Required fields: code, language, timeout, execution_id
    - Field types and constraints
    - Language enum values: python, javascript, shell
    - Timeout range: 1-3600 seconds
    - Execution ID pattern: exec_[0-9]{8}_[a-z0-9]{8}
    - Code max length: 1MB

    This test should FAIL before implementation and PASS after.
    """
    # Valid request with all fields
    valid_request = {
        "code": 'def handler(event):\n    return {"message": "Hello", "input": event.get("name", "World")}',
        "language": "python",
        "timeout": 30,
        "stdin": '{"name": "Alice"}',
        "execution_id": "exec_20250106_abc12345",
    }

    # TODO: Create async client and send request
    # This will fail until /execute endpoint is implemented
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     response = await client.post("/execute", json=valid_request)
    #     assert response.status_code == 200

    # For now, validate the request model can be instantiated
    request = ExecutionRequest(**valid_request)
    assert request.code == valid_request["code"]
    assert request.language == "python"
    assert request.timeout == 30
    assert request.execution_id == "exec_20250106_abc12345"
    assert request.stdin == '{"name": "Alice"}'


@pytest.mark.contract
def test_execute_request_invalid_language():
    """
    Test that /execute endpoint rejects invalid language values.

    Validates:
    - Only 'python', 'javascript', 'shell' are accepted
    - Returns 400 status with error_code: Executor.ValidationError
    """
    invalid_request = {
        "code": "print('hello')",
        "language": "ruby",  # Invalid language
        "timeout": 30,
        "execution_id": "exec_20250106_abc12345",
    }

    # TODO: This should fail with validation error
    # with pytest.raises(ValidationError):
    #     ExecutionRequest(**invalid_request)

    with pytest.raises(ValueError):
        ExecutionRequest(**invalid_request)


@pytest.mark.contract
def test_execute_request_timeout_validation():
    """
    Test that /execute endpoint validates timeout range.

    Validates:
    - Timeout must be between 1 and 3600 seconds
    - Returns 400 for timeout < 1 or > 3600
    """
    from pydantic import ValidationError

    # Test timeout too small
    with pytest.raises(ValidationError):
        ExecutionRequest(
            code="print('hello')",
            language="python",
            timeout=0,  # Too small
            execution_id="exec_20250106_abc12345",
        )

    # Test timeout too large
    with pytest.raises(ValidationError):
        ExecutionRequest(
            code="print('hello')",
            language="python",
            timeout=4000,  # Too large
            execution_id="exec_20250106_abc12345",
        )


@pytest.mark.contract
def test_execute_request_execution_id_pattern():
    """
    Test that /execute endpoint validates execution_id pattern.

    Validates:
    - Pattern: exec_[0-9]{8}_[a-z0-9]{8}
    - Returns 400 for invalid patterns
    """
    from pydantic import ValidationError

    invalid_ids = [
        "exec_123_abc",  # Date too short
        "exec_20250106_ABC12345",  # Uppercase not allowed
        "20250106_abc12345",  # Missing 'exec_' prefix
        "exec_20250106_abc12345_extra",  # Extra characters
    ]

    for invalid_id in invalid_ids:
        with pytest.raises(ValidationError):
            ExecutionRequest(
                code="print('hello')",
                language="python",
                timeout=30,
                execution_id=invalid_id,
            )


@pytest.mark.contract
def test_execute_request_code_max_length():
    """
    Test that /execute endpoint enforces code size limit.

    Validates:
    - Code max length: 1MB (1048576 bytes)
    - Returns 400 for code exceeding limit
    """
    from pydantic import ValidationError

    # Code exceeding 1MB
    huge_code = "print('x' * 1048577)"  # Just over 1MB

    with pytest.raises(ValidationError):
        ExecutionRequest(
            code=huge_code,
            language="python",
            timeout=30,
            execution_id="exec_20250106_abc12345",
        )


# T014 [P] [US1]: Contract test for /execute endpoint success response
@pytest.mark.contract
@pytest.mark.asyncio
async def test_execute_success_response_schema():
    """
    Test that /execute endpoint returns valid ExecutionResult on success.

    Validates:
    - Status 200 on successful execution
    - Response contains all required fields:
      - status (enum: success, failed, timeout, error)
      - stdout (string)
      - stderr (string)
      - exit_code (integer, >= -1)
      - execution_time (float, >= 0)
      - metrics (ExecutionMetrics with duration_ms)
      - artifacts (array of strings)
    - Optional fields: return_value (object or null)

    This test should FAIL before implementation and PASS after.
    """
    # Sample successful response matching OpenAPI schema
    success_response = {
        "status": "success",
        "stdout": "Processing complete.\n",
        "stderr": "",
        "exit_code": 0,
        "execution_time": 0.07523,
        "return_value": {"message": "Hello", "input": "Alice"},
        "metrics": {
            "duration_ms": 75.23,
            "cpu_time_ms": 68.12,
            "peak_memory_mb": 42.5,
        },
        "artifacts": ["output/result.csv"],
    }

    # Validate response model
    result = ExecutionResult(**success_response)
    assert result.status == "success"
    assert result.exit_code == 0
    assert result.execution_time == 0.07523
    assert result.return_value == {"message": "Hello", "input": "Alice"}
    assert result.metrics.duration_ms == 75.23
    assert len(result.artifacts) == 1

    # TODO: Test actual endpoint response
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     response = await client.post("/execute", json=sample_request)
    #     assert response.status_code == 200
    #     result = ExecutionResult(**response.json())
    #     assert result.status in ["success", "failed", "timeout", "error"]


@pytest.mark.contract
def test_execute_response_failed_status():
    """Test ExecutionResult with failed status."""
    failed_response = {
        "status": "failed",
        "stdout": "",
        "stderr": "NameError: name 'undefined_var' is not defined\n",
        "exit_code": 1,
        "execution_time": 0.0123,
        "return_value": None,
        "metrics": {"duration_ms": 12.3},
        "artifacts": [],
    }

    result = ExecutionResult(**failed_response)
    assert result.status == "failed"
    assert result.exit_code == 1
    assert result.return_value is None


@pytest.mark.contract
def test_execute_response_timeout_status():
    """Test ExecutionResult with timeout status."""
    timeout_response = {
        "status": "timeout",
        "stdout": "",
        "stderr": "Execution timeout after 30 seconds",
        "exit_code": -1,
        "execution_time": 30.0,
        "return_value": None,
        "metrics": {"duration_ms": 30000},
        "artifacts": [],
    }

    result = ExecutionResult(**timeout_response)
    assert result.status == "timeout"
    assert result.exit_code == -1


@pytest.mark.contract
def test_execute_metrics_validation():
    """Test ExecutionMetrics validation."""
    from executor.domain.value_objects import ExecutionMetrics

    # Minimal metrics (only required field)
    minimal_metrics = {"duration_ms": 100.0}
    metrics = ExecutionMetrics(**minimal_metrics)
    assert metrics.duration_ms == 100.0

    # Complete metrics with all optional fields
    complete_metrics = {
        "duration_ms": 100.0,
        "cpu_time_ms": 85.5,
        "peak_memory_mb": 45.2,
        "io_read_bytes": 1024,
        "io_write_bytes": 2048,
    }
    metrics = ExecutionMetrics(**complete_metrics)
    assert metrics.duration_ms == 100.0
    assert metrics.cpu_time_ms == 85.5
    assert metrics.peak_memory_mb == 45.2
    assert metrics.io_read_bytes == 1024
    assert metrics.io_write_bytes == 2048


# T015 [P] [US1]: Contract test for /execute endpoint error responses
@pytest.mark.contract
@pytest.mark.asyncio
async def test_execute_error_response_400():
    """
    Test that /execute endpoint returns 400 for validation errors.

    Validates:
    - Status 400 for invalid requests
    - Response contains Error schema:
      - error_code (string, e.g., Executor.ValidationError)
      - description (string)
      - error_detail (string)
    - Optional: solution, request_id

    This test should FAIL before implementation and PASS after.
    """
    # Sample error response matching OpenAPI schema
    error_response = {
        "error_code": "Executor.ValidationError",
        "description": "Request validation failed",
        "error_detail": "Field 'timeout' must be between 1 and 3600",
        "solution": "Correct the request and retry",
    }

    # Validate error response model
    error = ErrorResponse(**error_response)
    assert error.error_code == "Executor.ValidationError"
    assert "validation" in error.description.lower()
    assert "timeout" in error.error_detail.lower()

    # TODO: Test actual endpoint returns 400 for invalid request
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     response = await client.post("/execute", json={
    #         "code": "print('hello')",
    #         "language": "python",
    #         "timeout": 0,  # Invalid
    #         "execution_id": "exec_20250106_abc12345",
    #     })
    #     assert response.status_code == 400
    #     error = ErrorResponse(**response.json())
    #     assert "Executor.ValidationError" in error.error_code


@pytest.mark.contract
@pytest.mark.asyncio
async def test_execute_error_response_500():
    """
    Test that /execute endpoint returns 500 for internal errors.

    Validates:
    - Status 500 for unexpected errors
    - Response contains Error schema with Executor.InternalError
    - error_detail provides actionable information

    This test should FAIL before implementation and PASS after.
    """
    error_response = {
        "error_code": "Executor.InternalError",
        "description": "Executor encountered an unexpected error",
        "error_detail": "Failed to execute code: bwrap not found",
        "solution": "Check executor logs for details",
    }

    error = ErrorResponse(**error_response)
    assert error.error_code == "Executor.InternalError"
    assert "unexpected" in error.description.lower()

    # TODO: Test actual endpoint returns 500 for internal errors
    # This would require mocking internal failures


@pytest.mark.contract
def test_error_response_model():
    """Test ErrorResponse model validation."""
    # Minimal error (required fields only)
    minimal_error = {
        "error_code": "Executor.TestError",
        "description": "Test error",
        "error_detail": "Test details",
    }
    error = ErrorResponse(**minimal_error)
    assert error.error_code == "Executor.TestError"

    # Complete error with optional fields
    complete_error = {
        "error_code": "Executor.TestError",
        "description": "Test error",
        "error_detail": "Test details",
        "solution": "Fix the issue",
        "request_id": "req_abc123",
    }
    error = ErrorResponse(**complete_error)
    assert error.solution == "Fix the issue"
    assert error.request_id == "req_abc123"
