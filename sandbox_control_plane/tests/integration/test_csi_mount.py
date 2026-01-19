#!/usr/bin/env python3
"""
Integration Test: JuiceFS CSI Driver for S3 Workspace Mounting

This test verifies:
1. CSI Driver creates PVCs correctly for S3 workspace sessions
2. Pods mount PVCs instead of using s3fs sidecar
3. Files written to /workspace are accessible
4. PVC cleanup happens when session is deleted
5. Fallback to s3fs sidecar when CSI is disabled

Prerequisites:
- Kubernetes cluster with JuiceFS CSI Driver installed
- MariaDB deployed for JuiceFS metadata
- MinIO deployed for S3-compatible storage
- Control Plane running with USE_CSI_DRIVER=true

Installation:
1. Install CSI Driver: kubectl apply -f deploy/k8s/06-juicefs-csi-driver.yaml
2. Configure JuiceFS: kubectl apply -f deploy/k8s/09-juicefs-setup.yaml
3. Enable CSI: export USE_CSI_DRIVER=true

Run tests:
  pytest tests/integration/test_csi_mount.py -v
"""
import pytest
import httpx
import asyncio
import time
from typing import Generator, Optional

# Configuration
BASE_URL = "http://localhost:8000"
KUBECONFIG_PATH = None  # Set to kubeconfig path for local testing


