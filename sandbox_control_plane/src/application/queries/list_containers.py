"""
列出容器查询

定义列出容器的查询 DTO。
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class ListContainersQuery:
    """列出容器查询"""
    status: Optional[str] = None
    runtime_type: Optional[str] = None
    limit: int = 50
    offset: int = 0
