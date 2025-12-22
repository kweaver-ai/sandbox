from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import subprocess
import os
import shutil
import fcntl
import contextlib
from pathlib import Path
import yaml

DEFAULT_SESSION_SIZE = "50M"

router = APIRouter(prefix="/workspace/ssh/", tags=["workspace"])

class SandboxRequest(BaseModel):
    size: Optional[str] = DEFAULT_SESSION_SIZE

class CommandRequest(BaseModel):
    command: str
    timeout: Optional[int] = 30

class UploadRequest(BaseModel):
    remote_path: Optional[str] = None

class CleanupRequest(BaseModel):
    force: Optional[bool] = False

class SandboxResponse(BaseModel):
    session_id: str
    sandbox_dir: str
    size: str
    created_at: str

class CleanupResponse(BaseModel):
    total: int
    success: int
    failed: List[str]

def get_sandbox_dir(session_id: str) -> Path:
    """获取沙箱目录路径"""
    return Path("/tmp/sandbox_ssh") / session_id

def get_workspace_file() -> Path:
    """获取工作空间文件路径"""
    return Path("/tmp/sandbox_ssh.workspace")

def get_lock_file() -> Path:
    """获取锁文件路径"""
    return Path("/tmp/sandbox_ssh.lock")

@contextlib.contextmanager
def file_lock(lock_file: Path):
    """文件锁上下文管理器"""
    lock_fd = os.open(lock_file, os.O_CREAT | os.O_RDWR)
    try:
        # 获取独占锁
        fcntl.flock(lock_fd, fcntl.LOCK_EX)
        yield
    finally:
        # 释放锁
        fcntl.flock(lock_fd, fcntl.LOCK_UN)
        os.close(lock_fd)

def read_workspace_info(session_id: str) -> Optional[dict]:
    """读取工作空间信息"""
    workspace_file = get_workspace_file()
    lock_file = get_lock_file()
    
    if not workspace_file.exists():
        return None
    
    with file_lock(lock_file):
        with open(workspace_file, "r") as f:
            for line in f:
                fields = line.strip().split("\t")
                if fields[0] == session_id:
                    return {
                        "session_id": fields[0],
                        "sandbox_dir": fields[1],
                        "size": fields[2],
                        "created_at": fields[3]
                    }
    return None

def read_all_workspace_info() -> List[dict]:
    """读取所有工作空间信息"""
    workspace_file = get_workspace_file()
    lock_file = get_lock_file()
    
    if not workspace_file.exists():
        return []
    
    with file_lock(lock_file):
        with open(workspace_file, "r") as f:
            return [
                {
                    "session_id": fields[0],
                    "sandbox_dir": fields[1],
                    "size": fields[2],
                    "created_at": fields[3]
                }
                for line in f
                if (fields := line.strip().split("\t"))
            ]

def write_workspace_info(info: dict):
    """写入工作空间信息"""
    workspace_file = get_workspace_file()
    lock_file = get_lock_file()
    
    with file_lock(lock_file):
        with open(workspace_file, "a") as f:
            f.write(f"{info['session_id']}\t{info['sandbox_dir']}\t{info['size']}\t{info['created_at']}\n")

def delete_workspace_info(session_id: str):
    """删除工作空间信息"""
    workspace_file = get_workspace_file()
    lock_file = get_lock_file()
    
    if not workspace_file.exists():
        return
    
    with file_lock(lock_file):
        temp_file = workspace_file.with_suffix(".tmp")
        with open(workspace_file, "r") as f_in, open(temp_file, "w") as f_out:
            for line in f_in:
                if not line.startswith(f"{session_id}\t"):
                    f_out.write(line)
        
        temp_file.replace(workspace_file)

def clear_workspace_file():
    """清空工作空间文件"""
    workspace_file = get_workspace_file()
    lock_file = get_lock_file()
    
    with file_lock(lock_file):
        workspace_file.unlink(missing_ok=True)

@router.post("/create/{session_id}", response_model=SandboxResponse)
async def create_sandbox(session_id: str, request: SandboxRequest):
    """创建虚拟环境"""
    # 检查是否已存在
    if read_workspace_info(session_id):
        raise HTTPException(status_code=400, detail="Session already exists")
    
    # 获取脚本路径
    script_dir = Path(__file__).parent
    init_script = script_dir / "init_env.sh"
    
    try:
        # 执行初始化脚本
        result = subprocess.run(
            ["sudo", str(init_script), session_id, request.size],
            capture_output=True,
            text=True,
            check=True
        )
        
        # 解析输出获取密码
        password = None
        for line in result.stdout.splitlines():
            if line.startswith("密码: "):
                password = line.split(": ")[1]
                break
        
        if not password:
            raise HTTPException(status_code=500, detail="Failed to get password")
        
        # 获取工作空间信息
        sandbox_dir = get_sandbox_dir(session_id)
        info = {
            "session_id": session_id,
            "sandbox_dir": str(sandbox_dir),
            "size": request.size,
            "created_at": subprocess.check_output(["date", "-u", "+%Y-%m-%dT%H:%M:%SZ"]).decode().strip()
        }
        
        # 写入工作空间信息
        write_workspace_info(info)
        
        return SandboxResponse(**info)
        
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Failed to create sandbox: {e.stderr}")

