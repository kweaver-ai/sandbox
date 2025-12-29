"""
CLI configuration management
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional
import json

from sandbox_runtime.sandbox.sandbox.config import SandboxConfig
from sandbox_runtime.utils.loggers import get_logger

logger = get_logger(__name__)


class CLIConfig:
    """
    Configuration manager for Sandbox CLI
    """

    # Default configuration
    DEFAULT_CONFIG = {
        "sandbox": {
            "allow_network": False,
            "cpu_quota": 300,  # 5 minutes in seconds
            "memory_limit": 256 * 1024,  # 256MB in KB
            "max_idle_time": 60,  # 1 minute
            "max_user_progress": 10,  # Max processes
            "max_task_count": 10,  # Max tasks
        },
        "cli": {
            "default_timeout": 300,  # 5 minutes
            "default_format": "pretty",
            "enable_colors": True,
            "show_profile": False,
        },
        "logging": {
            "level": "WARNING",
        }
    }

    def __init__(self, config_file: Optional[str] = None):
        """
        Initialize CLI configuration

        Args:
            config_file: Path to configuration file (optional)
        """
        self.config_file = config_file or self._get_default_config_file()
        self.config = self._load_config()

    def _get_default_config_file(self) -> str:
        """Get default configuration file path"""
        # Check for config in current directory
        local_config = Path.cwd() / ".sandboxrc.json"
        if local_config.exists():
            return str(local_config)

        # Check for config in home directory
        home_config = Path.home() / ".sandboxrc.json"
        if home_config.exists():
            return str(home_config)

        # Return default path (may not exist)
        return str(home_config)

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file"""
        # Start with defaults
        config = self.DEFAULT_CONFIG.copy()

        # Load from file if exists
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    file_config = json.load(f)

                # Merge with defaults
                self._deep_update(config, file_config)
                logger.debug(f"Loaded configuration from {self.config_file}")
            except Exception as e:
                logger.warning(f"Failed to load config file {self.config_file}: {e}")
        else:
            logger.debug("Using default configuration")

        return config

    def _deep_update(self, base: Dict, update: Dict):
        """Deep update dictionary"""
        for key, value in update.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_update(base[key], value)
            else:
                base[key] = value

    def get_sandbox_config(self) -> SandboxConfig:
        """Get sandbox configuration"""
        sandbox_cfg = self.config.get("sandbox", {})
        return SandboxConfig(
            allow_network=sandbox_cfg.get("allow_network", False),
            cpu_quota=sandbox_cfg.get("cpu_quota", 300),
            memory_limit=sandbox_cfg.get("memory_limit", 256 * 1024),
            max_idle_time=sandbox_cfg.get("max_idle_time", 60),
            max_user_progress=sandbox_cfg.get("max_user_progress", 10),
            max_task_count=sandbox_cfg.get("max_task_count", 10),
        )

    def get_cli_setting(self, key: str, default: Any = None) -> Any:
        """Get CLI configuration setting"""
        cli_cfg = self.config.get("cli", {})
        return cli_cfg.get(key, default)

    def get_logging_level(self) -> str:
        """Get logging level"""
        logging_cfg = self.config.get("logging", {})
        return logging_cfg.get("level", "WARNING")

    def save_config(self, config_path: Optional[str] = None):
        """
        Save current configuration to file

        Args:
            config_path: Path to save configuration (optional)
        """
        save_path = config_path or self.config_file

        try:
            # Create directory if needed
            Path(save_path).parent.mkdir(parents=True, exist_ok=True)

            with open(save_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)

            logger.info(f"Configuration saved to {save_path}")
        except Exception as e:
            logger.error(f"Failed to save config to {save_path}: {e}")

    @classmethod
    def create_default_config(cls, config_path: str):
        """
        Create a default configuration file

        Args:
            config_path: Path where to create the config file
        """
        config = cls()
        config.config_file = config_path
        config.save_config(config_path)

    def update_setting(self, section: str, key: str, value: Any):
        """
        Update a configuration setting

        Args:
            section: Configuration section (e.g., "sandbox", "cli", "logging")
            key: Setting key
            value: Setting value
        """
        if section not in self.config:
            self.config[section] = {}
        self.config[section][key] = value

    def get_all_settings(self) -> Dict[str, Any]:
        """Get all configuration settings"""
        return self.config.copy()