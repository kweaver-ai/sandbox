import asyncio
import json
import os
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from sandbox_runtime.utils.loggers import DEFAULT_LOGGER
from sandbox_runtime.errors import SandboxError
from sandbox_runtime.utils.common import safe_join
from sandbox_runtime.sandbox.shared_env.utils.session_utils import (
    get_session_dir,
    ensure_session_exists,
)

router = APIRouter()


class ExecuteRequest(BaseModel):
    command: str  # 要执行的命令
    args: Optional[List[str]] = None  # 命令行参数


class ExecuteCodeRequest(BaseModel):
    code: str
    filename: Optional[str] = None
    args: Optional[List[str]] = None
    script_type: Optional[str] = "python"
    output_params: Optional[List[str]] = None


class ExecuteCodeRequestV2(BaseModel):
    """
    执行代码请求参数模型
    """

    handler_code: str
    event: Dict[str, Any] = {}
    context: Optional[Dict[str, Any]] = {}


# 将执行命令变成一个函数
async def execute_command(session_id: str, cmd: str, args: List[str]):
    """执行命令"""
    session_dir = get_session_dir(session_id)
    if not os.path.exists(session_dir):
        raise SandboxError(message="Session not found")

    # 使用 Firejail 运行命令
    from pathlib import Path

    script_dir = Path(__file__).parent.parent
    run_script = script_dir / "run_isolated.sh"

    # 检查运行脚本是否存在
    if not run_script.exists():
        raise SandboxError(
            message="Run script not found", detail=f"Script not found: {run_script}"
        )

    # 确保运行脚本有执行权限
    try:
        run_script.chmod(0o755)
    except Exception as e:
        DEFAULT_LOGGER.warning(f"Failed to set script permissions: {e}")

    # 构建命令
    cmd_list = [str(run_script), session_id, cmd]

    # 添加命令行参数
    if args:
        cmd_list.extend(args)

    # 异步执行命令
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd_list,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=session_dir,
        )
    except Exception as e:
        raise SandboxError(message="Failed to start command execution", detail=str(e))

    try:
        stdout, stderr = await process.communicate()
    except Exception as e:
        raise SandboxError(message="Failed to execute command", detail=str(e))

    stdout_text = stdout.decode("utf-8") if stdout else ""
    # stderr_text = stderr.decode('utf-8') if stderr else ""

    # 解析输出
    output_lines = stdout_text.split("\n")
    exit_code = None
    stdout_lines = []
    stderr_lines = []
    current_section = None

    for line in output_lines:
        if line == "=== EXIT CODE ===":
            current_section = "exit_code"
        elif line == "=== STDOUT ===":
            current_section = "stdout"
        elif line == "=== STDERR ===":
            current_section = "stderr"
        elif current_section == "exit_code" and line.strip():
            try:
                exit_code = int(line)
            except ValueError:
                DEFAULT_LOGGER.warning(f"Invalid exit code format: {line}")
        elif current_section == "stdout":
            stdout_lines.append(line)
        elif current_section == "stderr":
            stderr_lines.append(line)

    return {
        "stdout": "\n".join(stdout_lines),
        "stderr": "\n".join(stderr_lines),
        "returncode": exit_code or process.returncode,
    }


@router.post("/execute/{session_id}")
async def execute(session_id: str, request: ExecuteRequest):
    """
    执行命令

    Args:
        session_id: 会话 ID
        request: 执行命令请求参数
            - command: 要执行的命令
            - args: 命令行参数列表

    Returns:
        dict: 包含执行结果的响应
    """
    ensure_session_exists(session_id)
    return await execute_command(
        session_id=session_id, cmd=request.command, args=request.args or []
    )


