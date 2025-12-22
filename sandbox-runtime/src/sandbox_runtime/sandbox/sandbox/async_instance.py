"""
异步沙箱实例管理
"""

import signal
import socket
import subprocess
import json
import time
import asyncio
from typing import Optional, Dict, Any
from dataclasses import dataclass
import sys
import os

from sandbox_runtime.sandbox.sandbox.config import SandboxConfig

from sandbox_runtime.utils.loggers import get_logger

logger = get_logger(__name__)

daemon_package_dir = os.path.dirname(os.path.abspath(__file__))


class AsyncSandboxInstance:
    """
    异步沙箱实例,封装单个沙箱的生命周期管理
    """

    def __init__(self, config: SandboxConfig):
        self.config = config
        self.process: Optional[subprocess.Popen] = None
        self.port: Optional[int] = None

        # 状态追踪
        self.task_count: int = 0
        self.create_time: float = time.time()
        self.last_active_time: float = time.time()
        self.is_busy: bool = False

    async def start(self) -> None:
        """
        启动沙箱进程和守护进程
        """
        # 构建 bubblewrap 命令
        bwrap_cmd = self._build_bwrap_command()
        bwrap_cmd_str = " ".join(bwrap_cmd)
        logger.debug(f"Starting sandbox with command: {bwrap_cmd_str}")

        # 使用 asyncio 的 run_in_executor 将同步的 subprocess.Popen 转为异步
        loop = asyncio.get_event_loop()

        def _create_process():
            # 启动沙箱进程
            return subprocess.Popen(
                bwrap_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                start_new_session=True,
            )

        # 在线程池中执行同步的 subprocess 操作
        self.process = await loop.run_in_executor(None, _create_process)

        # 等待守护进程启动并获取端口
        await self._wait_for_ready()

    def _build_bwrap_command(self) -> list:
        """
        构建 bubblewrap 命令行参数
        """
        cmd = [
            "bwrap",
            "--die-with-parent",  # 沙箱随 Bubblewrap 进程一起退出
            "--unshare-pid",  # PID 命名空间隔离
            "--cap-drop",
            "all",  # 丢弃所有 capabilities
            "--ro-bind",
            daemon_package_dir,
            daemon_package_dir,
            # "--ro-bind",
            # "/",
            # "/",  # 只读绑定 /
            "--ro-bind",
            "/usr",
            "/usr",  # 只读绑定 /usr
            "--ro-bind",
            "/lib",
            "/lib",  # 只读绑定 /lib
            "--ro-bind",
            "/lib64",
            "/lib64",  # 只读绑定 /lib64
            "--tmpfs",
            "/tmp",  # 临时目录可写
            "--proc",
            "/proc",  # 挂载 proc
            "--dev",
            "/dev",  # 挂载设备
        ]

        # 网络隔离
        if not self.config.allow_network:
            cmd.extend(["--unshare-net"])

        # Set PYTHONPATH for the sandbox
        source_dir = os.path.dirname(
            os.path.dirname(os.path.dirname(daemon_package_dir))
        )
        cmd.extend(
            [
                "--setenv",
                "PYTHONPATH",
                f"{source_dir}/src",
            ]
        )

        # CPU 和内存限制
        # cmd.extend(
        #     [
        #         "--setenv",
        #         "CPU_QUOTA",
        #         str(self.config.cpu_quota),
        #         "--setenv",
        #         "MEMORY_LIMIT",
        #         str(self.config.memory_limit),
        #     ]
        # )
        change_dir_cmd = [" cd", os.path.dirname(os.path.abspath(__file__)), "&&"]
        ulimit_cmd = [
            "ulimit",
            "-v",
            str(self.config.memory_limit),
            "&&",
            "ulimit",
            "-t",
            str(self.config.cpu_quota),
            "&&",
            "ulimit",
            "-u",
            str(self.config.max_user_progress),
            "&&",
        ]
        python_cmd = [
            " python3 -m daemon",
        ]
        # 启动守护进程脚本
        bash_cmd = [
            "bash",
            "--norc",
            "--noprofile",
            "-c",
            " ".join(ulimit_cmd) + " ".join(change_dir_cmd) + " ".join(python_cmd),
        ]
        cmd.extend(bash_cmd)

        # cmd.extend(["python3", "-m", "daemon"])

        return cmd

    async def _wait_for_ready(self, timeout: int = 5) -> None:
        """
        等待沙箱守护进程就绪
        """
        start_time = time.time()
        loop = asyncio.get_event_loop()

        while time.time() - start_time < timeout:

            # 从进程输出读取端口号
            if self.process.poll() is not None:
                # 使用异步方式获取进程输出
                stdout, stderr = await loop.run_in_executor(
                    None, lambda: self.process.communicate(timeout=30)
                )
                logger.error(f"沙箱进程退出，返回码: {self.process.returncode}")
                logger.error(f"stdout: {stdout}")
                logger.error(f"stderr: {stderr}")
                raise RuntimeError(
                    f"沙箱进程启动失败，返回码: {self.process.returncode}"
                )

            # 使用异步方式读取一行输出
            def _readline():
                return self.process.stdout.readline()

            line = await loop.run_in_executor(None, _readline)
            if line and line.startswith("SANDBOX_PORT:"):
                self.port = int(line.split(":")[1].strip())
                return

            await asyncio.sleep(0.1)

        raise TimeoutError("等待沙箱就绪超时")

    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        在沙箱中执行任务（异步版本）

        Args:
            task_data: 包含 handler_code, event, context 的任务数据

        Returns:
            执行结果字典
        """
        if not self.is_alive():
            raise RuntimeError("沙箱进程已终止")

        # 标记为忙碌
        self.is_busy = True
        self.task_count += 1

        try:
            # 建立 Socket 连接
            # 使用 asyncio.run_in_executor 将同步的 socket 操作转为异步
            loop = asyncio.get_event_loop()

            def _sync_socket_operation():
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                    # 设置连接超时和接收超时
                    sock.settimeout(5.0)  # 5秒连接超时

                    # 连接到沙箱守护进程
                    sock.connect(("localhost", self.port))

                    # 设置发送和接收超时
                    sock.settimeout(3600.0)  # 1小时最大执行时间

                    # 发送任务数据
                    task_json = json.dumps(task_data)
                    sock.sendall(task_json.encode() + b"\n")

                    # 接收执行结果
                    result_data = b""
                    while True:
                        try:
                            chunk = sock.recv(4096)
                            if not chunk:
                                break
                            result_data += chunk
                        except socket.timeout:
                            # 接收超时，终止连接
                            sock.close()
                            raise TimeoutError(
                                "Socket receive timeout during execution"
                            )

                    # 尝试解析结果
                    try:
                        return json.loads(result_data.decode())
                    except json.JSONDecodeError as e:
                        return {
                            "exit_code": 3,
                            "stdout": "",
                            "stderr": f"Failed to parse execution result: {str(e)}",
                            "result": None,
                        }

            # 在线程池中执行同步的 socket 操作
            result = await loop.run_in_executor(None, _sync_socket_operation)
            return result

        finally:
            # 更新状态
            self.is_busy = False
            self.last_active_time = time.time()

    def is_alive(self) -> bool:
        """
        检查沙箱进程是否存活
        """
        return self.process is not None and self.process.poll() is None

    def should_retire(self) -> bool:
        """
        判断沙箱是否应该退役
        """
        # 进程已终止
        if not self.is_alive():
            return True

        # 任务数达到上限
        if self.task_count >= self.config.max_task_count:
            return True

        # 空闲时间过长
        idle_time = time.time() - self.last_active_time
        if idle_time > self.config.max_idle_time:
            return True

        return False

    async def terminate(self) -> None:
        """
        终止沙箱进程（异步版本）
        """
        if not self.process:
            return
        print("开始终止沙箱进程")
        pgid = -1
        try:
            pgid = os.getpgid(self.process.pid)
            os.killpg(pgid, signal.SIGTERM)

            # 使用异步等待
            loop = asyncio.get_event_loop()
            try:
                await asyncio.wait_for(
                    loop.run_in_executor(None, self.process.wait, 5), timeout=5
                )
            except asyncio.TimeoutError:
                os.killpg(pgid, signal.SIGKILL)
        except Exception as e:
            print("terminate 沙箱进程失败", e)
            pass
        finally:
            self.process = None

    def __del__(self):
        """
        析构时确保进程被终止
        """
        if self.process:
            # Note: terminate() is async, but __del__ is sync
            # So we need to call it synchronously
            try:
                pgid = os.getpgid(self.process.pid)
                os.killpg(pgid, signal.SIGTERM)
                self.process.wait(timeout=1)
            except:
                try:
                    pgid = os.getpgid(self.process.pid)
                    os.killpg(pgid, signal.SIGKILL)
                except:
                    pass
