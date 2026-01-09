"""
会话数据传输对象

用于应用层与接口层之间的数据传输。
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from sandbox_control_plane.src.domain.value_objects.resource_limit import ResourceLimit
from sandbox_control_plane.src.domain.value_objects.execution_status import SessionStatus


@dataclass
class SessionDTO:
    """会话数据传输对象"""
    id: str
    template_id: str
    status: str
    resource_limit: dict
    workspace_path: str
    runtime_type: str
    runtime_node: Optional[str] = None
    container_id: Optional[str] = None
    pod_name: Optional[str] = None
    env_vars: dict = None
    timeout: int = 300
    created_at: datetime = None
    updated_at: datetime = None
    completed_at: Optional[datetime] = None
    last_activity_at: datetime = None

    def __post_init__(self):
        """初始化默认值"""
        if self.env_vars is None:
            self.env_vars = {}
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()
        if self.last_activity_at is None:
            self.last_activity_at = datetime.now()

    @classmethod
    def from_entity(cls, session) -> "SessionDTO":
        """从领域实体创建 DTO"""
        return cls(
            id=session.id,
            template_id=session.template_id,
            status=session.status.value,
            resource_limit={
                "cpu": session.resource_limit.cpu,
                "memory": session.resource_limit.memory,
                "disk": session.resource_limit.disk,
                "max_processes": session.resource_limit.max_processes,
            },
            workspace_path=session.workspace_path,
            runtime_type=session.runtime_type,
            runtime_node=session.runtime_node,
            container_id=session.container_id,
            pod_name=session.pod_name,
            env_vars=dict(session.env_vars),
            timeout=session.timeout,
            created_at=session.created_at,
            updated_at=session.updated_at,
            completed_at=session.completed_at,
            last_activity_at=session.last_activity_at,
        )
