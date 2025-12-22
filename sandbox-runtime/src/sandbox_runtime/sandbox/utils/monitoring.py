"""
性能监控工具
"""

import psutil
import threading
import time
from typing import Optional


class MemoryMonitor:
    """
    内存监控器,实时采样进程内存使用
    """

    def __init__(self, pid: int, sample_interval: float = 0.001):
        self.pid = pid
        self.sample_interval = sample_interval
        self.peak_memory: float = 0.0
        self.is_running = False
        self.thread: Optional[threading.Thread] = None

    def start(self) -> None:
        """
        启动监控
        """
        self.is_running = True
        self.peak_memory = 0.0
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()

    def _monitor_loop(self) -> None:
        """
        监控循环
        """
        try:
            process = psutil.Process(self.pid)

            while self.is_running:
                try:
                    memory_info = process.memory_info()
                    memory_mb = memory_info.rss / (1024 * 1024)

                    if memory_mb > self.peak_memory:
                        self.peak_memory = memory_mb

                    time.sleep(self.sample_interval)

                except psutil.NoSuchProcess:
                    break

        except Exception as e:
            print(f"内存监控异常: {e}")

    def stop(self) -> None:
        """
        停止监控
        """
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=1.0)

    def get_peak_memory(self) -> float:
        """
        获取峰值内存(MB)
        """
        return self.peak_memory
