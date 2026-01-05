"""
REST API 请求模式

定义 FastAPI 的请求 Pydantic 模型。
"""
from pydantic import BaseModel, Field, validator
from typing import Literal, Optional, Dict


class CreateSessionRequest(BaseModel):
    """创建会话请求"""
    template_id: str = Field(..., description="模板 ID")
    timeout: int = Field(300, ge=1, le=3600, description="超时时间（秒）")
    cpu: str = Field("1", description="CPU 核心数")
    memory: str = Field("512Mi", description="内存限制")
    disk: str = Field("1Gi", description="磁盘限制")
    env_vars: Dict[str, str] = Field(default_factory=dict, description="环境变量")

    @validator("cpu")
    def validate_cpu(cls, v):
        try:
            float(v)
        except ValueError:
            raise ValueError("Invalid cpu format")
        return v


class ExecuteCodeRequest(BaseModel):
    """执行代码请求"""
    code: str = Field(..., description="要执行的代码")
    language: Literal["python", "javascript", "shell"] = Field(
        ..., description="编程语言"
    )
    async_mode: bool = Field(False, description="是否异步执行")
    stdin: Optional[str] = Field(None, description="标准输入")
    timeout: int = Field(30, ge=1, le=300, description="执行超时（秒）")


class TerminateSessionRequest(BaseModel):
    """终止会话请求"""
    reason: Optional[str] = Field(None, description="终止原因")