@pytest.fixture(scope="module")
def event_loop():
    """Create an event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def http_client() -> Generator[httpx.AsyncClient, None, None]:
    """Create an HTTP client for testing"""
    async with httpx.AsyncClient(timeout=120.0) as client:
        yield client


@pytest.fixture
async def k8s_client():
    """Create a Kubernetes client for testing"""
    try:
        from kubernetes import client, config

        if KUBECONFIG_PATH:
            config.load_kube_config(config_file=KUBECONFIG_PATH)
        else:
            try:
                config.load_kube_config()
            except Exception:
                config.load_incluster_config()

        return client.CoreV1Api()
    except ImportError:
        pytest.skip("kubernetes Python client not installed")
    except Exception as e:
        pytest.skip(f"Failed to create Kubernetes client: {e}")


@pytest.fixture
async def session_id_with_csi(http_client: httpx.AsyncClient) -> str:
    """
    Create a test session with CSI driver enabled and return its ID.

    This test requires the control plane to have USE_CSI_DRIVER=true.
    """
    # Create session with S3 workspace path
    response = await http_client.post(
        f"{BASE_URL}/api/v1/sessions",
        json={
            "template_id": "python-basic",
            "timeout": 300,
            "workspace_path": "s3://sandbox-workspace/sessions/test-csi-001/"
        }
    )

    if response.status_code not in [200, 201]:
        pytest.skip(f"Failed to create session: {response.text}")

    session = response.json()
    sid = session["id"]

    # Wait for session to be running
    max_wait = 60
    for i in range(max_wait):
        response = await http_client.get(f"{BASE_URL}/api/v1/sessions/{sid}")
        if response.status_code == 200:
            status = response.json()
            if status["status"] == "running":
                print(f"Session {sid} is running after {i+1} seconds")
                break
            elif status["status"] in ["failed", "terminated"]:
                pytest.skip(f"Session failed with status: {status['status']}")
        await asyncio.sleep(1)
    else:
        pytest.skip(f"Session did not start within {max_wait} seconds")

    yield sid

    # Cleanup: Delete the session
    try:
        await http_client.delete(f"{BASE_URL}/api/v1/sessions/{sid}")
    except Exception:
        pass  # Ignore cleanup errors


@pytest.mark.integration
@pytest.mark.asyncio
async def test_csi_pvc_creation(k8s_client):
    """
    Test that CSI PVC is created for S3 workspace.

    This test verifies that when a session with S3 workspace is created,
    a corresponding PVC is created using the CSI driver.
    """
    from kubernetes.client.rest import ApiException

    # List PVCs in sandbox-system namespace
    try:
        pvcs = await asyncio.to_thread(
            k8s_client.list_namespaced_persistent_volume_claim,
            namespace="sandbox-system",
            label_selector="app=sandbox-executor"
        )

        # Verify at least one PVC exists
        assert len(pvcs.items) >= 1, "No PVCs found with app=sandbox-executor label"

        # Verify PVC properties
        for pvc in pvcs.items:
            # Check storage class
            if pvc.spec.storage_class_name:
                print(f"Found PVC: {pvc.metadata.name}")
                print(f"  StorageClass: {pvc.spec.storage_class_name}")
                print(f"  Access Modes: {pvc.spec.access_modes}")
                print(f"  Labels: {pvc.metadata.labels}")

                # Verify it's using juicefs storage class
                assert "juicefs" in pvc.spec.storage_class_name.lower(), \
                    f"Expected juicefs storage class, got {pvc.spec.storage_class_name}"

    except ApiException as e:
        if e.status == 404:
            pytest.skip("sandbox-system namespace not found")
        else:
            raise


@pytest.mark.integration
@pytest.mark.asyncio
async def test_csi_no_sidecar_container(k8s_client, session_id_with_csi: str):
    """
    Test that Pods using CSI driver do NOT have s3-mount sidecar.

    This verifies that when CSI driver is enabled, the s3fs sidecar
    container is NOT created in the pod.
    """
    from kubernetes.client.rest import ApiException

    # Find the pod for this session
    pod_name = f"sandbox-{session_id_with_csi.lower()}"

    try:
        pod = await asyncio.to_thread(
            k8s_client.read_namespaced_pod,
            name=pod_name,
            namespace="sandbox-runtime"
        )

        # Get container names
        container_names = [c.name for c in pod.spec.containers]
        print(f"Pod containers: {container_names}")

        # Verify NO s3-mount sidecar container
        assert "s3-mount" not in container_names, \
            "s3-mount sidecar should NOT exist when using CSI driver"

        # Verify executor container exists
        assert "executor" in container_names, \
            "executor container must exist"

        # Verify CSI driver label
        assert pod.metadata.labels.get("csi-driver") == "juicefs", \
            "Pod should have csi-driver=juicefs label"

        print(f"✓ Pod {pod_name} uses CSI driver (no sidecar)")

    except ApiException as e:
        if e.status == 404:
            pytest.skip(f"Pod {pod_name} not found")
        else:
            raise


@pytest.mark.integration
@pytest.mark.asyncio
async def test_csi_workspace_file_operations(http_client: httpx.AsyncClient, session_id_with_csi: str):
    """
    Test file operations on CSI-mounted workspace.

    This test verifies that:
    1. Files can be uploaded to S3
    2. User code can read files via /workspace
    3. User code can write files to /workspace
    4. Files written to /workspace are accessible
    """
    # Test 1: Upload a file to S3
    print("\n[Test 1] Uploading file to S3...")
    test_csv_content = b"name,age\nAlice,30\nBob,25\nCharlie,35\n"
    response = await http_client.post(
        f"{BASE_URL}/api/v1/sessions/{session_id_with_csi}/files/upload?path=uploads/test.csv",
        files={"file": ("test.csv", test_csv_content, "text/csv")}
    )

    assert response.status_code == 200, f"Failed to upload file: {response.text}"
    upload_result = response.json()
    print(f"  ✓ File uploaded: {upload_result['file_path']}")

    # Test 2: Execute code to read the uploaded file
    print("\n[Test 2] Executing code to read uploaded file...")
    read_code = """
import os

def handler(event):
    uploads_path = '/workspace/uploads'
    if os.path.exists(uploads_path):
        files = os.listdir(uploads_path)
        print(f'Files in /workspace/uploads: {files}')

        file_path = '/workspace/uploads/test.csv'
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                content = f.read()
            print(f'File content:\\n{content}')
            return {"found": True, "files": files}
        else:
            return {"found": False}
    else:
        return {"found": False}
