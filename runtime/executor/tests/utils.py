"""
Test utilities for sandbox-executor tests.

Provides helper functions for mock servers, temporary directories, and test execution.
"""

import tempfile
import shutil
import asyncio
from pathlib import Path
from typing import Generator, Optional
import httpx
from contextlib import asynccontextmanager


@asynccontextmanager
async def mock_http_server(port: int = 9999):
    """
    Create a mock HTTP server for testing.

    Args:
        port: Port to listen on

    Yields:
        Base URL for the mock server
    """
    # This is a simple mock - in real tests, you might use httpx.MockTransport
    # or a more sophisticated mock server
    yield f"http://localhost:{port}"


@asynccontextmanager
async def temporary_workspace() -> Generator[Path, None, None]:
    """
    Create a temporary workspace directory.

    Yields:
        Path to temporary workspace
    """
    workspace = Path(tempfile.mkdtemp(prefix="sandbox_workspace_"))
    try:
        yield workspace
    finally:
        shutil.rmtree(workspace, ignore_errors=True)


def create_test_file(workspace: Path, path: str, content: str = "") -> Path:
    """
    Create a test file in the workspace.

    Args:
        workspace: Workspace directory
        path: Relative path for the file
        content: File content

    Returns:
        Path to created file
    """
    file_path = workspace / path
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content)
    return file_path


async def wait_for_condition(
    condition: callable, timeout: float = 5.0, interval: float = 0.1
) -> bool:
    """
    Wait for a condition to become true.

    Args:
        condition: Callable that returns bool
        timeout: Maximum wait time in seconds
        interval: Check interval in seconds

    Returns:
        True if condition became true, False if timeout
    """
    start = asyncio.get_event_loop().time()
    while (asyncio.get_event_loop().time() - start) < timeout:
        if condition():
            return True
        await asyncio.sleep(interval)
    return False


class MockControlPlaneServer:
    """
    Mock Control Plane server for testing callbacks.
    """

    def __init__(self):
        self.results = []
        self.heartbeats = []
        self.ready_events = []
        self.exited_events = []

    async def handle_result(self, execution_id: str, result: dict) -> httpx.Response:
        """Handle result callback."""
        self.results.append({"execution_id": execution_id, "result": result})
        response = httpx.Response(200, json={"message": "Result recorded"})
        return response

    async def handle_heartbeat(self, execution_id: str, data: dict) -> httpx.Response:
        """Handle heartbeat callback."""
        self.heartbeats.append({"execution_id": execution_id, "data": data})
        response = httpx.Response(200, json={"message": "Heartbeat recorded"})
        return response

    async def handle_container_ready(self, session_id: str, data: dict) -> httpx.Response:
        """Handle container_ready callback."""
        self.ready_events.append({"session_id": session_id, "data": data})
        response = httpx.Response(200, json={"message": "Ready event recorded"})
        return response

    async def handle_container_exited(self, session_id: str, data: dict) -> httpx.Response:
        """Handle container_exited callback."""
        self.exited_events.append({"session_id": session_id, "data": data})
        response = httpx.Response(200, json={"message": "Exited event recorded"})
        return response

    def reset(self):
        """Reset all tracked events."""
        self.results.clear()
        self.heartbeats.clear()
        self.ready_events.clear()
        self.exited_events.clear()
