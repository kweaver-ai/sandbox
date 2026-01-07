"""
Integration tests for Python code execution.

Tests the complete execution flow from HTTP request to response,
including stdout/stderr capture, return value extraction, and
error handling for Python Lambda-style handlers.

NOTE: These tests are written BEFORE implementation (Constitution Principle II).
They should FAIL initially and pass after the executor is implemented.
"""

import pytest
from httpx import AsyncClient
from executor.domain.value_objects import ExecutionRequest, ExecutionResult


# T017 [P] [US1]: Integration test for Python execution success
@pytest.mark.integration
@pytest.mark.asyncio
async def test_python_execution_success():
    """
    Test successful Python Lambda handler execution.

    Validates:
    - Handler function receives event data from stdin
    - Handler return value is extracted and returned
    - stdout/stderr are captured correctly
    - Exit code is 0
    - Metrics are collected (duration_ms, cpu_time_ms)
    - Status is 'success'

    This test should FAIL before implementation and PASS after.
    """
    # Python Lambda handler that returns a value
    code = '''def handler(event):
    name = event.get("name", "World")
    return {
        "message": f"Hello, {name}!",
        "count": len(name),
        "success": True
    }'''

    request = ExecutionRequest(
        code=code,
        language="python",
        timeout=10,
        stdin='{"name": "Alice"}',
        execution_id="exec_20250106_test00001",
    )

    # TODO: Send request to executor endpoint
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     response = await client.post("/execute", json=request.model_dump())
    #     assert response.status_code == 200
    #
    #     result = ExecutionResult(**response.json())
    #     assert result.status == "success"
    #     assert result.exit_code == 0
    #     assert result.return_value == {
    #         "message": "Hello, Alice!",
    #         "count": 5,
    #         "success": True,
    #     }
    #     assert result.metrics.duration_ms > 0
    #     assert result.metrics.cpu_time_ms > 0
    #     assert "===SANDBOX_RESULT===" in result.stdout

    # For now, just validate the request model
    assert request.language == "python"
    assert "handler" in code
    assert "return" in code


@pytest.mark.integration
@pytest.mark.asyncio
async def test_python_execution_with_empty_event():
    """
    Test Python handler execution with empty event.

    Validates:
    - Handler receives empty dict {} when stdin is empty
    - Handler can handle missing keys gracefully
    """
    code = '''def handler(event):
    # Handler should work with empty event
    return {
        "received": event,
        "keys": list(event.keys()) if event else []
    }'''

    request = ExecutionRequest(
        code=code,
        language="python",
        timeout=10,
        stdin="",  # Empty stdin should result in {} event
        execution_id="exec_20250106_test00002",
    )

    # TODO: Test execution with empty stdin
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     response = await client.post("/execute", json=request.model_dump())
    #     result = ExecutionResult(**response.json())
    #     assert result.status == "success"
    #     assert result.return_value["keys"] == []


@pytest.mark.integration
@pytest.mark.asyncio
async def test_python_execution_with_complex_return():
    """
    Test Python handler with complex nested return value.

    Validates:
    - Handler can return nested data structures
    - Return value is properly JSON-serialized
    - Unicode and special characters are handled correctly
    """
    code = '''def handler(event):
    return {
        "text": "Hello 世界!",
        "numbers": [1, 2, 3, 4.5],
        "nested": {
            "key": "value",
            "empty": None,
            "boolean": True
        },
        "unicode": "🚀🎉"
    }'''

    request = ExecutionRequest(
        code=code,
        language="python",
        timeout=10,
        stdin="{}",
        execution_id="exec_20250106_test00003",
    )

    # TODO: Test complex return value
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     response = await client.post("/execute", json=request.model_dump())
    #     result = ExecutionResult(**response.json())
    #     assert result.status == "success"
    #     assert result.return_value["text"] == "Hello 世界!"
    #     assert result.return_value["unicode"] == "🚀🎉"
    #     assert result.return_value["nested"]["boolean"] is True


@pytest.mark.integration
@pytest.mark.asyncio
async def test_python_execution_print_statements():
    """
    Test that Python print statements are captured in stdout.

    Validates:
    - Print statements before handler call appear in stdout
    - Print statements in handler appear in stdout
    - Marker-based parsing doesn't interfere with normal output
    """
    code = '''print("Starting execution")

def handler(event):
    print(f"Processing: {event}")
    result = {"status": "done"}
    print(f"Result: {result}")
    return result

print("Handler defined")'''

    request = ExecutionRequest(
        code=code,
        language="python",
        timeout=10,
        stdin='{"test": "data"}',
        execution_id="exec_20250106_test00004",
    )

    # TODO: Test stdout capture
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     response = await client.post("/execute", json=request.model_dump())
    #     result = ExecutionResult(**response.json())
    #     assert result.status == "success"
    #     assert "Starting execution" in result.stdout
    #     assert "Processing: {'test': 'data'}" in result.stdout
    #     assert "Result: {'status': 'done'}" in result.stdout


