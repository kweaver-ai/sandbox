# Sandbox Control Plane
# FastAPI-based management service for sandbox code execution

FROM python:3.11-slim

# Metadata
LABEL maintainer="Sandbox Team"
LABEL description="Sandbox Control Plane - Management API"
LABEL version="2.1.0"

# Install system dependencies (optimized)
RUN apt-get update && apt-get install -y --no-install-recommends \
    # curl for health checks
    curl \
    ca-certificates \
    # Minimal build tools for Python packages
    gcc \
    python3-dev \
    libffi-dev \
    # Clean up in the same layer to reduce image size
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && rm -rf /tmp/* /var/tmp/*

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY pyproject.toml uv.lock README.md ./

# Install uv and Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir uv && \
    uv sync --frozen && \
    # Clean up uv cache
    rm -rf /root/.cache/uv /root/.cache/pip

# Copy source code (dockerignore will exclude unnecessary files)
COPY src/ ./src/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app
ENV PYTHONHASHSEED=0

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Start the control plane
CMD ["uv", "run", "uvicorn", "src.interfaces.rest.main:app", "--host", "0.0.0.0", "--port", "8000"]