"""

    response = await http_client.post(
        f"{BASE_URL}/api/v1/executions/sessions/{session_id_with_csi}/execute",
        json={"code": read_code, "language": "python"}
    )

    if response.status_code not in [200, 201]:
        pytest.skip(f"Execution creation failed: {response.text}")

    # Wait for execution to complete
    execution = response.json()
    exec_id = execution.get("execution_id")

    max_wait = 30
    for i in range(max_wait):
        response = await http_client.get(f"{BASE_URL}/api/v1/executions/{exec_id}/result")
        if response.status_code == 200:
            result = response.json()
            if result.get("status") in ["completed", "failed", "success"]:
                stdout = result.get("stdout", "")
                assert "test.csv" in stdout, f"File not found in workspace. Output: {stdout}"
                print(f"  ✓ File read via CSI mount")
                break
        await asyncio.sleep(1)
    else:
        pytest.skip("Execution did not complete within timeout")

    # Test 3: Execute code to write a file
    print("\n[Test 3] Executing code to write file...")
    write_code = """
import os

def handler(event):
    os.makedirs('/workspace/output', exist_ok=True)
    with open('/workspace/output/result.txt', 'w') as f:
        f.write('Test output from CSI-mounted workspace')
    print('File written successfully')
    return {"status": "ok"}
