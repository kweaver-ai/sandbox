"""
异步沙箱池化管理,实现沙箱复用
"""

import asyncio
import os
import signal
import queue
import threading
import logging
import trace
from typing import Dict, Optional, Set
from sandbox_runtime.sandbox.sandbox.config import SandboxConfig
from sandbox_runtime.sandbox.sandbox.async_instance import AsyncSandboxInstance
from sandbox_runtime.sandbox.core.errors import NoAvailableSandboxError

from sandbox_runtime.utils.loggers import get_logger

logger = get_logger(__name__)


class AsyncSandboxPool:
    """
    异步沙箱池,负责沙箱实例的创建、分配、回收
    """

    def __init__(self, pool_size: int = 5, config: Optional[SandboxConfig] = None):
        self.pool_size = pool_size
        self.config = config or SandboxConfig()

        # 空闲沙箱队列(使用异步队列)
        self.idle_queue: asyncio.Queue = asyncio.Queue(maxsize=pool_size)

        # 忙碌沙箱字典
        self.busy_sandboxes: Dict[int, AsyncSandboxInstance] = {}

        # 跟踪所有子进程 PID，用于清理僵尸进程
        self.child_pids: Set[int] = set()

        # 池管理锁
        self.lock = asyncio.Lock()

        # 池状态
        self.is_running = False
        self.health_check_task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        """
        启动沙箱池,预热创建沙箱实例
        """
        logger.info(f"启动异步沙箱池,池大小: {self.pool_size}")
        self.is_running = True

        # 预热创建沙箱
        for i in range(self.pool_size):
            try:
                sandbox = await self._create_sandbox()
                await self.idle_queue.put(sandbox)
                logger.info(f"预热创建沙箱 {i+1}/{self.pool_size}")
            except Exception as e:
                import traceback

                traceback.print_exc()
                logger.error(f"创建沙箱失败: {e}")

        # 启动健康检查任务
        self.health_check_task = asyncio.create_task(self._health_check_loop())

    async def _create_sandbox(self) -> AsyncSandboxInstance:
        """
        创建新的异步沙箱实例
        """
        sandbox = AsyncSandboxInstance(self.config)
        await sandbox.start()

        # 跟踪子进程 PID，用于后续清理僵尸进程
        if sandbox.process and sandbox.process.pid:
            self.child_pids.add(sandbox.process.pid)

        return sandbox

    async def acquire(self, timeout: float = 10.0) -> AsyncSandboxInstance:
        """
        从池中获取可用沙箱

        Args:
            timeout: 等待超时时间(秒)

        Returns:
            可用的沙箱实例

        Raises:
            NoAvailableSandboxError: 无可用沙箱
        """
        try:
            # 尝试从空闲队列获取
            sandbox = await asyncio.wait_for(self.idle_queue.get(), timeout=timeout)

            # 检查沙箱有效性
            if not sandbox.is_alive() or sandbox.should_retire():
                await sandbox.terminate()
                # 创建新沙箱替换
                sandbox = await self._create_sandbox()

            # 标记为忙碌
            async with self.lock:
                self.busy_sandboxes[id(sandbox)] = sandbox

            logger.debug(f"分配沙箱 {id(sandbox)}")
            return sandbox

        except asyncio.TimeoutError:
            raise NoAvailableSandboxError(f"沙箱池已满,等待 {timeout} 秒后仍无可用沙箱")

    async def release(self, sandbox: AsyncSandboxInstance) -> None:
        """
        归还沙箱到池中

        Args:
            sandbox: 要归还的沙箱实例
        """
        sandbox_id = id(sandbox)

        async with self.lock:
            if sandbox_id in self.busy_sandboxes:
                del self.busy_sandboxes[sandbox_id]

        # 判断是否应该退役
        if sandbox.should_retire():
            logger.info(
                f"沙箱 {sandbox_id} 退役: "
                f"任务数={sandbox.task_count}, "
                f"空闲时间={sandbox.last_active_time}"
            )
            await sandbox.terminate()

            # 创建新沙箱补充到池中
            try:
                new_sandbox = await self._create_sandbox()
                await self.idle_queue.put(new_sandbox)
            except Exception as e:
                logger.error(f"补充新沙箱失败: {e}")
        else:
            # 放回空闲队列
            try:
                self.idle_queue.put_nowait(sandbox)
                logger.debug(f"归还沙箱 {sandbox_id}")
            except asyncio.QueueFull:
                logger.warning(f"空闲队列已满,销毁沙箱 {sandbox_id}")
                await sandbox.terminate()

    async def _health_check_loop(self) -> None:
        """
        健康检查循环,定期检查沙箱状态并清理僵尸进程
        """
        while self.is_running:
            await asyncio.sleep(30)  # 每30秒检查一次

            # 清理僵尸进程
            await self._reap_zombie_processes()

            # 检查忙碌沙箱
            async with self.lock:
                dead_sandboxes = [
                    sid for sid, sb in self.busy_sandboxes.items() if not sb.is_alive()
                ]

                for sid in dead_sandboxes:
                    logger.warning(f"检测到死亡沙箱 {sid},已清理")
                    del self.busy_sandboxes[sid]

    async def _reap_zombie_processes(self) -> None:
        """
        清理僵尸进程

        通过尝试 wait 已知的子进程 PID 来回收僵尸进程
        """
        if not self.child_pids:
            return

        dead_pids = set()

        for pid in list(self.child_pids):
            try:
                # 使用 os.waitpid 的 WNOHANG 选项非阻塞地检查进程状态
                # 如果进程已经退出，这会回收它
                wait_pid, status = os.waitpid(pid, os.WNOHANG)

                if wait_pid == pid:
                    # 进程已退出并被回收
                    dead_pids.add(pid)
                    logger.debug(f"回收僵尸进程: PID {pid}")
                elif wait_pid == 0:
                    # 进程仍在运行
                    pass
            except ChildProcessError:
                # 进程不存在或已经被回收
                dead_pids.add(pid)
            except Exception as e:
                logger.warning(f"清理进程 {pid} 时出错: {e}")
                dead_pids.add(pid)

        # 从跟踪集合中移除已回收的 PID
        self.child_pids -= dead_pids

    async def shutdown(self) -> None:
        """
        关闭沙箱池,清理所有沙箱和僵尸进程
        """
        logger.info("开始关闭异步沙箱池")
        self.is_running = False

        # 取消健康检查任务
        if self.health_check_task:
            self.health_check_task.cancel()
            try:
                await self.health_check_task
            except asyncio.CancelledError:
                pass

        # 清理空闲沙箱
        while not self.idle_queue.empty():
            try:
                sandbox = self.idle_queue.get_nowait()
                await sandbox.terminate()
            except asyncio.QueueEmpty:
                break

        # 清理忙碌沙箱
        async with self.lock:
            for sandbox in self.busy_sandboxes.values():
                await sandbox.terminate()
            self.busy_sandboxes.clear()

        # 最后一次清理所有可能的僵尸进程
        await self._reap_zombie_processes()

        # 尝试终止所有剩余的子进程
        for pid in list(self.child_pids):
            try:
                os.killpg(pid, signal.SIGTERM)
            except:
                pass

        # 等待并回收剩余进程
        await self._reap_zombie_processes()

        logger.info("异步沙箱池已关闭")

    async def get_stats(self) -> dict:
        """
        获取池统计信息
        """
        return {
            "pool_size": self.pool_size,
            "idle_count": self.idle_queue.qsize(),
            "busy_count": len(self.busy_sandboxes),
            "is_running": self.is_running,
        }