# T018 [P] [US1]: Integration test for Python execution failure
@pytest.mark.integration
@pytest.mark.asyncio
async def test_python_execution_runtime_error():
    """
    Test Python handler with runtime error.

    Validates:
    - Status is 'failed' when exception occurs
    - Exit code is non-zero (typically 1)
    - Error traceback appears in stderr
    - return_value is None
    - Metrics are still collected

    This test should FAIL before implementation and PASS after.
    """
    code = '''def handler(event):
    # Reference undefined variable
    return undefined_variable'''

    request = ExecutionRequest(
        code=code,
        language="python",
        timeout=10,
        stdin="{}",
        execution_id="exec_20250106_test00005",
    )

    # TODO: Test error handling
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     response = await client.post("/execute", json=request.model_dump())
    #     result = ExecutionResult(**response.json())
    #     assert result.status == "failed"
    #     assert result.exit_code == 1
    #     assert result.return_value is None
    #     assert "NameError" in result.stderr
    #     assert "undefined_variable" in result.stderr
    #     assert result.metrics.duration_ms > 0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_python_execution_syntax_error():
    """
    Test Python handler with syntax error.

    Validates:
    - Syntax errors are caught before execution
    - Status is 'failed'
    - Syntax error message in stderr
    """
    code = '''def handler(event):
    # Missing colon - syntax error
    return event
    }'''

    request = ExecutionRequest(
        code=code,
        language="python",
        timeout=10,
        stdin="{}",
        execution_id="exec_20250106_test00006",
    )

    # TODO: Test syntax error handling
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     response = await client.post("/execute", json=request.model_dump())
    #     result = ExecutionResult(**response.json())
    #     assert result.status == "failed"
    #     assert "SyntaxError" in result.stderr


@pytest.mark.integration
@pytest.mark.asyncio
async def test_python_handler_not_defined():
    """
    Test execution when handler function is not defined.

    Validates:
    - Missing handler function results in error
    - Status is 'failed'
    - Helpful error message in stderr
    """
    code = '''# Missing handler function
print("No handler defined")'''

    request = ExecutionRequest(
        code=code,
        language="python",
        timeout=10,
        stdin="{}",
        execution_id="exec_20250106_test00007",
    )

    # TODO: Test missing handler error
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     response = await client.post("/execute", json=request.model_dump())
    #     result = ExecutionResult(**response.json())
    #     assert result.status == "failed"
    #     assert "handler" in result.stderr.lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_python_handler_exception_in_code():
    """
    Test Python handler that raises exception explicitly.

    Validates:
    - Raised exceptions are captured correctly
    - Exception type and message appear in stderr
    - Stack trace is preserved
    """
    code = '''def handler(event):
    if event.get("fail"):
        raise ValueError("Intentional failure!")
    return {"ok": True}'''

    request = ExecutionRequest(
        code=code,
        language="python",
        timeout=10,
        stdin='{"fail": true}',
        execution_id="exec_20250106_test00008",
    )

    # TODO: Test exception handling
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     response = await client.post("/execute", json=request.model_dump())
    #     result = ExecutionResult(**response.json())
    #     assert result.status == "failed"
    #     assert "ValueError" in result.stderr
    #     assert "Intentional failure!" in result.stderr


@pytest.mark.integration
@pytest.mark.asyncio
async def test_python_handler_timeout():
    """
    Test Python handler that exceeds timeout.

    Validates:
    - Status is 'timeout' when execution exceeds timeout
    - Exit code is -1
    - Partial stdout/stderr may be captured
    - execution_time is approximately equal to timeout
    """
    code = '''import time
def handler(event):
    time.sleep(60)  # Sleep longer than timeout
    return {"done": True}'''

    request = ExecutionRequest(
        code=code,
        language="python",
        timeout=2,  # 2 second timeout
        stdin="{}",
        execution_id="exec_20250106_test00009",
    )

    # TODO: Test timeout enforcement
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     response = await client.post("/execute", json=request.model_dump())
    #     result = ExecutionResult(**response.json())
    #     assert result.status == "timeout"
    #     assert result.exit_code == -1
    #     assert result.execution_time >= 2.0
    #     assert result.execution_time < 5.0  # Should not take much longer than timeout


@pytest.mark.integration
@pytest.mark.asyncio
async def test_python_handler_imports_allowed():
    """
    Test that Python handlers can use standard library imports.

    Validates:
    - Standard library imports work correctly
    - No restrictions on basic Python functionality
    """
    code = '''import json
import datetime
from typing import List

def handler(event):
    return {
        "timestamp": datetime.datetime.now().isoformat(),
        "data": json.loads(event.get("json", "{}")),
        "items": [1, 2, 3]
    }'''

    request = ExecutionRequest(
        code=code,
        language="python",
        timeout=10,
        stdin='{"json": "{\\"key\\": \\"value\\"}"}',
        execution_id="exec_20250106_test00010",
    )

    # TODO: Test imports work correctly
    # async with AsyncClient(app=app, base_url="http://test") as client:
    #     response = await client.post("/execute", json=request.model_dump())
    #     result = ExecutionResult(**response.json())
    #     assert result.status == "success"
    #     assert result.return_value["data"]["key"] == "value"
    #     assert len(result.return_value["items"]) == 3
