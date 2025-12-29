"""
统一错误码定义
"""

from enum import IntEnum


class ExitCode(IntEnum):
    """
    标准化退出状态码
    """

    SUCCESS = 0  # 执行成功
    CODE_LOAD_ERROR = 1  # 代码加载失败
    HANDLER_EXECUTION_ERROR = 2  # handler 执行异常
    JSON_SERIALIZATION_ERROR = 3  # JSON 序列化失败
    NO_AVAILABLE_SANDBOX = 4  # 无可用沙箱
    EXECUTION_TIMEOUT = 5  # 执行超时
    SYSTEM_ERROR = 6  # 系统错误
    EMPTY_CODE = 7  # 代码为空

    @classmethod
    def get_description(cls, code: int) -> str:
        """
        获取错误码描述
        """
        descriptions = {
            cls.SUCCESS: "执行成功",
            cls.CODE_LOAD_ERROR: "代码加载失败 - 语法错误或无 handler 函数",
            cls.HANDLER_EXECUTION_ERROR: "handler 执行异常 - 业务逻辑错误",
            cls.JSON_SERIALIZATION_ERROR: "JSON 序列化失败 - 数据格式错误",
            cls.NO_AVAILABLE_SANDBOX: "无可用沙箱 - 沙箱池已满",
            cls.EXECUTION_TIMEOUT: "执行超时 - 超过时间限制",
            cls.SYSTEM_ERROR: "系统错误 - 沙箱启动失败",
            cls.EMPTY_CODE: "代码为空 - handler_code 不能为空",
        }
        return descriptions.get(code, "未知错误")


class SandboxException(Exception):
    """
    沙箱异常基类
    """

    def __init__(self, message: str, exit_code: int = ExitCode.SYSTEM_ERROR):
        self.message = message
        self.exit_code = exit_code
        super().__init__(message)


class CodeLoadError(SandboxException):
    """
    代码加载错误
    """

    def __init__(self, message: str):
        super().__init__(message, ExitCode.CODE_LOAD_ERROR)


class HandlerExecutionError(SandboxException):
    """
    Handler 执行错误
    """

    def __init__(self, message: str):
        super().__init__(message, ExitCode.HANDLER_EXECUTION_ERROR)


class TimeoutError(SandboxException):
    """
    执行超时错误
    """

    def __init__(self, message: str):
        super().__init__(message, ExitCode.EXECUTION_TIMEOUT)


class NoAvailableSandboxError(SandboxException):
    """
    无可用沙箱错误
    """

    def __init__(self, message: str = "沙箱池已满,无可用沙箱"):
        super().__init__(message, ExitCode.NO_AVAILABLE_SANDBOX)
