"""
依赖注入配置

配置和提供应用所需的所有依赖项。
"""
from functools import lru_cache
from typing import Optional

from fastapi import FastAPI, Depends

from sandbox_control_plane.src.application.services.session_service import SessionService
from sandbox_control_plane.src.application.services.template_service import TemplateService
from sandbox_control_plane.src.application.services.container_service import ContainerService
from sandbox_control_plane.src.application.services.file_service import FileService

from sandbox_control_plane.src.domain.repositories.session_repository import ISessionRepository
from sandbox_control_plane.src.domain.repositories.execution_repository import IExecutionRepository
from sandbox_control_plane.src.domain.repositories.template_repository import ITemplateRepository
from sandbox_control_plane.src.domain.repositories.container_repository import IContainerRepository
from sandbox_control_plane.src.domain.services.scheduler import IScheduler, RuntimeNode
from sandbox_control_plane.src.domain.services.storage import IStorageService

from sandbox_control_plane.src.infrastructure.persistence.database import db_manager

# Configuration flag to switch between Mock and SQL repositories
USE_SQL_REPOSITORIES = True  # Set to False to use Mock repositories

# Configuration flag to switch between Mock and Docker scheduler
USE_DOCKER_SCHEDULER = False  # Set to False to use Mock scheduler

# Docker configuration
DOCKER_URL = "unix:///Users/guochenguang/.docker/run/docker.sock"  # Docker Desktop for Mac


# Mock implementations for development
class MockSessionRepository(ISessionRepository):
    """Mock 会话仓储（用于开发测试）"""

    def __init__(self):
        self._sessions = {}

    async def save(self, session):
        self._sessions[session.id] = session

    async def find_by_id(self, session_id: str):
        return self._sessions.get(session_id)

    async def find_by_status(self, status: str, limit: int = 100):
        return [s for s in self._sessions.values() if s.status == status][:limit]

    async def find_by_template(self, template_id: str):
        return [s for s in self._sessions.values() if s.template_id == template_id]

    async def find_idle_sessions(self, threshold):
        return []

    async def find_expired_sessions(self, threshold):
        return []

    async def delete(self, session_id: str) -> None:
        if session_id in self._sessions:
            del self._sessions[session_id]

    async def exists(self, session_id: str) -> bool:
        return session_id in self._sessions

    async def count_by_status(self, status: str) -> int:
        return sum(1 for s in self._sessions.values() if s.status == status)

    async def count_by_node(self, runtime_node: str) -> int:
        return sum(1 for s in self._sessions.values() if getattr(s, 'node_id', None) == runtime_node)


class MockExecutionRepository(IExecutionRepository):
    """Mock 执行仓储（用于开发测试）"""

    def __init__(self):
        self._executions = {}

    async def save(self, execution):
        self._executions[execution.id] = execution

    async def find_by_id(self, execution_id: str):
        return self._executions.get(execution_id)

    async def find_by_session_id(self, session_id: str, limit: int = 100):
        return [e for e in self._executions.values() if e.session_id == session_id][:limit]

    async def find_by_status(self, status: str, limit: int = 100):
        return [e for e in self._executions.values() if e.status == status][:limit]

    async def find_crashed_executions(self, max_retry_count: int):
        return []

    async def find_heartbeat_timeouts(self, timeout_threshold):
        return []

    async def delete(self, execution_id: str) -> None:
        if execution_id in self._executions:
            del self._executions[execution_id]

    async def delete_by_session_id(self, session_id: str) -> None:
        to_delete = [eid for eid, e in self._executions.items() if e.session_id == session_id]
        for eid in to_delete:
            del self._executions[eid]

    async def count_by_status(self, status: str) -> int:
        return sum(1 for e in self._executions.values() if e.status == status)


