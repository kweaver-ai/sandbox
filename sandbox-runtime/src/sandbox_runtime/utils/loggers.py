import logging
import sys
from pathlib import Path
from typing import Optional

from sandbox_runtime.settings import get_settings

# 定义日志格式
DEFAULT_LOG_FORMAT = (
    "%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d | %(message)s"
)
DEFAULT_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# 定义日志级别
LOG_LEVELS = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}


def setup_logger(
    name: str,
    level: str = "INFO",
    log_format: str = DEFAULT_LOG_FORMAT,
    date_format: str = DEFAULT_DATE_FORMAT,
    log_file: Optional[str] = None,
    console_output: bool = True,
) -> logging.Logger:
    """
    设置并返回一个配置好的logger实例

    Args:
        name: logger名称
        level: 日志级别 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_format: 日志格式
        date_format: 日期格式
        log_file: 日志文件路径，如果为None则只输出到控制台
        console_output: 是否输出到控制台

    Returns:
        logging.Logger: 配置好的logger实例
    """
    # 获取logger实例
    logger = logging.getLogger(name)

    # 设置日志级别
    log_level = LOG_LEVELS.get(level.upper(), logging.INFO)
    logger.setLevel(log_level)

    # 清除已有的handlers
    logger.handlers.clear()

    # 创建格式化器
    formatter = logging.Formatter(log_format, date_format)

    # 添加控制台处理器
    if console_output:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    # 添加文件处理器
    if log_file:
        # 确保日志目录存在
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger


settings = get_settings()


def get_logger(
    name: str = "sandbox",
    level: str = "INFO",
    log_file: Optional[str] = None,
) -> logging.Logger:
    """
    获取一个配置好的logger实例的便捷函数

    Args:
        name: logger名称
        level: 日志级别
        log_file: 日志文件路径

    Returns:
        logging.Logger: 配置好的logger实例
    """
    # 延迟获取设置以避免循环依赖
    settings = get_settings()
    actual_level = level if level is not None else settings.log_level
    
    return setup_logger(
        name=name,
        level=actual_level,
        log_file=log_file,
    )


# 延迟创建logger实例以避免循环依赖
def _get_default_logger():
    settings = get_settings()
    return get_logger(level=settings.log_level)
    
def _get_file_logger():
    settings = get_settings()
    return get_logger(level=settings.log_level, log_file="logs/app.log")

DEFAULT_LOGGER = _get_default_logger()
FILE_LOGGER = _get_file_logger()


# 使用示例
if __name__ == "__main__":
    # 获取一个默认的logger
    logger = get_logger()
    logger.info("This is an info message")
    logger.error("This is an error message")

    # 获取一个带文件输出的logger
    file_logger = get_logger(name="file_logger", level="DEBUG", log_file="logs/app.log")
    file_logger.debug("This is a debug message")
    file_logger.warning("This is a warning message")