@router.delete("/{session_id}")
async def delete_sandbox(session_id: str):
    """删除虚拟环境"""
    # 检查是否存在
    info = read_workspace_info(session_id)
    if not info:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        # 删除用户
        subprocess.run(["sudo", "userdel", "-r", session_id], check=True)
        
        # 卸载并删除目录
        sandbox_dir = Path(info["sandbox_dir"])
        if sandbox_dir.exists():
            subprocess.run(["sudo", "umount", str(sandbox_dir)], check=True)
            shutil.rmtree(sandbox_dir)
        
        # 删除工作空间信息
        delete_workspace_info(session_id)
        
        return {"message": "Sandbox deleted successfully"}
        
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete sandbox: {e.stderr}")

@router.post("/{session_id}/clean")
async def clean_sandbox(session_id: str):
    """清除虚拟环境内容"""
    # 检查是否存在
    info = read_workspace_info(session_id)
    if not info:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        sandbox_dir = Path(info["sandbox_dir"])
        if not sandbox_dir.exists():
            raise HTTPException(status_code=404, detail="Sandbox directory not found")
        
        # 保留基本目录结构
        for item in sandbox_dir.iterdir():
            if item.name not in ["bin", "lib", "usr", "etc", "venv"]:
                if item.is_file():
                    item.unlink()
                else:
                    shutil.rmtree(item)
        
        # 重新创建 Python 虚拟环境
        subprocess.run(
            ["sudo", "-u", session_id, "python3", "-m", "venv", str(sandbox_dir / "venv")],
            check=True
        )
        
        return {"message": "Sandbox cleaned successfully"}
        
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Failed to clean sandbox: {e.stderr}")

@router.get("/{session_id}", response_model=SandboxResponse)
async def get_sandbox(session_id: str):
    """获取虚拟环境信息"""
    info = read_workspace_info(session_id)
    if not info:
        raise HTTPException(status_code=404, detail="Session not found")
    return SandboxResponse(**info)

@router.post("/execute/{session_id}")
async def execute_command(session_id: str, request: CommandRequest):
    """执行命令"""
    # 检查会话是否存在
    info = read_workspace_info(session_id)
    if not info:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        # 执行命令
        result = subprocess.run(
            ["sudo", "-u", session_id, "bash", "-c", request.command],
            capture_output=True,
            text=True,
            timeout=request.timeout
        )
        
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Command execution timed out")
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute command: {e.stderr}")

@router.post("/upload/{session_id}")
async def upload_file(session_id: str, file: UploadFile, request: UploadRequest):
    """上传文件"""
    # 检查会话是否存在
    info = read_workspace_info(session_id)
    if not info:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        # 确定目标路径
        target_path = Path(info["sandbox_dir"])
        if request.remote_path:
            target_path = target_path / request.remote_path
        target_path = target_path / file.filename
        
        # 保存文件
        with open(target_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        return {
            "filename": file.filename,
            "size": os.path.getsize(target_path)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.post("/cleanup-all")
async def cleanup_all_sandboxes(request: CleanupRequest):
    """清理所有虚拟环境"""
    # 获取所有工作空间信息
    all_info = read_all_workspace_info()
    total = len(all_info)
    success = 0
    failed = []
    skipped = []
    
    for info in all_info:
        try:
            session_id = info["session_id"]
            sandbox_dir = Path(info["sandbox_dir"])
            
            # 检查会话是否在运行
            if not request.force and subprocess.run(["pgrep", "-f", f"python.*{session_id}"], capture_output=True).returncode == 0:
                skipped.append(f"{session_id}: 会话正在运行")
                continue
            
            # 删除用户
            subprocess.run(["sudo", "userdel", "-r", session_id], check=True)
            
            # 卸载并删除目录
            if sandbox_dir.exists():
                subprocess.run(["sudo", "umount", str(sandbox_dir)], check=True)
                shutil.rmtree(sandbox_dir)
            
            success += 1
            
        except subprocess.CalledProcessError as e:
            failed.append(f"{session_id}: {str(e)}")
        except Exception as e:
            failed.append(f"{session_id}: {str(e)}")
    
    # 清空工作空间文件
    clear_workspace_file()
    
    return CleanupResponse(
        total=total,
        success=success,
        failed=failed,
        skipped=skipped
    )

@router.get("/doc")
async def get_api_doc() -> Dict[str, Any]:
    """获取 OpenAPI 格式的 API 文档"""
    try:
        doc_path = os.path.join(os.path.dirname(__file__), "api_doc.yaml")
        with open(doc_path, "r", encoding="utf-8") as f:
            doc = yaml.safe_load(f)
        return {"result": doc}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load API documentation: {str(e)}") 