@router.post("/execute_code/{session_id}")
async def execute_code(session_id: str, request: ExecuteCodeRequest):
    """
    执行代码

    Args:
        session_id: 会话 ID
        request: 执行代码请求参数
            - code: 要执行的代码
            - filename: 可选的文件名，如果不提供则自动生成
            - args: 命令行参数列表
            - script_type: 脚本类型 (python 或 shell)
            - output_params: 输出参数列表

    Returns:
        dict: 包含执行结果的响应
    """
    ensure_session_exists(session_id)
    session_dir = get_session_dir(session_id)

    # 根据脚本类型确定默认扩展名
    if request.script_type == "python":
        default_ext = ".py"
    elif request.script_type == "shell":
        default_ext = ".sh"
    else:
        raise SandboxError(message="Unsupported script type")

    DEFAULT_LOGGER.info(f"request.output_params: {request.output_params}")

    # 生成或使用提供的文件名
    if request.filename:
        filename = request.filename
        if not filename.endswith(default_ext):
            filename = f"{filename}{default_ext}"
    else:
        filename = f"script_{int(time.time())}{default_ext}"

    # 如果指定数据变量，则需要组合输出的格，并追加在代码中，用 json 格式
    if request.output_params:
        if request.script_type == "python":
            # 生成临时文件名
            base_filename = filename.replace(".py", "")
            output_filename = f"{base_filename}_output_variables.json"

            output_code = f"""
import json
import os

def save_output_variables(output_params, output_file):
    output_data = {{}}
    
    for param_name in output_params:
        try:
            if param_name in globals():
                output_data[param_name] = globals()[param_name]
            # 如果变量不存在，直接跳过，不报错
        except Exception:
            # 如果获取变量信息时出错，跳过该变量
            pass
    
    # 将变量数据写入文件
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2, default=str)

# 使用字符串列表，避免NameError
param_names = [{', '.join([f'"{param}"' for param in request.output_params])}]

# 调用函数保存变量
output_file = "/workspace/{output_filename}"
save_output_variables(param_names, output_file)
"""
            request.code = f"{request.code}\n{output_code}"
            DEFAULT_LOGGER.info(f"output_code: {request.code}")
        elif request.script_type == "shell":
            pass

    # 保存代码到文件
    script_path = os.path.join(session_dir, filename)
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(request.code)

    # 如果是 shell 脚本，添加执行权限
    if request.script_type == "shell":
        os.chmod(script_path, 0o755)

    # 执行脚本
    if request.script_type == "python":
        # 传递相对文件名，因为在容器内会话目录被映射到 /workspace
        result = await execute_command(
            session_id, "python3", [filename] + (request.args or [])
        )

        # 如果指定了输出参数，尝试读取临时文件
        if request.output_params:
            try:
                # 生成临时文件名
                base_filename = filename.replace(".py", "")
                output_filename = f"{base_filename}_output_variables.json"
                output_file_path = os.path.join(session_dir, output_filename)

                # 直接尝试读取文件，如果存在就读取，不存在就返回空字典
                if os.path.exists(output_file_path):
                    with open(output_file_path, "r", encoding="utf-8") as f:
                        output_variables = json.load(f)
                    result["output_variables"] = output_variables
                else:
                    result["output_variables"] = {}

                # 清理临时文件（无论是否存在都尝试删除）
                try:
                    os.remove(output_file_path)
                except FileNotFoundError:
                    pass  # 文件不存在时忽略错误

            except Exception as e:
                DEFAULT_LOGGER.warning(f"Failed to read output variables: {e}")
                result["output_variables"] = {}

        return result
    elif request.script_type == "shell":
        # 对于shell脚本，也使用相对文件名
        return await execute_command(session_id, filename, request.args or [])
    else:
        raise SandboxError(message="Unsupported script type")


@router.post("/v2/execute_code")
async def execute_code_v2(request: ExecuteCodeRequestV2):
    """
    执行 Python Handler 代码 (V2版本)
    在安全沙箱环境中执行用户提供的 Python handler 代码

    支持在 event 中传入超时控制参数：
    - __timeout: 执行超时时间（秒），默认为 300 秒
    （使用双下划线前缀避免与用户业务参数冲突）

    Args:
        request: 执行代码请求参数

    Returns:
        执行结果，包含标准输出、标准错误、业务结果和性能指标
    """
    from sandbox_runtime.sandbox.shared_env.app.lifespan import executor
    import asyncio

    if executor is None:
        raise HTTPException(
            status_code=503,
            detail={
                "error_code": "Sandbox.NotInitialized",
                "description": "Sandbox executor not initialized",
                "error_detail": "The sandbox executor has not been properly initialized",
                "solution": "Please check the sandbox initialization process",
            },
        )

    # 从 event 中获取超时时间，默认 300 秒
    # 使用 __timeout 避免与用户参数冲突
    timeout_seconds = request.event.get("__timeout", 300)

    # 确保超时时间是合理的值
    if timeout_seconds <= 0:
        timeout_seconds = 300
    elif timeout_seconds > 3600:  # 最大 1 小时
        timeout_seconds = 3600

    try:
        # 使用 asyncio.wait_for 实现超时控制
        result = await asyncio.wait_for(
            executor.invoke(
                handler_code=request.handler_code,
                event=request.event,
                context_kwargs=request.context,
            ),
            timeout=timeout_seconds
        )

        # 构造响应结果
        response_data = {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "result": result.result,
            "metrics": {
                "duration_ms": result.metrics.duration_ms,
                "memory_peak_mb": result.metrics.memory_peak_mb,
                "cpu_time_ms": result.metrics.cpu_time_ms,
                "timeout_seconds": timeout_seconds,  # 添加超时信息
            },
        }

        return response_data

    except asyncio.TimeoutError:
        DEFAULT_LOGGER.warning(f"Execution timed out after {timeout_seconds} seconds")

        # 返回超时错误结果
        error_response = {
            "stdout": "",
            "stderr": f"Execution timed out after {timeout_seconds} seconds",
            "result": None,
            "metrics": {
                "duration_ms": timeout_seconds * 1000,  # 超时时间
                "memory_peak_mb": 0,
                "cpu_time_ms": 0,
                "timeout_seconds": timeout_seconds,
                "timed_out": True,
            },
            "error": {
                "error_code": "Sandbox.ExecTimeout",
                "description": "Handler execution timeout",
                "error_detail": f"Execution timed out after {timeout_seconds} seconds",
                "solution": f"Consider optimizing your handler or increasing the __timeout parameter in the event",
            }
        }

        raise HTTPException(
            status_code=500,
            detail=error_response["error"]
        )

    except Exception as e:
        DEFAULT_LOGGER.error(f"Error executing code: {str(e)}", exc_info=True)

        # 判断是否是超时相关错误
        error_detail = str(e)
        if "timeout" in error_detail.lower() or "timed out" in error_detail.lower():
            error_code = "Sandbox.ExecTimeout"
            description = "Handler execution timeout"
            solution = f"Consider optimizing your handler or increasing the __timeout parameter (current: {timeout_seconds}s)"
        else:
            error_code = "Sandbox.ExecException"
            description = "Handler execution exception"
            solution = "Please check your handler code for errors"

        raise HTTPException(
            status_code=500,
            detail={
                "error_code": error_code,
                "description": description,
                "error_detail": error_detail,
                "solution": solution,
            },
        )
