"""
REST API 响应模式

定义 FastAPI 的响应 Pydantic 模型。
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ResourceLimitResponse(BaseModel):
    """资源限制响应"""
    cpu: str
    memory: str
    disk: str
    max_processes: int


class SessionResponse(BaseModel):
    """会话响应"""
    id: str
    template_id: str
    status: str
    resource_limit: ResourceLimitResponse
    workspace_path: str
    runtime_type: str
    runtime_node: Optional[str] = None
    container_id: Optional[str] = None
    pod_name: Optional[str] = None
    env_vars: dict = {}
    timeout: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    last_activity_at: datetime


class ArtifactResponse(BaseModel):
    """文件制品响应"""
    path: str
    size: int
    mime_type: str
    type: str
    created_at: datetime
    checksum: Optional[str] = None


class ExecutionResponse(BaseModel):
    """执行响应"""
    id: str
    session_id: str
    status: str
    exit_code: Optional[int] = None
    error_message: Optional[str] = None
    execution_time: Optional[float] = None
    stdout: str = ""
    stderr: str = ""
    artifacts: List[ArtifactResponse] = []
    retry_count: int = 0
    created_at: datetime
    completed_at: Optional[datetime] = None


class ExecuteCodeResponse(BaseModel):
    """执行代码响应"""
    execution_id: str
    status: str = "submitted"


class ErrorResponse(BaseModel):
    """错误响应"""
    error: str
    message: str
    detail: Optional[str] = None


class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str = "healthy"
    version: str = "2.1.0"
    uptime: float
