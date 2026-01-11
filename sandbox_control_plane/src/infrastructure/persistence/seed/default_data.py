"""
默认数据定义

定义在不同环境中使用的默认运行时节点和模板。
所有默认数据的集中定义，方便维护和修改。
"""
from decimal import Decimal
from typing import List

from src.infrastructure.persistence.models.runtime_node_model import RuntimeNodeModel
from src.infrastructure.persistence.models.template_model import TemplateModel


def get_default_runtime_nodes() -> List[RuntimeNodeModel]:
    """
    获取默认运行时节点列表

    Returns:
        默认运行时节点列表
    """
    return [
        RuntimeNodeModel(
            node_id="docker-local",
            hostname="sandbox-control-plane",
            runtime_type="docker",
            ip_address="127.0.0.1",
            api_endpoint="unix:///var/run/docker.sock",
            status="online",
            total_cpu_cores=Decimal("8.0"),
            total_memory_mb=16384,
            max_containers=50,
            running_containers=0,
            allocated_cpu_cores=Decimal("0"),
            allocated_memory_mb=0,
            cached_images=[],
            labels={"environment": "development", "type": "default"},
        ),
    ]


def get_default_templates() -> List[TemplateModel]:
    """
    获取默认模板列表

    Returns:
        默认模板列表
    """
    return [
        TemplateModel(
            id="python-basic",
            name="Python Basic",
            description="基础 Python 执行环境",
            image_url="sandbox-template-python-basic:latest",
            runtime_type="python3.11",
            default_cpu_cores=Decimal("1.0"),
            default_memory_mb=512,
            default_disk_mb=1024,
            default_timeout_sec=300,
            is_active=True,
            pre_installed_packages=[],
        ),
    ]
