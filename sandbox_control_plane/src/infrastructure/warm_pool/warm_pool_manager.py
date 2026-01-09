"""
预热池管理器

管理预热池中的容器实例，提供获取、释放、补充等功能。
"""
import asyncio
import logging
from collections import defaultdict
from typing import Dict, List, Optional
from datetime import datetime

from sandbox_control_plane.src.infrastructure.warm_pool.warm_pool_entry import WarmPoolEntry
from sandbox_control_plane.src.infrastructure.container_scheduler.base import IContainerScheduler, ContainerConfig

logger = logging.getLogger(__name__)


class WarmPoolManager:
    """
    预热池管理器

    维护预先创建的容器实例，加速会话创建。
    """

    def __init__(
        self,
        container_scheduler: IContainerScheduler,
        idle_timeout_seconds: int = 1800,  # 30 分钟
        max_pool_size_per_template: int = 5,  # 每个模板最大预热数量
    ):
        self._container_scheduler = container_scheduler
        self._idle_timeout_seconds = idle_timeout_seconds
        self._max_pool_size_per_template = max_pool_size_per_template

        # 预热池存储：template_id -> List[WarmPoolEntry]
        self._warm_pool: Dict[str, List[WarmPoolEntry]] = defaultdict(list)

        # 索引：container_id -> WarmPoolEntry
        self._container_index: Dict[str, WarmPoolEntry] = {}

        # 锁：用于并发控制
        self._lock = asyncio.Lock()

    async def acquire(self, template_id: str, session_id: str) -> Optional[WarmPoolEntry]:
        """
        从预热池获取可用容器

        Args:
            template_id: 模板 ID
            session_id: 会话 ID

        Returns:
            预热池条目，如果没有可用容器则返回 None
        """
        async with self._lock:
            # 1. 清理过期的条目
            await self._cleanup_expired(template_id)

            # 2. 查找可用的条目
            pool = self._warm_pool.get(template_id, [])
            for entry in pool:
                if entry.is_available():
                    entry.allocate(session_id)
                    logger.info(
                        f"Allocated warm instance: template={template_id}, "
                        f"container={entry.container_id[:12]}, session={session_id}"
                    )
                    return entry

            logger.debug(f"No available warm instance for template={template_id}")
            return None

    async def release(self, container_id: str) -> None:
        """
        释放容器（容器已使用完毕）

        Args:
            container_id: 容器 ID
        """
        async with self._lock:
            entry = self._container_index.get(container_id)
            if entry and entry.status == "allocated":
                # 销毁容器
                try:
                    await self._container_scheduler.remove_container(container_id)
                    logger.info(f"Destroyed container after use: {container_id[:12]}")
                except Exception as e:
                    logger.warning(f"Failed to destroy container {container_id[:12]}: {e}")

                # 从索引中移除
                if entry in self._warm_pool.get(entry.template_id, []):
                    self._warm_pool[entry.template_id].remove(entry)
                del self._container_index[container_id]

    async def add(self, entry: WarmPoolEntry) -> None:
        """
        添加条目到预热池

        Args:
            entry: 预热池条目
        """
        async with self._lock:
            pool = self._warm_pool[entry.template_id]

            # 检查是否超过最大容量
            if len(pool) >= self._max_pool_size_per_template:
                logger.warning(
                    f"Warm pool full for template={entry.template_id}, "
                    f"max={self._max_pool_size_per_template}"
                )
                # 销毁容器
                try:
                    await self._container_scheduler.remove_container(entry.container_id)
                except Exception as e:
                    logger.warning(f"Failed to destroy excess container: {e}")
                return

            pool.append(entry)
            self._container_index[entry.container_id] = entry
            logger.info(
                f"Added to warm pool: template={entry.template_id}, "
                f"container={entry.container_id[:12]}, pool_size={len(pool)}"
            )

    async def replenish(
        self,
        template_id: str,
        target_size: int,
        image: str,
        node_id: str,
        resource_limit,
        env_vars: dict,
        workspace_path_template: str,
    ) -> int:
        """
        补充预热池

        Args:
            template_id: 模板 ID
            target_size: 目标大小
            image: 镜像名称
            node_id: 节点 ID
            resource_limit: 资源限制
            env_vars: 环境变量
            workspace_path_template: 工作空间路径模板

        Returns:
            创建的容器数量
        """
        async with self._lock:
            pool = self._warm_pool.get(template_id, [])
            current_size = len([e for e in pool if e.is_available()])
            needed = target_size - current_size

            if needed <= 0:
                return 0

            created_count = 0
            for i in range(needed):
                try:
                    # 创建容器
                    container_name = f"warm-{template_id}-{i}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
                    entry = await self._create_warm_entry(
                        template_id=template_id,
                        image=image,
                        node_id=node_id,
                        container_name=container_name,
                        resource_limit=resource_limit,
                        env_vars=env_vars,
                        workspace_path_template=workspace_path_template,
                    )
                    await self.add(entry)
                    created_count += 1
                except Exception as e:
                    logger.error(f"Failed to create warm instance: {e}")
                    break

            logger.info(
                f"Replenished warm pool: template={template_id}, "
                f"created={created_count}, pool_size={len(pool)}"
            )
            return created_count

    async def cleanup_idle(self, idle_timeout_seconds: Optional[int] = None) -> int:
        """
        清理空闲的预热实例

        Args:
            idle_timeout_seconds: 空闲超时时间，默认使用构造函数设置的值

        Returns:
            清理的容器数量
        """
        async with self._lock:
            timeout = idle_timeout_seconds or self._idle_timeout_seconds
            cleaned_count = 0

            for template_id, pool in list(self._warm_pool.items()):
                to_remove = []

                for entry in pool:
                    if entry.is_available() and entry.is_expired(timeout):
                        to_remove.append(entry)

                # 移除并销毁
                for entry in to_remove:
                    try:
                        await self._container_scheduler.remove_container(entry.container_id)
                        pool.remove(entry)
                        del self._container_index[entry.container_id]
                        cleaned_count += 1
                        logger.info(
                            f"Cleaned idle warm instance: template={template_id}, "
                            f"container={entry.container_id[:12]}"
                        )
                    except Exception as e:
                        logger.warning(
                            f"Failed to clean warm instance {entry.container_id[:12]}: {e}"
                        )

            return cleaned_count

    def get_pool_size(self, template_id: str) -> int:
        """获取指定模板的预热池大小"""
        pool = self._warm_pool.get(template_id, [])
        return len([e for e in pool if e.is_available()])

    def get_all_pool_sizes(self) -> Dict[str, int]:
        """获取所有模板的预热池大小"""
        return {
            template_id: len([e for e in pool if e.is_available()])
            for template_id, pool in self._warm_pool.items()
        }

    async def _create_warm_entry(
        self,
        template_id: str,
        image: str,
        node_id: str,
        container_name: str,
        resource_limit,
        env_vars: dict,
        workspace_path_template: str,
    ) -> WarmPoolEntry:
        """创建预热池条目"""
        # 如果 resource_limit 为 None，使用默认值
        if resource_limit is None:
            from sandbox_control_plane.src.domain.value_objects.resource_limit import ResourceLimit
            resource_limit = ResourceLimit.default()

        # 创建容器配置
        config = ContainerConfig(
            image=image,
            name=container_name,
            env_vars={
                **env_vars,
                "WARM_POOL": "true",
                "TEMPLATE_ID": template_id,
            },
            cpu_limit=resource_limit.cpu,
            memory_limit=resource_limit.memory,
            disk_limit=resource_limit.disk,
            workspace_path=workspace_path_template.format(session_id="warm"),
            labels={
                "warm_pool": "true",
                "template_id": template_id,
            },
        )

        # 创建并启动容器
        container_id = await self._container_scheduler.create_container(config)
        await self._container_scheduler.start_container(container_id)

        # 创建预热池条目
        entry = WarmPoolEntry(
            template_id=template_id,
            node_id=node_id,
            container_id=container_id,
            container_name=container_name,
            image=image,
            status="available",
            created_at=datetime.now(),
        )

        return entry

    async def _cleanup_expired(self, template_id: str) -> None:
        """清理指定模板的过期条目"""
        pool = self._warm_pool.get(template_id, [])
        to_remove = []

        for entry in pool:
            if entry.is_available() and entry.is_expired(self._idle_timeout_seconds):
                to_remove.append(entry)

        for entry in to_remove:
            try:
                await self._container_scheduler.remove_container(entry.container_id)
                pool.remove(entry)
                del self._container_index[entry.container_id]
            except Exception as e:
                logger.warning(f"Failed to cleanup expired entry: {e}")
