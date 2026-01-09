# Sandbox Executor Base Image
# This image contains the executor daemon and Bubblewrap for secure code execution

FROM python:3.11-slim

# Metadata
LABEL maintainer="Sandbox Team"
LABEL description="Sandbox Executor - Code execution daemon with Bubblewrap isolation"
LABEL version="1.0.0"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Bubblewrap for process isolation
    bubblewrap \
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

# Set working directory
WORKDIR /app

# Copy executor code
COPY runtime/executor/ /app/executor/

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
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

# Expose health check and API port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the executor daemon
# The executor runs as PID 1 and manages its lifecycle
CMD ["python", "-m", "executor.interfaces.http.rest"]