class MockTemplateRepository(ITemplateRepository):
    """Mock 模板仓储（用于开发测试）"""

    def __init__(self):
        from datetime import datetime
        from sandbox_control_plane.src.domain.entities.template import Template
        from sandbox_control_plane.src.domain.value_objects.resource_limit import ResourceLimit

        # 默认模板
        self._templates = {
            "python-basic": Template(
                id="python-basic",
                name="Python Basic",
                image="python:3.11-slim",
                base_image="python:3.11-slim",
                pre_installed_packages=[],
                default_resources=ResourceLimit.default(),
                created_at=datetime.now(),
                updated_at=datetime.now(),
            ),
            "string": Template(
                id="string",
                name="Test Template",
                image="python:3.11-slim",
                base_image="python:3.11-slim",
                pre_installed_packages=[],
                default_resources=ResourceLimit.default(),
                created_at=datetime.now(),
                updated_at=datetime.now(),
            ),
        }

    async def save(self, template):
        self._templates[template.id] = template

    async def find_by_id(self, template_id: str):
        return self._templates.get(template_id)

    async def find_by_name(self, name: str):
        for t in self._templates.values():
            if t.name == name:
                return t
        return None

    async def find_all(self, offset: int = 0, limit: int = 100):
        return list(self._templates.values())[offset:offset+limit]

    async def delete(self, template_id: str) -> None:
        if template_id in self._templates:
            del self._templates[template_id]

    async def exists(self, template_id: str) -> bool:
        return template_id in self._templates

    async def exists_by_name(self, name: str) -> bool:
        return any(t.name == name for t in self._templates.values())

    async def count(self) -> int:
        return len(self._templates)


class MockContainerRepository(IContainerRepository):
    """Mock 容器仓储（用于开发测试）"""

    def __init__(self):
        self._containers = {}

    async def save(self, container):
        self._containers[container.id] = container

    async def find_by_id(self, container_id: str):
        return self._containers.get(container_id)

    async def find_by_session_id(self, session_id: str):
        for c in self._containers.values():
            if c.session_id == session_id:
                return c
        return None

    async def find_all(self, status=None, runtime_type=None, offset=0, limit=100):
        return list(self._containers.values())[offset:offset+limit]

    async def delete(self, container_id: str) -> None:
        if container_id in self._containers:
            del self._containers[container_id]

    async def exists(self, container_id: str) -> bool:
        return container_id in self._containers

    async def count(self) -> int:
        return len(self._containers)

    async def count_by_status(self, status: str) -> int:
        return sum(1 for c in self._containers.values() if c.status == status)


class MockScheduler(IScheduler):
    """Mock 调度器（用于开发测试）"""

    async def schedule(self, request):
        # 返回一个 mock 运行时节点
        return RuntimeNode(
            id="node-1",
            type="docker",
            url="http://localhost:2375",
            status="healthy",
            cpu_usage=0.3,
            mem_usage=0.4,
            session_count=5,
            max_sessions=100,
            cached_templates=["python-basic", "string"],
        )

    async def get_node(self, node_id: str):
        return None

    async def get_healthy_nodes(self):
        return []

    async def mark_node_unhealthy(self, node_id: str) -> None:
        pass

    async def add_warm_instance(self, template_id: str, node_id: str, container_id: str) -> None:
        pass

    async def remove_warm_instance(self, template_id: str, node_id: str) -> None:
        pass

    async def acquire_warm_instance(self, template_id: str):
        return None


