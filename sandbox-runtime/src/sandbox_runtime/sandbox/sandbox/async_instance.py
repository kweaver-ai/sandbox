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

import sys as _sys  # 别名避免冲突

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
            "/etc",
            "/etc",
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
        # daemon_package_dir 是 .../src/sandbox_runtime/sandbox/sandbox
        # 需要向上 4 级到项目根目录，然后加上 /src
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(daemon_package_dir))))
        print(project_root)
        cmd.extend(
            [
                "--setenv",
                "PYTHONPATH",
                f"{project_root}/src",
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
        logger.debug(" ".join(cmd))

        return cmd

    async def _wait_for_ready(self, timeout: int = 5) -> None:
        """
        等待沙箱守护进程就绪
        """
        start_time = time.time()
        loop = asyncio.get_event_loop()
        lines_seen = []
        stderr_lines = []

        # 设置 stderr 为非阻塞模式（只设置一次）
        if self.process.stderr and not self.process.stderr.closed:
            try:
                import os
                import fcntl
                fd = self.process.stderr.fileno()
                flags = fcntl.fcntl(fd, fcntl.F_GETFL)
                fcntl.fcntl(fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
            except Exception:
                pass

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

                # 确保回收僵尸进程
                try:
                    if self.process.poll() is None:
                        self.process.wait()
                except:
                    pass

                # 检查是否是内存不足导致
                error_msg = f"沙箱进程启动失败，返回码: {self.process.returncode}"
                if self.config.memory_limit < 512 * 1024:  # 小于512MB
                    error_msg += f". 内存限制 ({self.config.memory_limit // 1024}MB) 可能不足。"
                    error_msg += "建议增加 memory_limit 到至少 512MB 或更高。"
                if stderr:
                    error_msg += f"\n进程stderr: {stderr}"
                raise RuntimeError(error_msg)

            # 使用异步方式读取一行输出（带超时）
            def _readline():
                return self.process.stdout.readline()

            # 同时读取 stderr 用于调试（非阻塞）
            def _read_stderr():
                if self.process.stderr and not self.process.stderr.closed:
                    try:
                        data = self.process.stderr.read(4096)
                        if data:
                            return data
                    except (BlockingIOError, IOError):
                        pass
                return None

            try:
                # 给每个 readline 添加 1 秒超时，防止无限阻塞
                line = await asyncio.wait_for(
                    loop.run_in_executor(None, _readline),
                    timeout=1.0
                )
            except asyncio.TimeoutError:
                # readline 超时，继续循环
                line = None

            # 读取 stderr（非阻塞）
            stderr_data = await loop.run_in_executor(None, _read_stderr)
            if stderr_data:
                for sl in stderr_data.splitlines():
                    if sl.strip():
                        stderr_lines.append(sl.strip())
                        logger.debug(f"沙箱stderr: {sl.strip()}")

            if line:
                lines_seen.append(line.strip())
                logger.debug(f"从沙箱读取: {line.strip()}")
            if line and line.startswith("SANDBOX_PORT:"):
                self.port = int(line.split(":")[1].strip())
                return

            await asyncio.sleep(0.1)

        # 超时：提供更详细的错误信息
        timeout_msg = f"等待沙箱就绪超时 ({timeout}秒)"
        if self.process.poll() is None:
            # 进程仍在运行但没有输出
            timeout_msg += f". 进程存在但未响应。"
            timeout_msg += f"内存限制: {self.config.memory_limit // 1024}MB。"
            if self.config.memory_limit < 512 * 1024:
                timeout_msg += " 内存限制过小可能导致进程卡住。"
                timeout_msg += "建议增加 memory_limit 到至少 512MB 或更高。"
            timeout_msg += f"已读取的stdout行: {lines_seen}"
            if stderr_lines:
                timeout_msg += f". 已读取的stderr: {stderr_lines}"
        else:
            # 进程已退出
            timeout_msg += f". 进程已退出，返回码: {self.process.returncode}"
            if stderr_lines:
                timeout_msg += f". stderr: {stderr_lines}"
        raise TimeoutError(timeout_msg)

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

                    # 连接前检查 bwrap 进程是否还存活
                    if self.process.poll() is not None:
                        return {
                            "exit_code": 137,
                            "stdout": "",
                            "stderr": f"Sandbox process (bwrap) exited unexpectedly. "
                                     f"Return code: {self.process.returncode}. "
                                     f"This may indicate memory limit ({self.config.memory_limit // 1024}MB) was exceeded.",
                            "result": None,
                        }

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

                    # 接收完成后检查进程状态
                    process_exited = self.process.poll() is not None
                    return_code = self.process.returncode if process_exited else None

                    # 尝试解析结果
                    try:
                        # 检查是否收到空数据（daemon 可能崩溃）
                        if not result_data:
                            if process_exited:
                                # 进程已退出，返回详细信息
                                return {
                                    "exit_code": return_code or 137,
                                    "stdout": "",
                                    "stderr": f"Sandbox process exited (code={return_code}). "
                                             f"Memory limit: {self.config.memory_limit // 1024}MB. "
                                             f"This usually indicates OOM (out of memory). "
                                             f"Try increasing memory_limit in SandboxConfig.",
                                    "result": None,
                                }
                            # 进程还在运行但没有返回数据 - 可能是 daemon 被 OOM 杀死
                            memory_mb = self.config.memory_limit // 1024
                            if memory_mb < 512:
                                return {
                                    "exit_code": 137,
                                    "stdout": "",
                                    "stderr": f"Received empty response from daemon. "
                                             f"Memory limit: {memory_mb}MB. "
                                             f"This likely indicates OOM - the daemon was killed due to insufficient memory. "
                                             f"Try increasing memory_limit to at least 512MB or higher.",
                                    "result": None,
                                }
                            return {
                                "exit_code": 3,
                                "stdout": "",
                                "stderr": "Received empty response from daemon",
                                "result": None,
                            }
                        return json.loads(result_data.decode())
                    except json.JSONDecodeError as e:
                        # 提供更详细的错误信息
                        raw_output = result_data.decode(errors="replace")[:200]  # 前200字符
                        error_msg = f"Failed to parse execution result: {str(e)}. "
                        if not result_data:
                            error_msg += f"Empty response. "
                        error_msg += f"Raw output: {repr(raw_output)}. "
                        if process_exited:
                            error_msg += f"Process exited with code {return_code}. "
                            error_msg += f"Memory limit: {self.config.memory_limit // 1024}MB. "
                            error_msg += "This indicates OOM (out of memory). "
                        else:
                            error_msg += "This may indicate daemon crash or corruption. "
                        return {
                            "exit_code": return_code if process_exited else 3,
                            "stdout": "",
                            "stderr": error_msg,
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
                # 在线程池中执行 wait，并设置超时
                await asyncio.wait_for(
                    loop.run_in_executor(None, self.process.wait), timeout=5
                )
            except asyncio.TimeoutError:
                os.killpg(pgid, signal.SIGKILL)
                # 再次尝试回收进程
                try:
                    self.process.wait(timeout=2)
                except:
                    pass
        except ProcessLookupError:
            # 进程已经不存在，直接清理
            pass
        except Exception as e:
            print(f"terminate 沙箱进程失败: {e}")
        finally:
            # 确保最终回收进程（避免僵尸进程）
            if self.process:
                try:
                    # 尝试最后一次回收
                    if self.process.poll() is None:
                        self.process.wait(timeout=1)
                except:
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
