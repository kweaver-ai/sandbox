"""
Docker 调度服务

实现调度策略，选择最优节点并创建容器。
集成预热池功能，加速会话创建。
"""
import asyncio
import logging
from typing import List, Optional
from datetime import datetime

from src.domain.services.scheduler import (
    IScheduler,
    RuntimeNode,
    ScheduleRequest,
)
from src.domain.repositories.runtime_node_repository import IRuntimeNodeRepository
from src.domain.repositories.template_repository import ITemplateRepository
from src.domain.value_objects.execution_request import ExecutionRequest
from src.infrastructure.container_scheduler.base import (
    IContainerScheduler,
    ContainerConfig,
)
from src.infrastructure.warm_pool.warm_pool_manager import WarmPoolManager
from src.infrastructure.executors import ExecutorClient

logger = logging.getLogger(__name__)

# 预热池配置（基于模板）
# 参考：docs/sandbox-design-v2.1.md 中的配置示例
WARM_POOL_CONFIG = {
    # 高频模板（如 Python 数据分析）
    "python-datascience": {
        "pool_size": 5,           # 目标池大小
        "min_size": 2,            # 最小保留
        "max_idle_time": 300,     # 最大空闲时间（秒）
    },
    # 低频模板
    "python-basic": {
        "pool_size": 3,
        "min_size": 1,
        "max_idle_time": 180,
    },
    "nodejs-basic": {
        "pool_size": 3,
        "min_size": 1,
        "max_idle_time": 180,
    },
}


