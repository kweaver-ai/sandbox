# Sandbox Executor Base Image
# This image serves as the base for all template images
# Contains the executor daemon and Bubblewrap for secure code execution

# Mirror configuration for special network environments
ARG USE_MIRROR=false
ARG APT_MIRROR=mirrors.ustc.edu.cn
ARG PIP_MIRROR=mirrors.ustc.edu.cn
ARG PYTHON_VERSION=3.11

FROM python:${PYTHON_VERSION}-slim

# Metadata
LABEL maintainer="Sandbox Team"
LABEL description="Sandbox Executor Base - Daemon + Bubblewrap Isolation"
LABEL version="1.0.0"

# Configure APT mirror if needed
RUN if [ "$USE_MIRROR" = "true" ]; then \
      sed -i "s|deb.debian.org|$APT_MIRROR|g" /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
      sed -i "s|deb.debian.org|$APT_MIRROR|g" /etc/apt/sources.list; \
    fi

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Bubblewrap for process isolation (second layer)
    bubblewrap \
    # s3fs for S3 workspace mounting (FUSE filesystem)
    s3fs \
    # gosu for dropping privileges in entrypoint
    gosu \
    # curl for health checks
    curl \
    ca-certificates \
    # Clean up
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-privileged user
# The executor runs as UID:GID 1000:1000 for security
RUN groupadd -g 1000 sandbox && \
    useradd -m -u 1000 -g sandbox sandbox

# Copy executor code
COPY runtime/executor/ /app/executor/

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    if [ "$USE_MIRROR" = "true" ]; then \
      pip config set global.index-url https://$PIP_MIRROR/pypi/web/simple && \
      pip config set global.trusted-host $PIP_MIRROR; \
    fi && \
    pip install --no-cache-dir -r /app/executor/requirements.txt

# Create workspace directory
# This will be mounted as a volume for S3/ephemeral storage
RUN mkdir -p /workspace && \
    chown -R sandbox:sandbox /app /workspace

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

# Start the executor daemon
# The executor runs as PID 1 and manages its lifecycle
# Note: When dependencies are specified, control plane will inject
# a custom entrypoint script to install them before starting the executor
CMD ["python", "-m", "executor.interfaces.http.rest"]
