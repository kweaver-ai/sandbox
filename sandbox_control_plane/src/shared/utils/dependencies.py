"""
依赖解析工具

用于处理 Python 依赖包的格式转换和解析。
"""
import json
from typing import List, Optional, Union


def parse_dependencies_to_pip_specs(dependencies: Optional[List[Union[str, dict]]]) -> List[str]:
    """
    将依赖列表转换为 pip 规范格式

    Args:
        dependencies: 依赖列表，元素可以是字符串或字典
            - 字符串格式: "requests==2.31.0" 或 "requests"
            - 字典格式: {"name": "requests", "version": "==2.31.0"}

    Returns:
        pip 规范列表，如 ["requests==2.31.0", "pandas>=2.0"]
    """
    if not dependencies:
        return []

    pip_specs = []
    for dep in dependencies:
        if isinstance(dep, dict):
            name = dep.get("name", "")
            version = dep.get("version", "")
            if version:
                pip_specs.append(f"{name}{version}")
            else:
                pip_specs.append(name)
        elif isinstance(dep, str):
            pip_specs.append(dep)

    return pip_specs


def format_dependencies_for_script(dependencies: Optional[List[Union[str, dict]]]) -> tuple[str, str]:
    """
    格式化依赖列表用于 shell 脚本

    Args:
        dependencies: 依赖列表

    Returns:
        (deps_json, deps_list) 元组
        - deps_json: JSON 字符串格式的依赖列表
        - deps_list: 空格分隔的 pip 规范字符串，用于 shell 脚本
    """
    if not dependencies:
        return "", ""

    pip_specs = parse_dependencies_to_pip_specs(dependencies)
    deps_json = json.dumps(dependencies)
    deps_list = " ".join(f'"{spec}"' for spec in pip_specs)

    return deps_json, deps_list
