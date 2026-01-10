# Sandbox Control Plane
# FastAPI-based management service for sandbox code execution

FROM python:3.11-slim

# Metadata
LABEL maintainer="Sandbox Team"
LABEL description="Sandbox Control Plane - Management API"
LABEL version="2.1.0"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Docker CLI for container management
    docker.io \
    # curl for health checks
    curl \
    ca-certificates \
    # Build tools for Python packages
    gcc \
    python3-dev \
    musl-dev \
    libffi-dev \
    # Clean up
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Copy dependency files and README
COPY pyproject.toml uv.lock README.md ./

# Install pip and uv
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir uv

# Install Python dependencies
RUN uv sync --frozen

# Copy source code
COPY . .

# Create non-root user (optional, can run as root for Docker socket access)
# RUN useradd -m -u 1000 sandbox && \
#     chown -R sandbox:sandbox /app
# USER sandbox

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Start the control plane
CMD ["uv", "run", "uvicorn", "src.interfaces.rest.main:app", "--host", "0.0.0.0", "--port", "8000"]