class DockerSchedulerService(IScheduler):
    """
    Docker 调度服务

    实现调度策略：
    1. 优先使用预热池实例（快速启动）
    2. 其次考虑模板亲和性（镜像已缓存）
    3. 最后使用负载均衡（新建容器）

    预热池自动补充：
    - 在首次调度某模板时，检查预热池是否为空
    - 如果为空，自动补充到最小大小
    - 使用预热池实例后，异步补充一个新实例
    """

    def __init__(
        self,
        runtime_node_repo: IRuntimeNodeRepository,
        container_scheduler: IContainerScheduler,
        template_repo: ITemplateRepository,
        executor_client: Optional[ExecutorClient] = None,
        executor_port: int = 8080,
        warm_pool_manager: Optional[WarmPoolManager] = None,
        control_plane_url: str = "http://control-plane:8000",
        disable_bwrap: bool = False,
    ):
        self._runtime_node_repo = runtime_node_repo
        self._container_scheduler = container_scheduler
        self._template_repo = template_repo
        self._executor_client = executor_client or ExecutorClient()
        self._executor_port = executor_port
        self._control_plane_url = control_plane_url
        self._disable_bwrap = disable_bwrap
        self._warm_pool_manager = warm_pool_manager or WarmPoolManager(
            container_scheduler=container_scheduler,
            idle_timeout_seconds=1800,  # 30 分钟
            max_pool_size_per_template=5,  # 每个模板最多 5 个预热实例
            control_plane_url=control_plane_url,
            disable_bwrap=disable_bwrap,
        )

        # 用于记录分配给会话的预热实例
        self._session_warm_entries: dict = {}

        # 记录哪些模板已经初始化过预热池
        self._initialized_pools: set = set()

    async def schedule(self, request: ScheduleRequest) -> RuntimeNode:
        """
        调度会话到最优节点

        调度策略：
        1. 检查预热池中是否有可用实例
        2. 检查是否有已缓存该模板的节点
        3. 选择负载最低的健康节点

        预热池自动补充：
        - 如果是首次使用该模板，异步初始化预热池（不阻塞请求）
        """
        # 首次使用模板时，异步初始化预热池（不阻塞当前请求）
        if request.template_id not in self._initialized_pools:
            # 标记为已初始化，避免重复初始化
            self._initialized_pools.add(request.template_id)
            # 异步初始化预热池，不阻塞当前请求
            asyncio.create_task(self._ensure_warm_pool_initialized_async(request.template_id))

        # 1. 检查预热池
        warm_entry = await self._warm_pool_manager.acquire(
            request.template_id,
            request.session_id or ""
        )
        if warm_entry:
            # 从预热池分配，获取节点信息
            node = await self.get_node(warm_entry.node_id)
            if node:
                logger.info(
                    f"Allocated from warm pool: template={request.template_id}, "
                    f"container={warm_entry.container_id[:12]}, node={node.id}"
                )
                # 记录会话与预热实例的关联
                if request.session_id:
                    self._session_warm_entries[request.session_id] = warm_entry
                return node

        # 2. 获取所有健康节点
        healthy_nodes = await self.get_healthy_nodes()
        if not healthy_nodes:
            raise RuntimeError("No healthy runtime nodes available")

        # 3. 按模板亲和性排序
        affinity_nodes = [
            node for node in healthy_nodes
            if node.has_template(request.template_id)
        ]

        if affinity_nodes:
            # 选择亲和节点中负载最低的
            selected = self._select_least_loaded(affinity_nodes)
            logger.info(f"Selected affinity node: {selected.id} (template cached)")
            return selected

        # 4. 使用负载均衡选择节点
        selected = self._select_least_loaded(healthy_nodes)
        logger.info(f"Selected node by load balancing: {selected.id}")
        return selected

    async def get_node(self, node_id: str) -> Optional[RuntimeNode]:
        """获取指定节点"""
        node_model = await self._runtime_node_repo.find_by_id(node_id)
        if not node_model:
            return None
        return node_model.to_runtime_node()

    async def get_healthy_nodes(self) -> List[RuntimeNode]:
        """获取所有健康节点"""
        nodes = await self._runtime_node_repo.find_by_status("online")
        return [node.to_runtime_node() for node in nodes]

    async def mark_node_unhealthy(self, node_id: str) -> None:
        """标记节点为不健康"""
        await self._runtime_node_repo.update_status(node_id, "offline")
        logger.warning(f"Marked node {node_id} as unhealthy")

    def _select_least_loaded(self, nodes: List[RuntimeNode]) -> RuntimeNode:
        """
        从节点列表中选择负载最低的节点

        选择逻辑：
        1. 负载比率最低
        2. 如果比率相同，选择会话数最少的
        """
        return min(
            nodes,
            key=lambda n: (n.get_load_ratio(), n.session_count)
        )

    async def create_container_for_session(
        self,
        session_id: str,
        template_id: str,
        image: str,
        resource_limit,
        env_vars: dict,
        workspace_path: str,
    ) -> str:
        """
        为会话创建容器

        Returns:
            容器ID
        """
        # 检查是否已有预热实例分配给此会话
        warm_entry = self._session_warm_entries.get(session_id)
        if warm_entry:
            logger.info(
                f"Using warm pool container for session {session_id}: "
                f"{warm_entry.container_id[:12]}"
            )
            # 异步补充预热池（在后台任务中执行）
            asyncio.create_task(
                self._replenish_warm_pool_after_use(template_id, image)
            )
            return warm_entry.container_id

        # 没有预热实例，需要创建新容器
        # 注意：调度已经在 create_session 中完成，这里不需要再次调度
        # 直接使用默认节点
        nodes = await self.get_healthy_nodes()
        if not nodes:
            raise RuntimeError("No healthy runtime nodes available")

        node = nodes[0]  # 使用第一个健康节点

        # 创建容器配置
        config = ContainerConfig(
            image=image,
            name=f"sandbox-{session_id}",
            env_vars={
                **env_vars,
                "SESSION_ID": session_id,
                "WORKSPACE_PATH": workspace_path,
                "CONTROL_PLANE_URL": self._control_plane_url,
                "DISABLE_BWRAP": "true" if self._disable_bwrap else "false",
            },
            cpu_limit=resource_limit.cpu,
            memory_limit=resource_limit.memory,
            disk_limit=resource_limit.disk,
            workspace_path=workspace_path,
            labels={
                "session_id": session_id,
                "template_id": template_id,
                "managed_by": "sandbox-control-plane",
            },
        )

        # 异步创建容器（不阻塞当前请求）
        # 使用 asyncio.shield 确保后台任务不会因为请求结束而取消
        async def _create_and_start():
            try:
                container_id = await self._container_scheduler.create_container(config)
                await self._container_scheduler.start_container(container_id)
                logger.info(
                    f"Background task: Created and started container {container_id} "
                    f"for session {session_id} on node {node.id}"
                )
            except Exception as e:
                logger.error(f"Background task: Failed to create/start container for session {session_id}: {e}")

        # 在后台执行容器创建，不等待结果
        asyncio.create_task(_create_and_start())

        logger.info(
            f"Initiated background container creation for session {session_id} "
            f"on node {node.id}"
        )

        # 立即返回临时 container_id，不等待容器创建完成
        return f"sandbox-{session_id}"

    async def destroy_container(
        self,
        container_id: str,
        timeout: int = 10
    ) -> None:
        """销毁容器"""
        # 检查是否是预热池实例
        warm_entry = None
        for entry in self._session_warm_entries.values():
            if entry.container_id == container_id:
                warm_entry = entry
                break

        if warm_entry:
            # 释放预热实例（使其可供其他会话使用）
            await self._warm_pool_manager.release(container_id)
            # 清理会话关联
            sessions_to_remove = [
                sid for sid, entry in self._session_warm_entries.items()
                if entry.container_id == container_id
            ]
            for sid in sessions_to_remove:
                del self._session_warm_entries[sid]
            logger.info(f"Released warm pool container {container_id[:12]}")
        else:
            # 普通容器，直接销毁
            try:
                await self._container_scheduler.stop_container(container_id, timeout=timeout)
                await self._container_scheduler.remove_container(container_id)
                logger.info(f"Destroyed container {container_id}")
            except Exception as e:
                logger.error(f"Failed to destroy container {container_id}: {e}")
                raise

    async def get_container_info(self, container_id: str):
        """获取容器信息"""
        return await self._container_scheduler.get_container_status(container_id)

    async def acquire_warm_instance(self, template_id: str) -> Optional[RuntimeNode]:
        """
        从预热池获取实例

        实现 IScheduler 接口的抽象方法。

        Returns:
            RuntimeNode 如果成功分配，None 如果预热池为空
        """
        warm_entry = await self._warm_pool_manager.acquire(
            template_id=template_id,
            session_id=""  # 无会话 ID，表示直接从预热池获取
        )
        if warm_entry:
            node = await self.get_node(warm_entry.node_id)
            if node:
                logger.info(
                    f"Acquired warm instance from pool: template={template_id}, "
                    f"container={warm_entry.container_id[:12]}, node={node.id}"
                )
                return node
        return None

    async def add_warm_instance(
        self,
        template_id: str,
        node_id: str,
        container_id: str
    ) -> None:
        """
        添加预热实例

        实现 IScheduler 接口的抽象方法。
        将已存在的容器添加到预热池中管理。
        """
        from src.infrastructure.warm_pool.warm_pool_entry import WarmPoolEntry

        # 创建预热池条目
        entry = WarmPoolEntry(
            template_id=template_id,
            node_id=node_id,
            container_id=container_id,
            container_name="",  # 已存在的容器，可能没有名称
            image="",  # 已存在的容器
            status="available",
            created_at=datetime.now(),
        )

        # 将预热实例添加到管理器
        await self._warm_pool_manager.add(entry)

        logger.info(
            f"Added warm instance to pool: template={template_id}, "
            f"container={container_id[:12]}, node={node_id}"
        )

    async def remove_warm_instance(
        self,
        template_id: str,
        node_id: str
    ) -> None:
        """
        移除预热实例

        实现 IScheduler 接口的抽象方法。
        从预热池中移除指定节点上的指定模板实例。
        """
        # 获取该模板的预热池
        pool = self._warm_pool_manager._warm_pool.get(template_id, [])

        # 找到并移除匹配的条目
        to_remove = []
        for entry in pool:
            if entry.node_id == node_id and entry.template_id == template_id:
                to_remove.append(entry)

        # 移除并销毁容器
        for entry in to_remove:
            try:
                # 从容器索引中移除
                if entry.container_id in self._warm_pool_manager._container_index:
                    del self._warm_pool_manager._container_index[entry.container_id]

                # 从预热池中移除
                pool.remove(entry)

                # 销毁容器
                await self._warm_pool_manager._container_scheduler.remove_container(entry.container_id)

                logger.info(
                    f"Removed warm instance: template={template_id}, "
                    f"container={entry.container_id[:12]}, node={node_id}"
                )
            except Exception as e:
                logger.warning(f"Failed to remove warm instance {entry.container_id[:12]}: {e}")

    async def _ensure_warm_pool_initialized(self, template_id: str) -> None:
        """
        确保预热池已初始化到最小大小

        在首次使用某个模板时调用，自动补充预热池。
        """
        config = WARM_POOL_CONFIG.get(template_id, {})
        min_size = config.get("min_size", 1)

        # 获取模板信息
        template = await self._template_repo.find_by_id(template_id)
        if not template:
            logger.warning(f"Template {template_id} not found, skipping warm pool initialization")
            return

        # 获取默认节点
        nodes = await self.get_healthy_nodes()
        if not nodes:
            logger.warning("No healthy nodes available for warm pool initialization")
            return

        default_node = nodes[0]

        try:
            # 补充到最小大小
            await self._warm_pool_manager.replenish(
                template_id=template_id,
                target_size=min_size,
                image=template.image,
                node_id=default_node.id,
                resource_limit=template.default_resources,
                env_vars={},
                workspace_path_template="s3://sandbox-bucket/sessions/{session_id}",
            )
            logger.info(
                f"Initialized warm pool for {template_id}: "
                f"min_size={min_size}, image={template.image}"
            )
        except Exception as e:
            logger.error(f"Failed to initialize warm pool for {template_id}: {e}")

    async def _ensure_warm_pool_initialized_async(self, template_id: str) -> None:
        """
        异步初始化预热池（不阻塞请求）

        此方法作为后台任务运行，不阻塞 API 请求。
        如果初始化失败，仅记录错误，不影响请求处理。
        """
        try:
            await self._ensure_warm_pool_initialized(template_id)
            logger.info(f"Background warm pool initialization completed for {template_id}")
        except Exception as e:
            logger.error(f"Background warm pool initialization failed for {template_id}: {e}")

    async def _replenish_warm_pool_after_use(self, template_id: str, image: str) -> None:
        """
        使用预热池实例后，异步补充一个新实例

        这确保预热池始终保持可用状态。
        """
        try:
            # 获取默认节点
            nodes = await self.get_healthy_nodes()
            if not nodes:
                logger.warning("No healthy nodes available for warm pool replenishment")
                return

            default_node = nodes[0]

            # 获取模板配置
            config = WARM_POOL_CONFIG.get(template_id, {})
            pool_size = config.get("pool_size", 2)

            # 补充到目标大小
            await self._warm_pool_manager.replenish(
                template_id=template_id,
                target_size=pool_size,
                image=image,
                node_id=default_node.id,
                resource_limit=None,  # 使用模板默认值
                env_vars={},
                workspace_path_template="s3://sandbox-bucket/sessions/{session_id}",
            )
            logger.info(f"Replenished warm pool for {template_id}")
        except Exception as e:
            logger.error(f"Failed to replenish warm pool for {template_id}: {e}")

    async def execute(
        self,
        session_id: str,
        container_id: str,
        execution_request: ExecutionRequest,
    ) -> str:
        """
        提交执行请求到容器内的执行器

        通过 HTTP 与运行在容器内的 sandbox-executor 通信。

        Args:
            session_id: 会话 ID
            container_id: 容器 ID
            execution_request: 执行请求

        Returns:
            execution_id: 执行任务 ID

        Raises:
            ConnectionError: 无法连接到执行器
            TimeoutError: 执行器响应超时
        """
        # 获取容器信息以构建执行器 URL
        container_info = await self._container_scheduler.get_container_status(container_id)

        # 构建执行器 URL
        # 使用容器名称在 Docker 内部网络中进行通信
        # 容器名称格式: sandbox-{session_id}
        container_name = container_info.name
        executor_url = f"http://{container_name}:{self._executor_port}"

        logger.info(f"Submitting execution to executor: {executor_url}, session_id={session_id}, container_id={container_id}")

        # 使用执行器客户端提交请求
        try:
            execution_id = await self._executor_client.submit_execution(
                executor_url=executor_url,
                execution_id=execution_request.execution_id or "",
                session_id=session_id,
                code=execution_request.code,
                language=execution_request.language,
                event=execution_request.event,
                timeout=execution_request.timeout,
                env_vars=execution_request.env_vars,
            )

            logger.info(f"Execution submitted successfully: execution_id={execution_id}, session_id={session_id}")

            return execution_id

        except Exception as e:
            logger.error(f"Failed to submit execution to executor: {executor_url}, error={e}")
            raise
