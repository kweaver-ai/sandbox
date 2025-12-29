"""
参数校验工具
"""

import json
from typing import Any, Dict
from sandbox_runtime.sandbox.core.errors import CodeLoadError, ExitCode


def validate_handler_code(handler_code: str) -> None:
    """
    校验 handler 代码
    """
    if not handler_code:
        raise CodeLoadError("handler_code 不能为空")

    if not isinstance(handler_code, str):
        raise CodeLoadError("handler_code 必须是字符串类型")

    # 基础语法检查
    try:
        compile(handler_code, "<string>", "exec")
    except SyntaxError as e:
        raise CodeLoadError(f"代码语法错误: {str(e)}")

    # 检查是否定义 handler 函数
    if "def handler" not in handler_code:
        raise CodeLoadError("代码中未找到 handler 函数定义")


def validate_event(event: Any) -> None:
    """
    校验 event 参数
    """
    # 检查 JSON 可序列化性
    try:
        json.dumps(event)
    except (TypeError, ValueError) as e:
        raise ValueError(f"event 必须是 JSON 可序列化类型: {str(e)}")


def validate_context_kwargs(context_kwargs: Dict[str, Any]) -> None:
    """
    校验 context 自定义参数
    """
    if not isinstance(context_kwargs, dict):
        raise ValueError("context_kwargs 必须是字典类型")

    # 检查 JSON 可序列化性
    try:
        json.dumps(context_kwargs)
    except (TypeError, ValueError) as e:
        raise ValueError(f"context_kwargs 必须是 JSON 可序列化类型: {str(e)}")
