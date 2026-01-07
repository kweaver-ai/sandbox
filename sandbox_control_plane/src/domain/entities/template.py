"""
模板实体

定义沙箱环境模板。
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict

from sandbox_control_plane.src.domain.value_objects.resource_limit import ResourceLimit


@dataclass
class Template:
    """
    模板实体

    定义沙箱执行环境的配置模板。
    """
    id: str
    name: str
    image: str  # Docker 镜像
    base_image: str  # 基础镜像
    pre_installed_packages: List[str] = field(default_factory=list)
    default_resources: ResourceLimit = field(default_factory=ResourceLimit.default)
    security_context: Dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        """初始化后验证"""
        if not self.name:
            raise ValueError("name cannot be empty")
        if not self.image:
            raise ValueError("image cannot be empty")
        if not self.base_image:
            raise ValueError("base_image cannot be empty")

    # ============== 领域行为 ==============

    def update_image(self, image: str) -> None:
        """更新镜像"""
        if not image:
            raise ValueError("image cannot be empty")
        self.image = image
        self.updated_at = datetime.now()

    def add_package(self, package: str) -> None:
        """添加预装包"""
        if package not in self.pre_installed_packages:
            self.pre_installed_packages.append(package)
            self.updated_at = datetime.now()

    def remove_package(self, package: str) -> None:
        """移除预装包"""
        if package in self.pre_installed_packages:
            self.pre_installed_packages.remove(package)
            self.updated_at = datetime.now()

    def update_default_resources(self, resources: ResourceLimit) -> None:
        """更新默认资源配置"""
        self.default_resources = resources
        self.updated_at = datetime.now()

    # ============== 领域查询 ==============

    def has_package(self, package: str) -> bool:
        """是否包含指定包"""
        return package in self.pre_installed_packages

    def get_image_name(self) -> str:
        """获取镜像名称（不含 tag）"""
        return self.image.split(":")[0] if ":" in self.image else self.image