class MockRuntimeNodeRepository:
    """Mock 运行时节点仓储（用于开发测试）"""

    class _NodeModel:
        def __init__(self, id, type, url, status, **kwargs):
            self.id = id
            self.type = type
            self.url = url
            self.status = status
            self.cpu_usage = kwargs.get('cpu_usage', 0.3)
            self.mem_usage = kwargs.get('mem_usage', 0.4)
            self.session_count = kwargs.get('session_count', 0)
            self.max_sessions = kwargs.get('max_sessions', 100)
            self.cached_templates = kwargs.get('cached_templates', [])

        def to_runtime_node(self):
            from sandbox_control_plane.src.domain.services.scheduler import RuntimeNode
            return RuntimeNode(
                id=self.id,
                type=self.type,
                url=self.url,
                status=self.status,
                cpu_usage=self.cpu_usage,
                mem_usage=self.mem_usage,
                session_count=self.session_count,
                max_sessions=self.max_sessions,
                cached_templates=self.cached_templates,
            )

    def __init__(self):
        # 默认有一个 Docker 节点
        self._nodes = {
            "docker-local": self._NodeModel(
                id="docker-local",
                type="docker",
                url="unix:///Users/guochenguang/.docker/run/docker.sock",
                status="online",
                cpu_usage=0.3,
                mem_usage=0.4,
                session_count=0,
                max_sessions=100,
                cached_templates=[],
            )
        }

    async def find_by_id(self, node_id: str):
        return self._nodes.get(node_id)

    async def find_by_status(self, status: str):
        return [n for n in self._nodes.values() if n.status == status]

    async def save(self, node):
        self._nodes[node.id] = node

    async def update_status(self, node_id: str, status: str) -> None:
        if node_id in self._nodes:
            self._nodes[node_id].status = status

    async def increment_session_count(self, node_id: str) -> None:
        if node_id in self._nodes:
            self._nodes[node_id].session_count += 1

    async def decrement_session_count(self, node_id: str) -> None:
        if node_id in self._nodes:
            self._nodes[node_id].session_count = max(0, self._nodes[node_id].session_count - 1)

    async def add_cached_template(self, node_id: str, template_id: str) -> None:
        if node_id in self._nodes:
            if template_id not in self._nodes[node_id].cached_templates:
                self._nodes[node_id].cached_templates.append(template_id)


class MockStorageService(IStorageService):
    """Mock 存储服务（用于开发测试）"""

    async def upload_file(self, s3_path: str, content: bytes, content_type: str = "application/octet-stream"):
        pass

    async def download_file(self, s3_path: str) -> bytes:
        return b""

    async def file_exists(self, s3_path: str) -> bool:
        return False

    async def get_file_info(self, s3_path: str):
        return {"size": 0, "content_type": "application/octet-stream"}

    async def generate_presigned_url(self, s3_path: str, expiration_seconds: int = 3600) -> str:
        return f"http://localhost:9000/{s3_path}?presigned=true"

    async def delete_file(self, s3_path: str) -> None:
        pass

    async def list_files(self, prefix: str, limit: int = 1000):
        return []


# Module-level singletons for shared components
_container_scheduler_singleton = None
_warm_pool_manager_singleton = None


