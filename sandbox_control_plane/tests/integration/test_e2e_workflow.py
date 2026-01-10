"""
End-to-End Workflow Integration Tests

Tests for complete workflows spanning multiple API endpoints.
"""
import pytest
import asyncio
from httpx import AsyncClient
from datetime import datetime


@pytest.mark.asyncio
class TestEndToEndWorkflows:
    """End-to-end workflow integration tests."""

    async def test_full_workflow(
        self,
        http_client: AsyncClient,
        test_template_id: str,
        wait_for_execution_completion
    ):
        """Test complete workflow: Create session → Execute code → Get result → Terminate session."""
        # Step 1: Create session
        session_data = {
            "template_id": test_template_id,
            "timeout": 300,
            "cpu": "1",
            "memory": "512Mi",
            "disk": "1Gi",
            "env_vars": {}
        }

        session_response = await http_client.post("/sessions", json=session_data)
        assert session_response.status_code in (201, 200)
        session = session_response.json()
        session_id = session["id"]
        assert session["status"] in ("creating", "starting")

        # Wait for session to be ready
        for _ in range(30):
            response = await http_client.get(f"/sessions/{session_id}")
            assert response.status_code == 200
            session_data = response.json()
            if session_data["status"] in ("running", "ready"):
                break
            await asyncio.sleep(1)
        else:
            pytest.fail("Session did not become ready")

        # Step 2: Execute code
        execution_data = {
            "code": 'print("Full workflow test")\nresult = {"status": "success"}',
            "language": "python",
            "timeout": 10,
            "event": {},
            "env_vars": {}
        }

        execution_response = await http_client.post(
            f"/executions/sessions/{session_id}/execute",
            json=execution_data
        )
        assert execution_response.status_code in (201, 200)
        execution = execution_response.json()
        execution_id = execution.get("execution_id") or execution.get("id")
        assert execution_id

        # Step 3: Get execution result
        result = await wait_for_execution_completion(execution_id, timeout=30)
        assert result["status"] == "success"
        assert "Full workflow test" in result["stdout"]

        # Step 4: Terminate session
        terminate_response = await http_client.delete(f"/sessions/{session_id}")
        assert terminate_response.status_code == 200
        terminated_session = terminate_response.json()
        assert terminated_session["status"] in ("terminated", "terminating")

    async def test_multiple_executions_in_session(
        self,
        http_client: AsyncClient,
        persistent_session_id: str,
        wait_for_execution_completion
    ):
        """Test multiple executions in a persistent session."""
        execution_ids = []

        # Execute code multiple times
        for i in range(3):
            execution_data = {
                "code": f'print("Execution {i}")',
                "language": "python",
                "timeout": 10,
                "event": {},
                "env_vars": {}
            }

            response = await http_client.post(
                f"/executions/sessions/{persistent_session_id}/execute",
                json=execution_data
            )
            assert response.status_code in (201, 200)
            execution = response.json()
            execution_id = execution.get("execution_id") or execution.get("id")
            execution_ids.append(execution_id)

        # Wait for all executions to complete
        for execution_id in execution_ids:
            result = await wait_for_execution_completion(execution_id, timeout=20)
            assert result["status"] == "success"

        # Verify all executions are recorded
        list_response = await http_client.get(
            f"/executions/sessions/{persistent_session_id}/executions"
        )
        assert list_response.status_code == 200
        executions = list_response.json()
        assert len(executions) >= 3

    async def test_session_persistence_state(
        self,
        http_client: AsyncClient,
        persistent_session_id: str,
        wait_for_execution_completion
    ):
        """Test that state persists in a persistent session."""
        # First execution: Set a variable
        execution_data_1 = {
            "code": '''
# Create a file
with open("/tmp/test_state.txt", "w") as f:
    f.write("state_value_123")
print("State created")
''',
            "language": "python",
            "timeout": 10,
            "event": {},
            "env_vars": {}
        }

        response_1 = await http_client.post(
            f"/executions/sessions/{persistent_session_id}/execute",
            json=execution_data_1
        )
        assert response_1.status_code in (201, 200)
        execution_1 = response_1.json()
        execution_id_1 = execution_1.get("execution_id") or execution_1.get("id")

        result_1 = await wait_for_execution_completion(execution_id_1, timeout=20)
        assert result_1["status"] == "success"

        # Second execution: Read the file
        execution_data_2 = {
            "code": '''
with open("/tmp/test_state.txt", "r") as f:
    value = f.read()
print(f"State value: {value}")
''',
            "language": "python",
            "timeout": 10,
            "event": {},
            "env_vars": {}
        }

        response_2 = await http_client.post(
            f"/executions/sessions/{persistent_session_id}/execute",
            json=execution_data_2
        )
        assert response_2.status_code in (201, 200)
        execution_2 = response_2.json()
        execution_id_2 = execution_2.get("execution_id") or execution_2.get("id")

        result_2 = await wait_for_execution_completion(execution_id_2, timeout=20)
        assert result_2["status"] == "success"
        assert "state_value_123" in result_2["stdout"]

    async def test_concurrent_sessions(
        self,
        http_client: AsyncClient,
        test_template_id: str
    ):
        """Test creating multiple sessions concurrently."""
        session_ids = []

        # Create multiple sessions concurrently
        tasks = []
        for _ in range(3):
            session_data = {
                "template_id": test_template_id,
                "timeout": 300,
                "cpu": "1",
                "memory": "512Mi",
                "disk": "1Gi",
                "env_vars": {}
            }
            tasks.append(http_client.post("/sessions", json=session_data))

        responses = await asyncio.gather(*tasks)

        for response in responses:
            assert response.status_code in (201, 200)
            session = response.json()
            session_ids.append(session["id"])

        # Wait for all sessions to be ready
        for session_id in session_ids:
            for _ in range(30):
                response = await http_client.get(f"/sessions/{session_id}")
                if response.status_code == 200:
                    session_data = response.json()
                    if session_data["status"] in ("running", "ready"):
                        break
                await asyncio.sleep(1)

        # Verify all sessions exist
        for session_id in session_ids:
            response = await http_client.get(f"/sessions/{session_id}")
            assert response.status_code == 200

        # Cleanup: Terminate all sessions
        for session_id in session_ids:
            await http_client.delete(f"/sessions/{session_id}")

    async def test_template_lifecycle_workflow(
        self,
        http_client: AsyncClient
    ):
        """Test complete template lifecycle: Create → Use → Update → Delete."""
        # Step 1: Create template
        template_data = {
            "id": "test_lifecycle_template",
            "name": "Lifecycle Test Template",
            "image_url": "sandbox-template-python-basic:latest",
            "runtime_type": "python3.11",
            "default_cpu_cores": 1.0,
            "default_memory_mb": 512,
            "default_disk_mb": 1024
        }

        create_response = await http_client.post("/templates", json=template_data)
        assert create_response.status_code in (201, 200)
        template = create_response.json()
        template_id = template["id"]

        # Step 2: Use template to create a session
        session_data = {
            "template_id": template_id,
            "timeout": 300
        }

        session_response = await http_client.post("/sessions", json=session_data)
        # Session creation might fail if image doesn't exist, that's okay for this test
        if session_response.status_code in (201, 200):
            session = session_response.json()
            session_id = session["id"]

            # Terminate the session
            await http_client.delete(f"/sessions/{session_id}")

        # Step 3: Update template
        update_response = await http_client.put(
            f"/templates/{template_id}",
            json={"name": "Updated Lifecycle Template"}
        )
        assert update_response.status_code in (200, 202)

        # Verify update
        get_response = await http_client.get(f"/templates/{template_id}")
        assert get_response.status_code == 200
        updated_template = get_response.json()
        assert updated_template["name"] == "Updated Lifecycle Template"

        # Step 4: Delete template
        delete_response = await http_client.delete(f"/templates/{template_id}")
        assert delete_response.status_code in (200, 202, 204)

        # Verify deletion
        verify_response = await http_client.get(f"/templates/{template_id}")
        assert verify_response.status_code == 404

    async def test_error_handling_workflow(
        self,
        http_client: AsyncClient,
        test_template_id: str
    ):
        """Test error handling throughout the workflow."""
        # Try to create session with invalid template
        invalid_session_data = {
            "template_id": "invalid_template_xyz",
            "timeout": 300
        }

        response = await http_client.post("/sessions", json=invalid_session_data)
        assert response.status_code == 404

        # Create valid session
        valid_session_data = {
            "template_id": test_template_id,
            "timeout": 300
        }

        session_response = await http_client.post("/sessions", json=valid_session_data)
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

        # Try to execute invalid code
        invalid_execution_data = {
            "code": "this is not valid python [[[",
            "language": "python",
            "timeout": 10,
            "event": {},
            "env_vars": {}
        }

        execution_response = await http_client.post(
            f"/executions/sessions/{session_id}/execute",
            json=invalid_execution_data
        )
        assert execution_response.status_code in (201, 200)

        execution = execution_response.json()
        execution_id = execution.get("execution_id") or execution.get("id")

        # Wait for execution to complete (should fail)
        for _ in range(20):
            response = await http_client.get(f"/executions/{execution_id}/result")
            if response.status_code == 200:
                result = response.json()
                if result["status"] in ("failed", "success", "timeout", "crashed"):
                    assert result["status"] == "failed"
                    break
            await asyncio.sleep(1)

        # Cleanup
        await http_client.delete(f"/sessions/{session_id}")

    async def test_execution_with_file_operations(
        self,
        http_client: AsyncClient,
        persistent_session_id: str,
        wait_for_execution_completion
    ):
        """Test execution that creates and reads files."""
        # Create a file via execution
        execution_data = {
            "code": '''
import os

# Create a directory
os.makedirs("/workspace/test_dir", exist_ok=True)

# Write a file
with open("/workspace/test_dir/test.txt", "w") as f:
    f.write("Hello from file!")

# Read the file back
with open("/workspace/test_dir/test.txt", "r") as f:
    content = f.read()

print(f"File content: {content}")
''',
            "language": "python",
            "timeout": 10,
            "event": {},
            "env_vars": {}
        }

        response = await http_client.post(
            f"/executions/sessions/{persistent_session_id}/execute",
            json=execution_data
        )
        assert response.status_code in (201, 200)
        execution = response.json()
        execution_id = execution.get("execution_id") or execution.get("id")

        result = await wait_for_execution_completion(execution_id, timeout=20)
        assert result["status"] == "success"
        assert "Hello from file!" in result["stdout"]
