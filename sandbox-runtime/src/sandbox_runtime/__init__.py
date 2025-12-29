# Sandbox Environment - Main package
"""
Sandbox Environment for code execution

This package provides a complete sandbox environment with:
- Shared environment sandbox
- SSH-based sandbox
- Python runners
- SDK for client applications
"""

__version__ = "0.1.0"
__author__ = "Chen Xiao"
__email__ = "xavier.chen@aishu.cn"

# Import all subpackages to make them available at the root level
from sandbox_runtime import sandbox
from sandbox_runtime import sdk

# Also import main modules
from sandbox_runtime import settings

__all__ = ["sandbox", "sdk", "settings"]
