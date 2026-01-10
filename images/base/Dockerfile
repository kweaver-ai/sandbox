# Sandbox Base Image
# Base image containing executor daemon and Bubblewrap
# Template images should inherit from this

ARG PYTHON_VERSION=3.11
FROM python:${PYTHON_VERSION}-slim

# Metadata
LABEL maintainer="Sandbox Team"
LABEL description="Sandbox Base Image - Executor + Bubblewrap"
LABEL version="1.0.0"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Bubblewrap for process isolation (second layer)
    bubblewrap \
    # curl for health checks
    curl \
    ca-certificates \
    # Clean up
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-privileged user (UID:GID = 1000:1000)
# Container layer isolation - never run as root
RUN groupadd -g 1000 sandbox && \
    useradd -m -u 1000 -g sandbox sandbox

# Copy executor code
COPY runtime/executor/ /app/executor/

# Install executor Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/executor/requirements.txt

# Create workspace directory
# This will be mounted as S3 volume or ephemeral storage
RUN mkdir -p /workspace && \
    chown -R sandbox:sandbox /workspace

# Switch to non-privileged user
USER sandbox

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV WORKSPACE_PATH=/workspace
ENV PYTHONPATH=/app

# Expose executor API port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start executor daemon as PID 1
# The executor is the container's main process
CMD ["python", "-m", "executor.interfaces.http.rest"]
