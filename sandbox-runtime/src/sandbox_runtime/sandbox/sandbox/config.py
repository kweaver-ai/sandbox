"""
沙箱配置定义
"""

from typing import Optional


class SandboxConfig:
    """沙箱配置类"""

    def __init__(
        self,
        cpu_quota: Optional[float] = None,
        memory_limit: Optional[int] = None,
        allow_network: bool = False,
        max_task_count: int = 10,
        max_user_progress: int = 1000,
        timeout_seconds: int = 300,
        working_dir: Optional[str] = None,
        readonly_paths: Optional[list] = None,
        writable_paths: Optional[list] = None,
        tmpfs_size: str = "100M",
        max_idle_time: int = 60,
    ):
        """
        初始化沙箱配置

        Args:
            cpu_quota: CPU配额 (核数)
            memory_limit: 内存限制 (MB)
            allow_network: 是否允许网络访问
            max_task_count: 最大任务数
            max_user_progress: 用户最大进程数
            timeout_seconds: 超时时间 (秒)
            working_dir: 工作目录
            readonly_paths: 只读路径列表
            writable_paths: 可写路径列表
            tmpfs_size: tmpfs 大小
            max_idle_time: 最大空闲时间 (秒)
        """
        self.cpu_quota = cpu_quota
        self.memory_limit = memory_limit
        self.allow_network = allow_network
        self.max_task_count = max_task_count
        self.max_user_progress = max_user_progress
        self.timeout_seconds = timeout_seconds
        self.working_dir = working_dir
        self.readonly_paths = readonly_paths or []
        self.writable_paths = writable_paths or []
        self.tmpfs_size = tmpfs_size
        self.max_idle_time = max_idle_time

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "cpu_quota": self.cpu_quota,
            "memory_limit": self.memory_limit,
            "allow_network": self.allow_network,
            "max_task_count": self.max_task_count,
            "max_user_progress": self.max_user_progress,
            "timeout_seconds": self.timeout_seconds,
            "working_dir": self.working_dir,
            "readonly_paths": self.readonly_paths,
            "writable_paths": self.writable_paths,
            "tmpfs_size": self.tmpfs_size,
            "max_idle_time": self.max_idle_time,
        }

    def __str__(self) -> str:
        """字符串表示"""
        return f"SandboxConfig({self.to_dict()})"