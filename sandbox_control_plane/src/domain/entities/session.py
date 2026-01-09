"""
会话实体

表示一个沙箱会话，是聚合根。
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List

from sandbox_control_plane.src.domain.value_objects.resource_limit import ResourceLimit
from sandbox_control_plane.src.domain.value_objects.execution_status import SessionStatus
from sandbox_control_plane.src.domain.entities.execution import Execution


@dataclass
class Session:
    """
    会话实体

    聚合根，负责管理会话的生命周期和相关的执行记录。
    """
    id: str
    template_id: str
    status: SessionStatus
    resource_limit: ResourceLimit
    workspace_path: str
    runtime_type: str  # "docker" or "kubernetes"
    runtime_node: str | None = None
    container_id: str | None = None
    pod_name: str | None = None
    env_vars: dict = field(default_factory=dict)
    timeout: int = 300  # 默认 5 分钟
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    completed_at: datetime | None = None
    last_activity_at: datetime = field(default_factory=datetime.now)
    _executions: List[Execution] = field(default_factory=list)

    def __post_init__(self):
        """初始化后验证"""
        if self.timeout <= 0:
            raise ValueError("timeout must be positive")
        if not self.workspace_path:
            raise ValueError("workspace_path cannot be empty")

    # ============== 领域行为 ==============

    def mark_as_running(self, runtime_node: str, container_id: str) -> None:
        """标记会话为运行中"""
        if self.status != SessionStatus.CREATING:
            raise ValueError(f"Cannot mark session as running from status: {self.status}")

        self.status = SessionStatus.RUNNING
        self.runtime_node = runtime_node
        self.container_id = container_id
        self.updated_at = datetime.now()

    def mark_as_completed(self) -> None:
        """标记会话为已完成"""
        if self.status != SessionStatus.RUNNING:
            raise ValueError(f"Cannot mark session as completed from status: {self.status}")

        self.status = SessionStatus.COMPLETED
        self.completed_at = datetime.now()
        self.updated_at = datetime.now()

    def mark_as_failed(self) -> None:
        """标记会话为失败"""
        if self.status not in {SessionStatus.CREATING, SessionStatus.RUNNING}:
            raise ValueError(f"Cannot mark session as failed from status: {self.status}")

        self.status = SessionStatus.FAILED
        self.completed_at = datetime.now()
        self.updated_at = datetime.now()

    def mark_as_terminated(self) -> None:
        """终止会话"""
        if self.status == SessionStatus.TERMINATED:
            return  # 已经是终止状态

        self.status = SessionStatus.TERMINATED
        self.completed_at = datetime.now()
        self.updated_at = datetime.now()

    def update_last_activity(self) -> None:
        """更新最后活动时间"""
        self.last_activity_at = datetime.now()
        self.updated_at = datetime.now()

    # ============== 领域查询 ==============

    def is_active(self) -> bool:
        """是否为活跃状态"""
        return self.status in {
            SessionStatus.CREATING,
            SessionStatus.RUNNING
        }

    def is_terminated(self) -> bool:
        """是否已终止"""
        return self.status == SessionStatus.TERMINATED

    def is_idle(self, threshold_minutes: int = 30) -> bool:
        """是否空闲（超过阈值时间未活动）"""
        if not self.is_active():
            return False
        idle_time = datetime.now() - self.last_activity_at
        return idle_time > timedelta(minutes=threshold_minutes)

    def is_expired(self, max_hours: int = 6) -> bool:
        """是否过期（创建超过最大时间）"""
        age = datetime.now() - self.created_at
        return age > timedelta(hours=max_hours)

    def should_cleanup(self, idle_threshold_minutes: int = 30, max_lifetime_hours: int = 6) -> bool:
        """是否应该清理"""
        return self.is_idle(idle_threshold_minutes) or self.is_expired(max_lifetime_hours)

    # ============== 执行管理 ==============

    def add_execution(self, execution: Execution) -> None:
        """添加执行记录"""
        if execution.session_id != self.id:
            raise ValueError("Execution does not belong to this session")
        self._executions.append(execution)
        self.update_last_activity()

    def get_executions(self) -> List[Execution]:
        """获取所有执行记录"""
        return list(self._executions)

    def get_running_executions(self) -> List[Execution]:
        """获取正在运行的执行"""
        return [e for e in self._executions if e.is_running()]
