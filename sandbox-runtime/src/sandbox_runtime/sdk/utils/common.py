import ast
import logging
from typing import Any

# 设置日志记录器
logger = logging.getLogger("sandbox_runtime.sdk.utils.common")


def safe_unescape(s: str) -> str:
    """
    尝试使用 ast.literal_eval() 反向转义字符串。
    如果失败或本来就是正常字符串，则返回原字符串。

    Args:
        s: 要处理的字符串

    Returns:
        str: 处理后的字符串

    Examples:
        >>> safe_unescape("hello\\nworld")
        'hello\nworld'
        >>> safe_unescape("normal string")
        'normal string'
        >>> safe_unescape("\\"quoted\\"")
        '"quoted"'
    """
    logger.debug(f"Attempting to unescape string: {repr(s)}")

    if not isinstance(s, str):
        logger.debug(f"Input is not a string, returning as-is: {type(s)}")
        return s  # 只处理字符串

    try:
        # 只在字符串整体是一个字符串字面量的情况下再 eval
        # 构造 '"text"'，防止裸字符串错误
        evaluated = ast.literal_eval(f'"{s}"')
        logger.debug(f"Successfully unescaped string: {repr(evaluated)}")
        return evaluated
    except Exception as e:
        logger.debug(f"Failed to unescape string, returning original: {e}")
        return s


def safe_eval_literal(value: str) -> Any:
    """
    安全地使用 ast.literal_eval() 解析字符串字面量。

    Args:
        value: 要解析的字符串

    Returns:
        Any: 解析后的值

    Examples:
        >>> safe_eval_literal("123")
        123
        >>> safe_eval_literal("[1, 2, 3]")
        [1, 2, 3]
        >>> safe_eval_literal("{'key': 'value'}")
        {'key': 'value'}
    """
    logger.debug(f"Attempting to evaluate literal: {repr(value)}")

    if not isinstance(value, str):
        logger.debug(f"Input is not a string, returning as-is: {type(value)}")
        return value

    try:
        result = ast.literal_eval(value)
        logger.debug(f"Successfully evaluated literal: {type(result)} = {repr(result)}")
        return result
    except (ValueError, SyntaxError) as e:
        logger.debug(f"Failed to evaluate literal, returning original: {e}")
        return value


def is_valid_python_literal(value: str) -> bool:
    """
    检查字符串是否是有效的Python字面量。

    Args:
        value: 要检查的字符串

    Returns:
        bool: 是否是有效的Python字面量

    Examples:
        >>> is_valid_python_literal("123")
        True
        >>> is_valid_python_literal("[1, 2, 3]")
        True
        >>> is_valid_python_literal("invalid syntax")
        False
    """
    logger.debug(f"Checking if string is valid Python literal: {repr(value)}")

    if not isinstance(value, str):
        logger.debug(f"Input is not a string: {type(value)}")
        return False

    try:
        ast.literal_eval(value)
        logger.debug("String is a valid Python literal")
        return True
    except (ValueError, SyntaxError) as e:
        logger.debug(f"String is not a valid Python literal: {e}")
        return False