def initialize_dependencies(app: FastAPI):
    """初始化所有依赖项并存储到应用状态中"""

    # Initialize database manager
    db_manager.initialize()

    # 创建仓储实例（根据配置选择 Mock 或 SQL）
    if USE_SQL_REPOSITORIES:
        # SQL 模式：仓储在请求时通过 Depends() 注入
        # 存储仓储工厂函数引用到 app.state
        app.state.get_session_repository = get_session_repository
        app.state.get_execution_repository = get_execution_repository
        app.state.get_template_repository = get_template_repository
        app.state.get_container_repository = get_container_repository

        # SessionService 也需要动态创建
        app.state.get_session_service = get_session_service_db
        app.state.get_template_service = get_template_service_db
        app.state.get_container_service = get_container_service_db
        app.state.get_file_service = get_file_service_db

        # 对于向后兼容，也设置仓储实例（用于可能直接访问的情况）
        app.state.session_repo = None  # 使用工厂函数
        app.state.execution_repo = None
        app.state.template_repo = None
        app.state.container_repo = None

        # 服务也使用工厂函数
        app.state.session_service = None
        app.state.template_service = None
        app.state.container_service = None
        app.state.file_service = None
    else:
        # Mock 模式：直接创建实例
        session_repo = MockSessionRepository()
        execution_repo = MockExecutionRepository()
        template_repo = MockTemplateRepository()
        container_repo = MockContainerRepository()

        # 创建领域服务实例
        storage_service = MockStorageService()

        # 创建 Mock 调度器
        scheduler = MockScheduler()

        # 创建应用服务实例
        session_service = SessionService(
            session_repo=session_repo,
            execution_repo=execution_repo,
            template_repo=template_repo,
            scheduler=scheduler,
        )

        template_service = TemplateService(
            template_repo=template_repo,
        )

        container_service = ContainerService(
            container_repo=container_repo,
        )

        file_service = FileService(
            session_repo=session_repo,
            storage_service=storage_service,
        )

        # 存储到应用状态
        app.state.session_service = session_service
        app.state.template_service = template_service
        app.state.container_service = container_service
        app.state.file_service = file_service

        # 也存储仓储（可能需要）
        app.state.session_repo = session_repo
        app.state.execution_repo = execution_repo
        app.state.template_repo = template_repo
        app.state.container_repo = container_repo

    # 创建容器调度器和预热池管理器（模块级单例，仅在 Docker 调度模式下）
    global _container_scheduler_singleton, _warm_pool_manager_singleton

    if USE_DOCKER_SCHEDULER:
        from sandbox_control_plane.src.infrastructure.container_scheduler.docker_scheduler import DockerScheduler
        from sandbox_control_plane.src.infrastructure.warm_pool.warm_pool_manager import WarmPoolManager

        # 创建容器调度器（模块级单例）
        _container_scheduler_singleton = DockerScheduler(docker_url=DOCKER_URL)

        # 创建预热池管理器（模块级单例，持有 in-memory 状态）
        _warm_pool_manager_singleton = WarmPoolManager(
            container_scheduler=_container_scheduler_singleton,
            idle_timeout_seconds=1800,
            max_pool_size_per_template=3,
        )


async def cleanup_dependencies(app: FastAPI):
    """清理依赖项"""
    await db_manager.close()


def get_session_service(app: FastAPI) -> SessionService:
    """获取会话服务"""
    return app.state.session_service


def get_template_service(app: FastAPI) -> TemplateService:
    """获取模板服务"""
    return app.state.template_service


def get_container_service(app: FastAPI) -> ContainerService:
    """获取容器服务"""
    return app.state.container_service


def get_file_service(app: FastAPI) -> FileService:
    """获取文件服务"""
    return app.state.file_service


# ============================================================================
# Database-based dependency injection (request-scoped)
# ============================================================================

async def get_db_session():
    """获取数据库会话（FastAPI 依赖）"""
    async with db_manager.get_session() as session:
        yield session


def get_session_repository(
    session = Depends(get_db_session)
) -> ISessionRepository:
    """获取会话仓储（SQL 或 Mock）"""
    if USE_SQL_REPOSITORIES:
        from sandbox_control_plane.src.infrastructure.persistence.repositories.sql_session_repository import SqlSessionRepository
        return SqlSessionRepository(session)
    return MockSessionRepository()


def get_execution_repository(
    session = Depends(get_db_session)
) -> IExecutionRepository:
    """获取执行仓储（SQL 或 Mock）"""
    if USE_SQL_REPOSITORIES:
        from sandbox_control_plane.src.infrastructure.persistence.repositories.sql_execution_repository import SqlExecutionRepository
        return SqlExecutionRepository(session)
    return MockExecutionRepository()


def get_template_repository(
    session = Depends(get_db_session)
) -> ITemplateRepository:
    """获取模板仓储（SQL 或 Mock）"""
    if USE_SQL_REPOSITORIES:
        from sandbox_control_plane.src.infrastructure.persistence.repositories.sql_template_repository import SqlTemplateRepository
        return SqlTemplateRepository(session)
    return MockTemplateRepository()


