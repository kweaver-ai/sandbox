# Configuration Guide

This guide covers all configuration options for the Sandbox Runtime.

## Environment Variables

The Sandbox Runtime is configured through environment variables. These can be set in your shell, in a `.env` file, or via your deployment configuration.

### Sandbox Configuration

#### `SANDBOX_CPU_QUOTA`

**Default:** `2`

CPU quota per sandbox session. This controls the CPU time each sandbox can use.

**Example:**
```bash
export SANDBOX_CPU_QUOTA=4
```

**Notes:**
- Value of `1` represents 1 CPU core
- Fractional values are supported (e.g., `0.5` for half a core)
- Higher values allow more CPU-intensive operations

#### `SANDBOX_MEMORY_LIMIT`

**Default:** `131072` (128 MB)

Memory limit per sandbox session in kilobytes.

**Example:**
```bash
export SANDBOX_MEMORY_LIMIT=524288  # 512 MB
```

**Notes:**
- Specified in kilobytes (KB)
- Processes exceeding this limit will be terminated
- Consider memory requirements when setting this value

#### `SANDBOX_ALLOW_NETWORK`

**Default:** `true`

Controls whether sandbox sessions can access the network.

**Example:**
```bash
export SANDBOX_ALLOW_NETWORK=false  # Disable network
```

**Notes:**
- Set to `false` for completely isolated execution
- When disabled, HTTP requests, DNS lookups, etc. will fail

#### `SANDBOX_TIMEOUT_SECONDS`

**Default:** `300` (5 minutes)

Default execution timeout for code execution.

**Example:**
```bash
export SANDBOX_TIMEOUT_SECONDS=600  # 10 minutes
```

**Notes:**
- Can be overridden per-request
- Long-running tasks may require higher values
- Consider security implications of long timeouts

#### `SANDBOX_POOL_SIZE`

**Default:** `2`

Number of pre-warmed sandbox instances to maintain in the pool.

**Example:**
```bash
export SANDBOX_POOL_SIZE=5
```

**Notes:**
- Higher values reduce warm-up time for new sessions
- Each pool instance consumes resources even when idle
- Balance between performance and resource usage

### Server Configuration

#### `PORT`

**Default:** `8000`

Port for the HTTP server.

**Example:**
```bash
export PORT=8080
```

#### `HOST`

**Default:** `0.0.0.0`

Host address to bind the server to.

**Example:**
```bash
export HOST=127.0.0.1  # Localhost only
```

#### `WORKERS`

**Default:** `1` (development), `4` (production)

Number of worker processes for uvicorn.

**Example:**
```bash
export WORKERS=4
```

**Notes:**
- Only applies when running with uvicorn directly
- Recommended: `2 * CPU_CORES + 1`

### Isolation Configuration

#### `SANDBOX_ISOLATION_TYPE`

**Default:** `bubblewrap`

Isolation technology to use for sandboxing.

**Options:**
- `bubblewrap` - Linux namespace-based isolation (Linux only)
- `docker` - Docker container isolation
- `none` - No isolation (not recommended for production)

**Example:**
```bash
export SANDBOX_ISOLATION_TYPE=docker
```

#### `SANDBOX_WORKDIR`

**Default:** `/tmp/sandbox`

Working directory for sandbox sessions.

**Example:**
```bash
export SANDBOX_WORKDIR=/var/run/sandbox
```

### Logging Configuration

#### `LOG_LEVEL`

**Default:** `INFO`

Logging verbosity level.

**Options:** `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`

**Example:**
```bash
export LOG_LEVEL=DEBUG
```

#### `LOG_FORMAT`

**Default:** `json`

Log output format.

**Options:** `json`, `text`

**Example:**
```bash
export LOG_FORMAT=text
```

---

## Configuration File

You can use a `.env` file in the project root for configuration:

```bash
# .env
# Sandbox Settings
SANDBOX_CPU_QUOTA=2
SANDBOX_MEMORY_LIMIT=131072
SANDBOX_ALLOW_NETWORK=true
SANDBOX_TIMEOUT_SECONDS=300
SANDBOX_POOL_SIZE=2

# Server Settings
PORT=8000
HOST=0.0.0.0

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
```

---

## Per-Session Configuration

You can override settings when creating a session via API:

```python
from sandbox_runtime.sdk import SandboxClient

client = SandboxClient(base_url="http://localhost:8000")

# Create session with custom configuration
await client.create_session(
    session_id="my_session",
    config={
        "cpu_quota": 4,
        "memory_limit": 524288,  # 512 MB
        "allow_network": False,
        "timeout": 600
    }
)
```

---

## Docker Configuration

When using Docker isolation, additional environment variables are available:

#### `SANDBOX_DOCKER_IMAGE`

**Default:** `sandbox-runtime:latest`

Docker image to use for sandbox containers.

**Example:**
```bash
export SANDBOX_DOCKER_IMAGE=my-registry/sandbox-runtime:v1.0.0
```

#### `SANDBOX_DOCKER_NETWORK`

**Default:** `bridge`

Docker network for sandbox containers.

**Example:**
```bash
export SANDBOX_DOCKER_NETWORK=none  # Complete isolation
```

---

## Production Recommendations

For production deployments:

```bash
# Resource limits
SANDBOX_CPU_QUOTA=2
SANDBOX_MEMORY_LIMIT=524288  # 512 MB

# Security
SANDBOX_ALLOW_NETWORK=false  # Disable by default
SANDBOX_TIMEOUT_SECONDS=300  # 5 minutes

# Performance
SANDBOX_POOL_SIZE=10  # Based on expected load

# Server
PORT=8000
WORKERS=4
LOG_LEVEL=WARNING  # Reduce log volume
```

---

## Configuration Examples

### Development Setup

```bash
# Relaxed settings for local development
SANDBOX_CPU_QUOTA=4
SANDBOX_MEMORY_LIMIT=1048576  # 1 GB
SANDBOX_ALLOW_NETWORK=true
SANDBOX_TIMEOUT_SECONDS=600
LOG_LEVEL=DEBUG
```

### Production Setup (High Security)

```bash
# Strict settings for production
SANDBOX_CPU_QUOTA=1
SANDBOX_MEMORY_LIMIT=262144  # 256 MB
SANDBOX_ALLOW_NETWORK=false
SANDBOX_TIMEOUT_SECONDS=60
SANDBOX_POOL_SIZE=20
LOG_LEVEL=WARNING
SANDBOX_ISOLATION_TYPE=docker
```

### Production Setup (High Performance)

```bash
# Optimized for throughput
SANDBOX_CPU_QUOTA=2
SANDBOX_MEMORY_LIMIT=524288  # 512 MB
SANDBOX_ALLOW_NETWORK=true
SANDBOX_TIMEOUT_SECONDS=120
SANDBOX_POOL_SIZE=50
WORKERS=8
```

---

## See Also

- [Getting Started](getting-started.md) - Initial setup guide
- [Deployment](deployment.md) - Production deployment
- [API Reference](api-reference.md) - API configuration options
