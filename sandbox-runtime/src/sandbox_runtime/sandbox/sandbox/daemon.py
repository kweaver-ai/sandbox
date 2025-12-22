"""
沙箱内守护进程,接收并执行任务
"""

import socket
import json
import sys
import traceback
from io import StringIO
from typing import Dict, Any, Optional


def execute_handler(
    handler_code: str, event: Any, context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    在沙箱内执行 handler 代码

    Returns:
        执行结果字典,包含 exit_code, stdout, stderr, result
    """
    import signal
    import threading

    # 重定向 stdout/stderr
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    sys.stdout = StringIO()
    sys.stderr = StringIO()

    result = {"exit_code": 0, "stdout": "", "stderr": "", "result": None}

    # 从 event 中获取超时时间
    # 使用 __timeout 避免与用户参数冲突
    timeout_seconds = event.get("__timeout", 300) if isinstance(event, dict) else 300

    # 用于超时控制的变量
    timeout_occurred = threading.Event()
    handler_result = None

    def timeout_handler():
        """超时处理函数"""
        timeout_occurred.set()
        raise TimeoutError(f"Handler execution timed out after {timeout_seconds} seconds")

    try:
        # 1. 动态执行代码字符串
        user_namespace = {}
        exec(handler_code, user_namespace)

        # 2. 检查 handler 函数
        if "handler" not in user_namespace:
            raise ValueError("必须定义 handler(event, context) 函数")

        handler_func = user_namespace["handler"]

        # 3. 重建 Context 对象(简化版)
        class SimpleContext:
            def __init__(self, data):
                self.__dict__.update(data)

            def get_remaining_time_in_millis(self):
                return getattr(self, 'remaining_time_in_millis', timeout_seconds * 1000)

        ctx = SimpleContext(context or {})

        # 4. 使用线程执行 handler 并设置超时
        def execute_with_timeout():
            nonlocal handler_result
            handler_result = handler_func(event)

        # 创建执行线程
        execution_thread = threading.Thread(target=execute_with_timeout)
        execution_thread.daemon = True

        # 启动线程
        execution_thread.start()

        # 等待线程完成或超时
        execution_thread.join(timeout=timeout_seconds)

        # 检查是否超时
        if execution_thread.is_alive():
            # 线程仍在运行，说明超时了
            # 注意：Python 中无法强制终止线程，但我们可以设置标记
            timeout_occurred.set()
            raise TimeoutError(f"Handler execution timed out after {timeout_seconds} seconds")

        # 检查是否在执行过程中发生了超时
        if timeout_occurred.is_set():
            raise TimeoutError(f"Handler execution timed out after {timeout_seconds} seconds")

        # 5. 序列化检查
        json.dumps(handler_result)  # 确保可序列化

        result["result"] = handler_result
        result["exit_code"] = 0

    except TimeoutError as e:
        result["exit_code"] = 124  # 标准超时退出码
        result["stderr"] = f"执行超时: {str(e)}"
        result["timed_out"] = True

    except SyntaxError as e:
        result["exit_code"] = 1
        result["stderr"] = f"代码语法错误: {str(e)}\n{traceback.format_exc()}"

    except ValueError as e:
        result["exit_code"] = 1
        result["stderr"] = f"代码加载失败: {str(e)}"

    except Exception as e:
        result["exit_code"] = 2
        result["stderr"] = f"Handler 执行异常: {str(e)}\n{traceback.format_exc()}"

    finally:
        # 恢复 stdout/stderr 并捕获输出
        result["stdout"] = sys.stdout.getvalue()
        result["stderr"] += sys.stderr.getvalue()

        sys.stdout = old_stdout
        sys.stderr = old_stderr

    return result


def start_daemon():
    """
    启动守护进程,监听任务请求
    """
    # 创建 TCP Socket
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.bind(("", 0))  # 绑定随机端口
    port = server_socket.getsockname()[1]

    # 输出端口号供主进程读取
    print(f"SANDBOX_PORT:{port}", flush=True)

    server_socket.listen(1)

    while True:
        try:
            # 接受连接
            client_socket, address = server_socket.accept()

            # 接收任务数据
            data = b""
            while True:
                chunk = client_socket.recv(4096)
                if not chunk:
                    break
                data += chunk
                if b"\n" in chunk:
                    break

            # 解析任务
            task_data = json.loads(data.decode().strip())
            handler_code = task_data["handler_code"]
            event = task_data["event"]
            context = task_data.get("context", None)

            # ========== 关键步骤: 调用 execute_handler ==========
            # 这里是守护进程触发 execute_handler 的核心位置
            result = execute_handler(handler_code, event, context)
            # ==================================================

            # 返回结果
            result_json = json.dumps(result)
            client_socket.sendall(result_json.encode())
            client_socket.close()

        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"守护进程错误: {e}", file=sys.stderr, flush=True)
            traceback.print_exc()


if __name__ == "__main__":
    # 程序入口: 当沙箱进程启动时,自动执行这里
    start_daemon()
