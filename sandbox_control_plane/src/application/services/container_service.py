"""
容器应用服务

编排容器监控相关的用例。
"""
from typing import List, Optional

from src.domain.entities.container import Container
from src.domain.repositories.container_repository import IContainerRepository
from src.application.queries.list_containers import ListContainersQuery
from src.application.dtos.container_dto import ContainerDTO
from src.shared.errors.domain import NotFoundError


class ContainerService:
    """
    容器应用服务

    编排容器查询、监控等用例。
    """

    def __init__(
        self,
        container_repo: IContainerRepository,
    ):
        self._container_repo = container_repo

    async def list_containers(self, query: ListContainersQuery) -> List[ContainerDTO]:
        """列出容器用例"""
        containers = await self._container_repo.find_all(
            status=query.status,
            runtime_type=query.runtime_type,
            limit=query.limit,
            offset=query.offset,
        )

        return [ContainerDTO.from_entity(c) for c in containers]

    async def get_container(self, container_id: str) -> ContainerDTO:
        """获取容器详情用例"""
        container = await self._container_repo.find_by_id(container_id)
        if not container:
            raise NotFoundError(f"Container not found: {container_id}")

        return ContainerDTO.from_entity(container)

    async def get_container_logs(
        self,
        container_id: str,
        tail: int = 100
    ) -> str:
        """
        获取容器日志用例

        流程：
        1. 查找容器
        2. 从运行时获取日志
        """
        # 1. 查找容器
        container = await self._container_repo.find_by_id(container_id)
        if not container:
            raise NotFoundError(f"Container not found: {container_id}")

        # 2. 从运行时获取日志
        # TODO: 实现从运行时获取日志
        # runtime_client = self._runtime_factory.get_client(container.runtime_type)
        # logs = await runtime_client.get_container_logs(container_id, tail)

        return ""  # 返回日志字符串
