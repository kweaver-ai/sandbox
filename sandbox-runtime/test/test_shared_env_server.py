import os
import shutil
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

# fcntl 等依赖仅在类 Unix 环境可用，Windows 跳过
if sys.platform.startswith("win"):
    pytest.skip(
        "Skipping shared_env server tests on Windows (requires fcntl)",
        allow_module_level=True,
    )

from fastapi.testclient import TestClient
from sandbox_runtime.sandbox.shared_env.shared_env import (
    create_app,
    get_session_dir,
    create_session,
    cleanup_tmpfs_mount,
)
from sandbox_runtime.errors import SandboxError

# 测试配置
TEST_SESSION_ID = "test-session"
TEST_SIZE = "50M"


@pytest.fixture
def client():
    """创建测试客户端"""
    app = create_app()
    return TestClient(app)


@pytest.fixture
def temp_session_dir():
    """创建临时会话目录"""
    session_dir = get_session_dir(TEST_SESSION_ID)
    os.makedirs(session_dir, exist_ok=True)
    yield session_dir
    if os.path.exists(session_dir):
        shutil.rmtree(session_dir)


@pytest.fixture
def mock_subprocess():
    """模拟 subprocess 调用"""
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0)
        yield mock_run


def test_healthy(client):
    """测试健康检查接口"""
    response = client.get("/workspace/se/healthy")
    assert response.status_code == 200
    assert response.json()["result"] == "ok"


def test_create_session(client, mock_subprocess):
    """测试创建会话"""
    response = client.post(
        f"/workspace/se/session/{TEST_SESSION_ID}", json={"size": TEST_SIZE}
    )
    assert response.status_code == 200
    assert response.json()["result"] == TEST_SESSION_ID


def test_create_session_duplicate(client, temp_session_dir):
    """测试创建重复会话"""
    response = client.post(
        f"/workspace/se/session/{TEST_SESSION_ID}", json={"size": TEST_SIZE}
    )
    assert response.status_code == 400
    assert "Session already exists" in response.json()["detail"]


def test_create_file(client, temp_session_dir):
    """测试创建文件"""
    content = "print('Hello, World!')"
    response = client.post(
        f"/workspace/se/create/{TEST_SESSION_ID}",
        json={"content": content, "filename": "test.py", "mode": 0o644},
    )
    assert response.status_code == 200
    assert response.json()["result"]["filename"] == "test.py"

    # 验证文件内容
    file_path = os.path.join(temp_session_dir, "test.py")
    assert os.path.exists(file_path)
    with open(file_path, "r") as f:
        assert f.read() == content


def test_list_files(client, temp_session_dir):
    """测试列出文件"""
    # 创建测试文件
    test_files = ["test1.txt", "test2.txt"]
    for filename in test_files:
        with open(os.path.join(temp_session_dir, filename), "w") as f:
            f.write("test content")

    response = client.get(f"/workspace/se/files/{TEST_SESSION_ID}")
    assert response.status_code == 200
    files = response.json()["result"]["files"]
    assert len(files) == 2
    filenames = [f["name"] for f in files]
    assert all(f in filenames for f in test_files)


def test_execute_command(client, temp_session_dir):
    """测试执行命令"""
    response = client.post(
        f"/workspace/se/execute/{TEST_SESSION_ID}",
        json={"command": "echo", "args": ["Hello, World!"]},
    )
    assert response.status_code == 200
    result = response.json()["result"]
    assert result["exit_code"] == 0
    assert "Hello, World!" in result["stdout"]


def test_execute_code(client, temp_session_dir):
    """测试执行代码"""
    code = """
def add(a, b):
    return a + b

result = add(1, 2)
print(result)
"""
    response = client.post(
        f"/workspace/se/execute_code/{TEST_SESSION_ID}",
        json={"code": code, "filename": "test.py", "script_type": "python"},
    )
    assert response.status_code == 200
    result = response.json()["result"]
    assert result["exit_code"] == 0
    assert "3" in result["stdout"]


def test_upload_download_file(client, temp_session_dir):
    """测试文件上传和下载"""
    # 创建测试文件
    test_content = "Test content for upload/download"
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
        f.write(test_content)
        temp_file_path = f.name

    try:
        # 上传文件
        with open(temp_file_path, "rb") as f:
            response = client.post(
                f"/workspace/se/upload/{TEST_SESSION_ID}",
                files={"file": ("test.txt", f, "text/plain")},
            )
        assert response.status_code == 200

        # 下载文件
        response = client.get(f"/workspace/se/download/{TEST_SESSION_ID}/test.txt")
        assert response.status_code == 200
        assert response.content.decode() == test_content
    finally:
        os.unlink(temp_file_path)


def test_read_file(client, temp_session_dir):
    """测试读取文件"""
    # 创建测试文件
    content = "Hello, World!"
    file_path = os.path.join(temp_session_dir, "test.txt")
    with open(file_path, "w") as f:
        f.write(content)

    response = client.get(f"/workspace/se/readfile/{TEST_SESSION_ID}/test.txt")
    assert response.status_code == 200
    assert response.json()["result"]["content"] == content


def test_get_status(client, temp_session_dir):
    """测试获取状态"""
    response = client.get(f"/workspace/se/status/{TEST_SESSION_ID}")
    assert response.status_code == 200
    status = response.json()["result"]
    assert status["id"] == TEST_SESSION_ID
    assert status["exists"] is True


def test_error_handling(client):
    """测试错误处理"""
    # 测试不存在的会话
    response = client.get(f"/workspace/se/status/nonexistent")
    assert response.status_code == 404

    # 测试无效的文件名
    response = client.get(f"/workspace/se/readfile/{TEST_SESSION_ID}/../../etc/passwd")
    assert response.status_code == 400


def test_delete_session(client, temp_session_dir, mock_subprocess):
    """测试删除会话"""
    response = client.delete(f"/workspace/se/session/{TEST_SESSION_ID}")
    assert response.status_code == 200
    assert not os.path.exists(temp_session_dir)


def test_cleanup_all(client, temp_session_dir, mock_subprocess):
    """测试清理所有环境"""
    response = client.post("/workspace/se/cleanup-all", json={"force": True})
    assert response.status_code == 200
    result = response.json()["result"]
    assert result["total"] >= 0
    assert result["success"] >= 0
