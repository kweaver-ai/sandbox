import pytest
import asyncio
import os
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch, MagicMock
from sandbox_runtime.sandbox.shared_env.shared_env import (
    SharedEnv,
    get_session_dir,
    create_session,
    cleanup_tmpfs_mount,
)
from sandbox_runtime.errors import SandboxError

# 测试配置
TEST_SESSION_ID = "test-session"
TEST_SIZE = "50M"


@pytest.fixture
def shared_env():
    """创建 SharedEnv 实例"""
    return SharedEnv()


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


def test_create_session(shared_env, mock_subprocess):
    """测试创建会话"""
    session_id = shared_env.create_session(TEST_SIZE)
    assert session_id == TEST_SESSION_ID
    assert os.path.exists(get_session_dir(session_id))


def test_create_session_duplicate(shared_env, temp_session_dir):
    """测试创建重复会话"""
    with pytest.raises(SandboxError) as exc_info:
        shared_env.create_session(TEST_SIZE)
    assert "Session already exists" in str(exc_info.value)


def test_create_file(shared_env, temp_session_dir):
    """测试创建文件"""
    content = "print('Hello, World!')"
    result = shared_env.create_file(TEST_SESSION_ID, content, "test.py", 0o644)
    assert result["filename"] == "test.py"

    # 验证文件内容
    file_path = os.path.join(temp_session_dir, "test.py")
    assert os.path.exists(file_path)
    with open(file_path, "r") as f:
        assert f.read() == content


def test_list_files(shared_env, temp_session_dir):
    """测试列出文件"""
    # 创建测试文件
    test_files = ["test1.txt", "test2.txt"]
    for filename in test_files:
        with open(os.path.join(temp_session_dir, filename), "w") as f:
            f.write("test content")

    files = shared_env.list_files(TEST_SESSION_ID)
    assert len(files) == 2
    filenames = [f["name"] for f in files]
    assert all(f in filenames for f in test_files)


def test_execute_command(shared_env, temp_session_dir):
    """测试执行命令"""
    result = shared_env.execute_command(TEST_SESSION_ID, "echo", ["Hello, World!"])
    assert result["exit_code"] == 0
    assert "Hello, World!" in result["stdout"]


def test_execute_code(shared_env, temp_session_dir):
    """测试执行代码"""
    code = """
def add(a, b):
    return a + b

result = add(1, 2)
print(result)
"""
    result = shared_env.execute_code(TEST_SESSION_ID, code, "test.py", "python")
    assert result["exit_code"] == 0
    assert "3" in result["stdout"]


def test_upload_download_file(shared_env, temp_session_dir):
    """测试文件上传和下载"""
    # 创建测试文件
    test_content = "Test content for upload/download"
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
        f.write(test_content)
        temp_file_path = f.name

    try:
        # 上传文件
        with open(temp_file_path, "rb") as f:
            shared_env.upload_file(TEST_SESSION_ID, f, "test.txt")

        # 下载文件
        content = shared_env.download_file(TEST_SESSION_ID, "test.txt")
        assert content == test_content
    finally:
        os.unlink(temp_file_path)


def test_read_file(shared_env, temp_session_dir):
    """测试读取文件"""
    # 创建测试文件
    content = "Hello, World!"
    file_path = os.path.join(temp_session_dir, "test.txt")
    with open(file_path, "w") as f:
        f.write(content)

    result = shared_env.read_file(TEST_SESSION_ID, "test.txt")
    assert result["content"] == content


def test_get_status(shared_env, temp_session_dir):
    """测试获取状态"""
    status = shared_env.get_status(TEST_SESSION_ID)
    assert status["id"] == TEST_SESSION_ID
    assert status["exists"] is True


def test_error_handling(shared_env):
    """测试错误处理"""
    # 测试不存在的会话
    with pytest.raises(SandboxError) as exc_info:
        shared_env.get_status("nonexistent")
    assert "Session not found" in str(exc_info.value)

    # 测试无效的文件名
    with pytest.raises(SandboxError) as exc_info:
        shared_env.read_file(TEST_SESSION_ID, "../../etc/passwd")
    assert "Invalid filename" in str(exc_info.value)


def test_delete_session(shared_env, temp_session_dir, mock_subprocess):
    """测试删除会话"""
    shared_env.delete_session(TEST_SESSION_ID)
    assert not os.path.exists(temp_session_dir)


def test_cleanup_all(shared_env, temp_session_dir, mock_subprocess):
    """测试清理所有环境"""
    result = shared_env.cleanup_all(force=True)
    assert result["total"] >= 0
    assert result["success"] >= 0
