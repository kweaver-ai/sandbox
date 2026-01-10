"""
容器仓储接口

定义容器持久化的抽象接口（Port）。
"""
from abc import ABC, abstractmethod
from typing import List, Optional

from src.domain.entities.container import Container


class IContainerRepository(ABC):
    """
    容器仓储接口

    这是领域层定义的 Port，由基础设施层实现 Adapter。
    """

    @abstractmethod
    async def save(self, container: Container) -> None:
        """保存容器（创建或更新）"""
        pass

    @abstractmethod
    async def find_by_id(self, container_id: str) -> Optional[Container]:
        """根据 ID 查找容器"""
        pass

    @abstractmethod
    async def find_by_session_id(self, session_id: str) -> Optional[Container]:
        """根据会话 ID 查找容器"""
        pass

    @abstractmethod
    async def find_all(
        self,
        status: Optional[str] = None,
        runtime_type: Optional[str] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[Container]:
        """查找所有容器"""
        pass

    @abstractmethod
    async def delete(self, container_id: str) -> None:
        """删除容器"""
        pass

    @abstractmethod
    async def exists(self, container_id: str) -> bool:
        """检查容器是否存在"""
        pass

    @abstractmethod
    async def count(self) -> int:
        """统计容器总数"""
        pass

    @abstractmethod
    async def count_by_status(self, status: str) -> int:
        """根据状态统计容器数量"""
        pass
