"""
REST API 请求模式

定义 FastAPI 的请求 Pydantic 模型。
"""
from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional, Dict


class CreateSessionRequest(BaseModel):
    """创建会话请求"""
    template_id: str = Field(..., min_length=1, max_length=64, description="模板 ID")
    timeout: int = Field(300, ge=1, le=3600, description="超时时间（秒）")
    cpu: str = Field("1", description="CPU 核心数")
    memory: str = Field("512Mi", description="内存限制")
    disk: str = Field("1Gi", description="磁盘限制")
    env_vars: Dict[str, str] = Field(default_factory=dict, description="环境变量")
    event: Optional[Dict] = Field(None, description="事件数据")

    @field_validator("cpu")
    @classmethod
    def validate_cpu(cls, v: str) -> str:
        try:
            float(v)
        except ValueError:
            raise ValueError("Invalid cpu format")
        return v


class ExecuteCodeRequest(BaseModel):
    """执行代码请求"""
    code: str = Field(..., min_length=1, max_length=102400, description="要执行的代码（必须符合 AWS Lambda handler 格式）")
    language: Literal["python", "javascript", "shell"] = Field(
        ..., description="编程语言"
    )
    timeout: int = Field(30, ge=1, le=3600, description="执行超时（秒）")
    event: Optional[Dict] = Field(None, description="事件数据")

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "code": 'def handler(event):\n    name = event.get("name", "World")\n    return {"message": f"Hello, {name}!"}',
                    "language": "python",
                    "timeout": 10,
                    "event": {"name": "World"}
                },
                {
                    "code": 'def handler(event):\n    name = event.get("name", "World")\n    age = event.get("age", 0)\n    return {"message": f"Hello, {name}!", "age_doubled": age * 2}',
                    "language": "python",
                    "timeout": 30,
                    "event": {"name": "Alice", "age": 25}
                }
            ]
        }


class TerminateSessionRequest(BaseModel):
    """终止会话请求"""
    reason: Optional[str] = Field(None, description="终止原因")


class CreateTemplateRequest(BaseModel):
    """创建模板请求"""
    id: str = Field(..., min_length=1, max_length=64, description="模板 ID")
    name: str = Field(..., min_length=1, max_length=255, description="模板名称")
    image_url: str = Field(..., min_length=1, max_length=512, description="镜像 URL")
    runtime_type: Literal["python3.11", "nodejs20", "java17", "go1.21"] = Field(
        ..., description="运行时类型"
    )
    default_cpu_cores: float = Field(0.5, ge=0.1, le=4.0, description="默认 CPU 核心数")
    default_memory_mb: int = Field(512, ge=128, le=8192, description="默认内存（MB）")
    default_disk_mb: int = Field(1024, ge=256, le=51200, description="默认磁盘（MB）")
    default_timeout: int = Field(300, ge=60, le=3600, description="默认超时（秒）")
    default_env_vars: Optional[Dict[str, str]] = Field(None, description="默认环境变量")


class UpdateTemplateRequest(BaseModel):
    """更新模板请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="模板名称")
    image_url: Optional[str] = Field(None, min_length=1, max_length=512, description="镜像 URL")
    default_cpu_cores: Optional[float] = Field(None, ge=0.1, le=4.0, description="默认 CPU 核心数")
    default_memory_mb: Optional[int] = Field(None, ge=128, le=8192, description="默认内存（MB）")
    default_disk_mb: Optional[int] = Field(None, ge=256, le=51200, description="默认磁盘（MB）")
    default_timeout: Optional[int] = Field(None, ge=60, le=3600, description="默认超时（秒）")
    default_env_vars: Optional[Dict[str, str]] = Field(None, description="默认环境变量")