def get_container_repository(
    session = Depends(get_db_session)
) -> IContainerRepository:
    """获取容器仓储（SQL 或 Mock）"""
    if USE_SQL_REPOSITORIES:
        from sandbox_control_plane.src.infrastructure.persistence.repositories.sql_container_repository import SqlContainerRepository
        return SqlContainerRepository(session)
    return MockContainerRepository()


def get_scheduler() -> IScheduler:
    """获取调度器（Mock 或 Docker）"""
    if USE_DOCKER_SCHEDULER:
        from sandbox_control_plane.src.infrastructure.schedulers.docker_scheduler_service import DockerSchedulerService
        # 需要通过 Depends() 获取运行时节点仓储和容器调度器
        # 这里暂时返回 Mock，实际使用时需要通过 session-scoped 依赖
        return MockScheduler()
    return MockScheduler()


def get_runtime_node_repository(
    session = Depends(get_db_session)
):
    """获取运行时节点仓储（SQL 或 Mock）"""
    if USE_SQL_REPOSITORIES:
        from sandbox_control_plane.src.infrastructure.persistence.repositories.sql_runtime_node_repository import SqlRuntimeNodeRepository
        return SqlRuntimeNodeRepository(session)
    return MockRuntimeNodeRepository()


def get_container_scheduler():
    """获取容器调度器"""
    from sandbox_control_plane.src.infrastructure.container_scheduler.docker_scheduler import DockerScheduler
    return DockerScheduler(docker_url=DOCKER_URL)


def get_docker_scheduler_service(
    runtime_node_repo = Depends(get_runtime_node_repository),
    template_repo = Depends(get_template_repository),
) -> IScheduler:
    """获取 Docker 调度服务（共享预热池管理器单例）"""
    if not USE_DOCKER_SCHEDULER:
        return MockScheduler()

    from sandbox_control_plane.src.infrastructure.schedulers.docker_scheduler_service import DockerSchedulerService

    # 使用模块级单例
    container_scheduler = _container_scheduler_singleton
    warm_pool_manager = _warm_pool_manager_singleton

    # 为每个请求创建新的 DockerSchedulerService 实例
    # 但使用共享的 container_scheduler 和 warm_pool_manager
    return DockerSchedulerService(
        runtime_node_repo=runtime_node_repo,
        container_scheduler=container_scheduler,
        template_repo=template_repo,
        warm_pool_manager=warm_pool_manager,  # 共享的预热池管理器
    )


def get_storage_service() -> IStorageService:
    """获取存储服务（始终使用 Mock）"""
    return MockStorageService()


def get_session_service_db(
    session_repo: ISessionRepository = Depends(get_session_repository),
    execution_repo: IExecutionRepository = Depends(get_execution_repository),
    template_repo: ITemplateRepository = Depends(get_template_repository),
    scheduler: IScheduler = Depends(get_docker_scheduler_service),
) -> SessionService:
    """获取会话服务（使用数据库仓储和 Docker 调度器）"""
    return SessionService(
        session_repo=session_repo,
        execution_repo=execution_repo,
        template_repo=template_repo,
        scheduler=scheduler,
    )


def get_template_service_db(
    template_repo: ITemplateRepository = Depends(get_template_repository),
) -> TemplateService:
    """获取模板服务（使用数据库仓储）"""
    return TemplateService(template_repo=template_repo)


def get_container_service_db(
    container_repo: IContainerRepository = Depends(get_container_repository),
) -> ContainerService:
    """获取容器服务（使用数据库仓储）"""
    return ContainerService(container_repo=container_repo)


def get_file_service_db(
    session_repo: ISessionRepository = Depends(get_session_repository),
    storage_service: IStorageService = Depends(get_storage_service),
) -> FileService:
    """获取文件服务（使用数据库仓储）"""
    return FileService(
        session_repo=session_repo,
        storage_service=storage_service,
    )
