"""
Setup script for sandbox-runtime
"""

from setuptools import setup, find_packages
import pathlib

# Read the README file
HERE = pathlib.Path(__file__).parent
README = (HERE / "README.md").read_text(encoding="utf-8")

# Basic setup configuration
setup(
    name="sandbox-runtime",
    version="0.1.0",
    description="Sandbox environment for code execution",
    long_description=README,
    long_description_content_type="text/markdown",
    author="Chen Xiao",
    author_email="xavier.chen@aishu.cn",
    url="https://github.com/your-org/sandbox-runtime",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    include_package_data=True,
    python_requires=">=3.10",
    install_requires=[
        "aiohttp==3.12.0",
        "fastapi==0.115.12",
        "paramiko==3.5.1",
        "psutil==7.1.3",
        "pydantic==2.11.5",
        "pydantic-settings==2.12.0",
        "python-multipart>=0.0.20",
        "pyyaml>=6.0.1",
        "requests==2.32.3",
        "uvicorn==0.34.3",
    ],
    extras_require={
        "server": [
            "fastapi>=0.100.0",
            "uvicorn>=0.22.0",
            "python-multipart>=0.0.6",
            "python-multipart>=0.0.20",
        ],
        "sdk": [
            "requests>=2.31.0",
            "aiohttp>=3.12.0"
        ],
    },
    entry_points={
        "console_scripts": [
            "sandbox-run=sandbox_runtime.cli.main:entry_point",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "Operating System :: OS Independent",
        "License :: OSI Approved :: MIT License",
    ],
    keywords="sandbox security code-execution lambda",
)