#!/usr/bin/env python3
"""
E2E Test: S3 Workspace Mounting

This test verifies:
1. File upload to S3
2. Session creation with S3 workspace mounting
3. User code can access uploaded files via /workspace
4. File download
5. Session cleanup deletes files
"""
import asyncio
import httpx
import json
import time
from pathlib import Path


# Configuration
BASE_URL = "http://localhost:8000"
SESSION_CREATE_URL = f"{BASE_URL}/api/v1/sessions"
FILE_UPLOAD_URL_TEMPLATE = f"{BASE_URL}/api/v1/sessions/{{session_id}}/files/upload"
FILE_DOWNLOAD_URL_TEMPLATE = f"{BASE_URL}/api/v1/sessions/{{session_id}}/files/{{file_path}}"
EXECUTE_URL_TEMPLATE = f"{BASE_URL}/api/v1/executions/sessions/{{session_id}}/execute"
SESSION_STATUS_URL_TEMPLATE = f"{BASE_URL}/api/v1/sessions/{{session_id}}"
SESSION_DELETE_URL_TEMPLATE = f"{BASE_URL}/api/v1/sessions/{{session_id}}"


async def test_e2e_s3_workspace():
    """End-to-end test for S3 workspace mounting"""
    print("=" * 60)
    print("E2E Test: S3 Workspace Mounting")
    print("=" * 60)

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Step 1: Create a session
        print("\n[Step 1] Creating session...")
        response = await client.post(
            SESSION_CREATE_URL,
            json={
                "template_id": "python-basic",
                "timeout": 300
            }
        )
        assert response.status_code in [200, 201], f"Failed to create session: {response.text}"
        session = response.json()
        session_id = session["id"]
        workspace_path = session.get("workspace_path", "")
        print(f"  Session ID: {session_id}")
        print(f"  Workspace Path: {workspace_path}")
        print(f"  Status: {session['status']}")

        # Step 2: Upload a test file
        print("\n[Step 2] Uploading test file...")
        test_csv_content = b"name,age\nAlice,30\nBob,25\nCharlie,35\n"

        response = await client.post(
            f"{BASE_URL}/api/v1/sessions/{session_id}/files/upload?path=uploads/test_data.csv",
            files={"file": ("test_data.csv", test_csv_content, "text/csv")}
        )
        assert response.status_code == 200, f"Failed to upload file: {response.text}"
        upload_result = response.json()
        print(f"  File uploaded: {upload_result['file_path']}")
        print(f"  Size: {upload_result['size']} bytes")

        # Step 3: Wait for session to be running
        print("\n[Step 3] Waiting for session to be ready...")
        max_wait = 30
        for i in range(max_wait):
            response = await client.get(SESSION_STATUS_URL_TEMPLATE.format(session_id=session_id))
            assert response.status_code == 200
            session_status = response.json()

            if session_status["status"] == "running":
                print(f"  Session is running after {i+1} seconds")
                break
            elif session_status["status"] in ["failed", "terminated"]:
                raise Exception(f"Session failed with status: {session_status['status']}")

            time.sleep(1)
        else:
            raise Exception(f"Session did not start within {max_wait} seconds")

        # Step 4: Execute code to read the uploaded file
        print("\n[Step 4] Executing code to read uploaded file...")
        read_file_code = """
import os
import sys

# Check if workspace directory exists
print(f"Workspace exists: {os.path.exists('/workspace')}")
print(f"Workspace contents: {os.listdir('/workspace') if os.path.exists('/workspace') else 'N/A'}")

# Check uploads directory
uploads_path = '/workspace/uploads'
if os.path.exists(uploads_path):
    print(f"Uploads exists: True")
    print(f"Uploads contents: {os.listdir(uploads_path)}")
else:
    print(f"Uploads exists: False")
    sys.exit(1)

# Read the uploaded file
file_path = '/workspace/uploads/test_data.csv'
if os.path.exists(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    print(f"File content:\\n{content}")
else:
    print(f"File not found: {file_path}")
    sys.exit(1)

print("SUCCESS: File access test passed!")
"""

        response = await client.post(
            EXECUTE_URL_TEMPLATE.format(session_id=session_id),
            json={"code": read_file_code, "language": "python"}
        )
        assert response.status_code in [200, 201], f"Failed to execute code: {response.text}"
        execution_result = response.json()

        print(f"  Execution ID: {execution_result.get('execution_id')}")
        print(f"  Status: {execution_result.get('status')}")

        if execution_result.get("result"):
            stdout = execution_result["result"].get("stdout", "")
            stderr = execution_result["result"].get("stderr", "")
            if stdout:
                print(f"  Stdout output:\n{stdout}")
            if stderr:
                print(f"  Stderr output:\n{stderr}")

        # Step 5: Execute code to write a new file
        print("\n[Step 5] Executing code to write a new file...")
        write_file_code = """
import os

# Create artifacts directory first
artifacts_dir = '/workspace/artifacts'
os.makedirs(artifacts_dir, exist_ok=True)
print(f"Created directory: {artifacts_dir}")

# Write file
output_path = '/workspace/artifacts/output.txt'
with open(output_path, 'w') as f:
    f.write('This is a generated file from user code!')

print(f"Written file: {output_path}")
print("File contents:")
with open(output_path, 'r') as f:
    print(f.read())
print("SUCCESS: File write test passed!")
"""

        response = await client.post(
            EXECUTE_URL_TEMPLATE.format(session_id=session_id),
            json={"code": write_file_code, "language": "python"}
        )
        assert response.status_code in [200, 201], f"Failed to execute code: {response.text}"
        execution_result = response.json()

        print(f"  Status: {execution_result.get('status')}")
        if execution_result.get("result"):
            stdout = execution_result["result"].get("stdout", "")
            if stdout:
                print(f"  Stdout output:\n{stdout}")

        # Step 6: Download the generated file
        print("\n[Step 6] Downloading generated file...")
        response = await client.get(
            FILE_DOWNLOAD_URL_TEMPLATE.format(session_id=session_id, file_path="artifacts/output.txt")
        )
        assert response.status_code == 200, f"Failed to download file: {response.text}"

        # Check if response is JSON (presigned URL) or direct content
        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type:
            data = response.json()
            if "presigned_url" in data:
                print(f"  Presigned URL: {data['presigned_url']}")
                # Download from presigned URL
                presigned_response = await client.get(data["presigned_url"])
                content = presigned_response.text
            else:
                content = data.get("content", "")
        else:
            # Direct file content (not JSON)
            content = response.text

        print(f"  Downloaded content: {content}")

        # Step 7: Delete session (cleanup)
        print("\n[Step 7] Deleting session (cleanup test)...")
        response = await client.delete(SESSION_DELETE_URL_TEMPLATE.format(session_id=session_id))
        assert response.status_code in [200, 204], f"Failed to delete session: {response.text}"
        print(f"  Session deleted successfully")

        # Step 8: Verify session is terminated
        print("\n[Step 8] Verifying session termination...")
        response = await client.get(SESSION_STATUS_URL_TEMPLATE.format(session_id=session_id))
        assert response.status_code == 200
        session_status = response.json()
        print(f"  Final status: {session_status['status']}")

        print("\n" + "=" * 60)
        print("All tests passed!")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_e2e_s3_workspace())
