"""
模板 DTO

定义模板数据传输对象。
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict

from sandbox_control_plane.src.domain.entities.template import Template


@dataclass
class TemplateDTO:
    """模板数据传输对象"""
    id: str
    name: str
    image_url: str
    runtime_type: str
    default_cpu_cores: float
    default_memory_mb: int
    default_disk_mb: int
    default_timeout_sec: int
    default_env_vars: Optional[Dict[str, str]] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @classmethod
    def from_entity(cls, template: Template) -> "TemplateDTO":
        """从领域实体创建 DTO"""
        return cls(
            id=template.id,
            name=template.name,
            image_url=template.image_url,
            runtime_type=template.runtime_type,
            default_cpu_cores=template.default_cpu_cores,
            default_memory_mb=template.default_memory_mb,
            default_disk_mb=template.default_disk_mb,
            default_timeout_sec=template.default_timeout_sec,
            default_env_vars=template.default_env_vars,
            is_active=template.is_active,
            created_at=template.created_at,
            updated_at=template.updated_at,
        )

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "name": self.name,
            "image_url": self.image_url,
            "runtime_type": self.runtime_type,
            "default_cpu_cores": self.default_cpu_cores,
            "default_memory_mb": self.default_memory_mb,
            "default_disk_mb": self.default_disk_mb,
            "default_timeout_sec": self.default_timeout_sec,
            "default_env_vars": self.default_env_vars,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
