# Sandbox Control Plane
# FastAPI-based management service for sandbox code execution

# Mirror configuration for special network environments
ARG USE_MIRROR=false
ARG APT_MIRROR=mirrors.ustc.edu.cn
ARG PIP_MIRROR=mirrors.aliyun.com
ARG PYTHON_IMAGE=python:3.11-slim

FROM ${PYTHON_IMAGE}

# Re-declare ARG after FROM (ARGs don't persist across FROM)
ARG USE_MIRROR=false
ARG APT_MIRROR=mirrors.aliyun.com
ARG PIP_MIRROR=mirrors.aliyun.com

# Metadata
LABEL maintainer="Sandbox Team"
LABEL description="Sandbox Control Plane - Management API"
LABEL version="2.1.0"

# Configure APT mirror if needed
RUN if [ "$USE_MIRROR" = "true" ]; then \
      sed -i "s|deb.debian.org|$APT_MIRROR|g" /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
      sed -i "s|deb.debian.org|$APT_MIRROR|g" /etc/apt/sources.list; \
    fi

# Install system dependencies (optimized)
RUN apt-get update && apt-get install -y --no-install-recommends \
    # curl for health checks
    curl \
    ca-certificates \
    wget \
    # Minimal build tools for Python packages
    gcc \
    python3-dev \
    libffi-dev \
    # Clean up in the same layer to reduce image size
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && rm -rf /tmp/* /var/tmp/*

# Install uv (fast Python package installer)
RUN pip install --no-cache-dir uv

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY pyproject.toml uv.lock README.md ./

# Install Python dependencies using uv (faster, uses lock file)
RUN if [ "$USE_MIRROR" = "true" ]; then \
      export UV_INDEX_URL=https://$PIP_MIRROR/pypi/web/simple; \
    fi && \
    uv sync --frozen --no-dev

# Copy source code (dockerignore will exclude unnecessary files)
COPY src/ ./src/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app/.venv/lib/python3.11/site-packages:/app/src
ENV PYTHONHASHSEED=0
ENV PATH="/app/.venv/bin:$PATH"

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Start the control plane (use uv's venv python)
CMD [".venv/bin/python", "-m", "uvicorn", "src.interfaces.rest.main:app", "--host", "0.0.0.0", "--port", "8000"]