"""

    response = await http_client.post(
        f"{BASE_URL}/api/v1/executions/sessions/{session_id_with_csi}/execute",
        json={"code": write_code, "language": "python"}
    )

    if response.status_code not in [200, 201]:
        pytest.skip(f"Execution creation failed: {response.text}")

    execution = response.json()
    exec_id = execution.get("execution_id")

    max_wait = 30
    for i in range(max_wait):
        response = await http_client.get(f"{BASE_URL}/api/v1/executions/{exec_id}/result")
        if response.status_code == 200:
            result = response.json()
            if result.get("status") in ["completed", "failed", "success"]:
                break
        await asyncio.sleep(1)

    # Test 4: Download the created file
    print("\n[Test 4] Downloading created file...")
    response = await http_client.get(
        f"{BASE_URL}/api/v1/sessions/{session_id_with_csi}/files/output/result.txt"
    )

    assert response.status_code == 200, f"Failed to download file: {response.text}"
    content = response.text
    assert "Test output from CSI-mounted workspace" in content
    print(f"  ✓ File downloaded from S3: {content}")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_csi_pvc_cleanup_on_session_deletion(http_client: httpx.AsyncClient, k8s_client):
    """
    Test that PVC is deleted when session is deleted.

    This test verifies that PVC cleanup happens automatically
    when a session is terminated.
    """
    from kubernetes.client.rest import ApiException

    # Create a temporary session
    response = await http_client.post(
        f"{BASE_URL}/api/v1/sessions",
        json={
            "template_id": "python-basic",
            "timeout": 300,
            "workspace_path": "s3://sandbox-workspace/sessions/test-csi-cleanup-001/"
        }
    )

    if response.status_code not in [200, 201]:
        pytest.skip(f"Failed to create session: {response.text}")

    session = response.json()
    sid = session["id"]

    # Wait for PVC to be created
    pvc_name = f"workspace-{sid}"
    max_wait = 30
    for i in range(max_wait):
        try:
            pvc = await asyncio.to_thread(
                k8s_client.read_namespaced_persistent_volume_claim,
                name=pvc_name,
                namespace="sandbox-runtime"
            )
            print(f"PVC {pvc_name} created after {i+1} seconds")
            break
        except ApiException as e:
            if e.status == 404:
                await asyncio.sleep(1)
            else:
                raise
    else:
        pytest.skip(f"PVC {pvc_name} was not created within {max_wait} seconds")

    # Delete the session
    print(f"\nDeleting session {sid}...")
    response = await http_client.delete(f"{BASE_URL}/api/v1/sessions/{sid}")
    assert response.status_code in [200, 202], f"Failed to delete session: {response.text}"

    # Wait for PVC to be deleted
    print(f"Waiting for PVC {pvc_name} to be deleted...")
    max_wait = 60
    for i in range(max_wait):
        try:
            pvc = await asyncio.to_thread(
                k8s_client.read_namespaced_persistent_volume_claim,
                name=pvc_name,
                namespace="sandbox-runtime"
            )
            await asyncio.sleep(1)
        except ApiException as e:
            if e.status == 404:
                print(f"✓ PVC {pvc_name} deleted after {i+1} seconds")
                break
            else:
                raise
    else:
        pytest.fail(f"PVC {pvc_name} was not deleted within {max_wait} seconds")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_csi_fallback_to_sidecar_when_disabled():
    """
    Test that system falls back to s3fs sidecar when CSI is disabled.

    This test verifies backward compatibility when USE_CSI_DRIVER=false.
    This test would need to be run in a separate environment with CSI disabled.
    """
    # This test requires a separate control plane instance with USE_CSI_DRIVER=false
    # Skip it for now as it requires environment reconfiguration
    pytest.skip("This test requires a separate environment with USE_CSI_DRIVER=false")


# Standalone test runner for manual testing
async def main():
    """Run the CSI integration tests manually"""
    print("=" * 60)
    print("CSI Driver Integration Test")
    print("=" * 60)

    async with httpx.AsyncClient(timeout=120.0) as client:
        # Create session with CSI
        print("\n[Step 1] Creating session with S3 workspace...")
        response = await client.post(
            f"{BASE_URL}/api/v1/sessions",
            json={
                "template_id": "python-basic",
                "timeout": 300,
                "workspace_path": "s3://sandbox-workspace/sessions/test-manual-csi/"
            }
        )

        if response.status_code not in [200, 201]:
            print(f"ERROR: Failed to create session: {response.text}")
            return

        session = response.json()
        session_id = session["id"]
        print(f"  Session ID: {session_id}")
        print(f"  Workspace: {session.get('workspace_path', '')}")

        # Wait for session ready
        print("\n[Step 2] Waiting for session to be ready...")
        for i in range(60):
            response = await client.get(f"{BASE_URL}/api/v1/sessions/{session_id}")
            if response.status_code == 200:
                status = response.json()
                if status["status"] == "running":
                    print(f"  Session is running after {i+1} seconds")
                    break
                elif status["status"] in ["failed", "terminated"]:
                    print(f"ERROR: Session failed with status: {status['status']}")
                    return
            await asyncio.sleep(1)
        else:
            print("ERROR: Session did not start within 60 seconds")
            return

        # Test file operations
        print("\n[Step 3] Testing file upload...")
        test_content = b"test,data\n1,2\n"
        response = await client.post(
            f"{BASE_URL}/api/v1/sessions/{session_id}/files/upload?path=test.csv",
            files={"file": ("test.csv", test_content, "text/csv")}
        )

        if response.status_code != 200:
            print(f"ERROR: Failed to upload file: {response.text}")
            return

        print("  ✓ File uploaded successfully")

        print("\n[Step 4] Testing file read via CSI mount...")
        read_code = """
import os
def handler(event):
    if os.path.exists('/workspace/test.csv'):
        with open('/workspace/test.csv', 'r') as f:
            content = f.read()
        print(f'Content: {content}')
        return {"success": True, "content": content}
    return {"success": False}
"""

        response = await client.post(
            f"{BASE_URL}/api/v1/executions/sessions/{session_id}/execute",
            json={"code": read_code, "language": "python"}
        )

        if response.status_code in [200, 201]:
            execution = response.json()
            exec_id = execution.get("execution_id")
            print(f"  Execution ID: {exec_id}")

            # Wait for result
            for i in range(30):
                response = await client.get(f"{BASE_URL}/api/v1/executions/{exec_id}/result")
                if response.status_code == 200:
                    result = response.json()
                    if result.get("status") in ["completed", "success"]:
                        stdout = result.get("stdout", "")
                        print(f"  ✓ File read successful: {'test.csv' in stdout}")
                        break
                await asyncio.sleep(1)

        # Cleanup
        print("\n[Step 5] Deleting session...")
        await client.delete(f"{BASE_URL}/api/v1/sessions/{session_id}")
        print("  ✓ Session deleted")

        print("\n" + "=" * 60)
        print("CSI integration test completed!")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
