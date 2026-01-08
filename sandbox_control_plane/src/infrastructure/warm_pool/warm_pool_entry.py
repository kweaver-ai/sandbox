"""
预热池条目

表示预热池中的一个容器实例。
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class WarmPoolEntry:
    """
    预热池条目

    表示一个预先创建的容器实例，可以被快速分配给会话。
    """
    template_id: str  # 关联的模板 ID
    node_id: str  # 运行时节点 ID
    container_id: str  # 容器 ID
    container_name: str  # 容器名称
    image: str  # 镜像名称
    status: str  # available, allocated, expired
    created_at: datetime  # 创建时间
    allocated_at: Optional[datetime] = None  # 分配时间
    last_activity_at: Optional[datetime] = None  # 最后活动时间
    session_id: Optional[str] = None  # 分配的会话 ID

    def is_available(self) -> bool:
        """是否可用（未被分配且未过期）"""
        return self.status == "available"

    def is_expired(self, idle_timeout_seconds: int = 1800) -> bool:
        """
        是否过期

        Args:
            idle_timeout_seconds: 空闲超时时间（秒），默认 30 分钟
        """
        if self.status == "allocated":
            return False

        # 使用创建时间或最后活动时间来判断
        reference_time = self.last_activity_at or self.created_at
        idle_seconds = (datetime.now() - reference_time).total_seconds()
        return idle_seconds > idle_timeout_seconds

    def allocate(self, session_id: str) -> None:
        """分配给会话"""
        self.status = "allocated"
        self.session_id = session_id
        self.allocated_at = datetime.now()
        self.last_activity_at = datetime.now()

    def release(self) -> None:
        """释放（容器已用完，需要销毁）"""
        self.status = "expired"
        self.last_activity_at = datetime.now()

    def mark_available(self) -> None:
        """标记为可用（重新加入预热池）"""
        self.status = "available"
        self.session_id = None
        self.allocated_at = None
        self.last_activity_at = datetime.now()

    def get_idle_time_seconds(self) -> int:
        """获取空闲时间（秒）"""
        reference_time = self.last_activity_at or self.created_at
        return int((datetime.now() - reference_time).total_seconds())
