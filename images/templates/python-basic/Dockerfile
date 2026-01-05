# Python Basic Template
# Minimal Python 3.11 environment for general-purpose code execution

ARG BASE_IMAGE=sandbox-base:latest
FROM ${BASE_IMAGE}

# Metadata
LABEL template.name="python-basic"
LABEL template.description="Minimal Python 3.11 environment"
LABEL template.version="1.0.0"

# Switch to root to install packages
USER root

# Verify Python installation
RUN python3 --version && \
    pip3 --version

# Switch back to sandbox user
USER sandbox

# Default to workspace directory
WORKDIR /workspace
