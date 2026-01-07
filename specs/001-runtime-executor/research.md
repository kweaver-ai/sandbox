# Research: Runtime Executor (sandbox-executor)

**Feature**: 001-runtime-executor
**Date**: 2025-01-06
**Status**: Complete

## Overview

This document consolidates research findings for implementing the sandbox-executor component, including technology choices, best practices, and security considerations for secure code execution.

## Research Areas

### 1. Bubblewrap (bwrap) Integration

**Decision**: Use subprocess module to invoke bwrap with carefully constructed argument lists

**Rationale**:
- Bubblewrap is the industry-standard tool for user-space sandboxing on Linux
- Provides kernel-level namespace isolation (PID, NET, MNT, IPC, UTS)
- Widely used in Flatpak, systemd, and other security-critical applications
- No Python-specific bwrap bindings exist - subprocess invocation is standard approach

**Best Practices**:
- Always use `--die-with-parent` to ensure child processes terminate with parent
- Use `--unshare-all` for complete namespace isolation
- Use `--ro-bind` for system directories to prevent modifications
- Use `--new-session` to create new process session
- Drop all capabilities with `--cap-drop ALL`
- Use `--no-new-privs` to prevent privilege escalation
- Set resource limits via `--rlimit` for NPROC (max processes) and NOFILE (max file descriptors)

**Security Considerations**:
- bwrap must be installed in the container image (via package manager)
- Container must run with sufficient capabilities to create namespaces (typically CAP_SYS_ADMIN)
- After bwrap creates namespaces, child processes run with dropped capabilities
- Validate bwrap availability on executor startup, fail fast if missing

**Alternatives Considered**:
- **Firejail**: More complex configuration, less widely adopted
- **chroot**: Only provides filesystem isolation, insufficient for security
- **seccomp-only**: Doesn't provide filesystem or namespace isolation

**Implementation Notes**:
```python
bwrap_cmd = [
    "bwrap",
    # Filesystem isolation
    "--ro-bind", "/usr", "/usr",
    "--ro-bind", "/lib", "/lib",
    "--ro-bind", "/lib64", "/lib64",
    "--ro-bind", "/bin", "/bin",
    "--bind", workspace_path, "/workspace",
    "--tmpfs", "/tmp",

    # Namespace isolation
    "--unshare-all",
    "--unshare-net",

    # Process management
    "--die-with-parent",
    "--new-session",
    "--proc", "/proc",
    "--dev", "/dev",

    # Environment
    "--clearenv",
    "--setenv", "PATH", "/usr/local/bin:/usr/bin:/bin",
    "--setenv", "HOME", "/workspace",

    # Security
    "--cap-drop", "ALL",
    "--no-new-privs",

    # Resource limits
    "--rlimit", "NPROC", "128",
    "--rlimit", "NOFILE", "1024",

    # Command to execute
    "--",
    "python3", "-c", user_code
]
```

### 2. Python Lambda-Style Handler Execution

**Decision**: Use `python3 -c` with wrapper code that reads event from stdin and calls `handler(event)`

**Rationale**:
- Fileless execution avoids disk I/O and file cleanup
- Python's `-c` flag executes code as a string
- Wrapper code provides Lambda-like environment
- stdout markers (`===SANDBOX_RESULT===`) enable return value extraction

**Best Practices**:
- Validate that `handler` function exists in globals before calling
- Use JSON for event input/output (must be JSON-serializable)
- Return full traceback in stderr for debugging
- Use markers to separate return value from regular stdout

**Implementation Pattern**:
```python
# Wrapper code injected before user code
wrapper_template = """
import json
import sys

# User code injected here
{user_code}

# Read event from stdin
try:
    input_data = sys.stdin.read()
    event = json.loads(input_data) if input_data.strip() else {{}}
except json.JSONDecodeError as e:
    print(f"Error parsing event JSON: {{e}}", file=sys.stderr)
    sys.exit(1)

# Call handler
try:
    if 'handler' not in globals():
        raise ValueError("必须定义 handler(event) 函数")

    result = handler(event)

    # Output result with markers
    print("\\n===SANDBOX_RESULT===")
    print(json.dumps(result))
    print("\\n===SANDBOX_RESULT_END===")

except Exception as e:
    import traceback
    print("\\n===SANDBOX_ERROR===")
    print(traceback.format_exc())
    print("\\n===SANDBOX_ERROR_END===")
    sys.exit(1)
"""
```

**Alternatives Considered**:
- **File-based execution**: Requires file I/O, cleanup, and permissions management
- **exec()/eval()**: Doesn't provide proper traceback information
- **import_module**: Requires file creation and module path manipulation

### 3. HTTP API Framework Selection

**Decision**: FastAPI with Uvicorn

**Rationale**:
- Native async/await support (critical for concurrent execution handling)
- Automatic OpenAPI documentation
- Pydantic models for request/response validation
- Excellent performance (comparable to Go frameworks)
- Type hints enable better IDE support and error detection

**Best Practices**:
- Use async endpoints for all operations
- Implement request validation via Pydantic models
- Return structured error responses with error codes
- Include request IDs for tracing
- Use background tasks for heartbeat and result reporting

**Alternatives Considered**:
- **Flask**: No native async support, requires additional extensions
- **aiohttp**: More boilerplate, less automatic documentation
- **Starlette**: Lower-level, FastAPI provides better abstraction

### 4. Control Plane Callback Client

**Decision**: httpx with async support and retry logic

**Rationale**:
- httpx provides HTTP/1.1 and HTTP/2 support
- Native async/await compatibility
- Connection pooling and timeout handling
- Better error messages than requests

**Retry Strategy**:
- Exponential backoff: 1s, 2s, 4s, 8s, 10s (max)
- Retry on: network errors, timeouts, 5xx server errors
- No retry on: 4xx client errors (except 409 Conflict for idempotency)
- Local persistence fallback: save to `/tmp/results/{execution_id}.json`

**Best Practices**:
- Use timeouts (connect: 5s, read: 30s)
- Implement idempotency keys for result reporting
- Log all retry attempts with context
- Clean up local files after successful upload

**Implementation Pattern**:
```python
async def report_result_with_retry(execution_id: str, result: ExecutionResult):
    max_attempts = 5
    base_delay = 1.0

    for attempt in range(max_attempts):
        try:
            response = await httpx_client.post(
                f"{control_plane_url}/internal/executions/{execution_id}/result",
                json=result.dict(),
                headers={"Authorization": f"Bearer {INTERNAL_API_TOKEN}"},
                timeout=httpx.Timeout(connect=5.0, read=30.0)
            )
            response.raise_for_status()
            return
        except (httpx.HTTPError, httpx.HTTPStatusError) as e:
            if attempt == max_attempts - 1:
                # Last attempt failed, persist locally
                local_path = f"/tmp/results/{execution_id}.json"
                with open(local_path, 'w') as f:
                    json.dump(result.dict(), f)
                logger.error(f"Failed to report result after {max_attempts} attempts, saved to {local_path}")
                raise

            delay = min(base_delay * (2 ** attempt), 10.0)
            await asyncio.sleep(delay)
```

### 5. Structured Logging

**Decision**: Python structlog with JSON output

**Rationale**:
- Structured logging enables better log parsing and analysis
- JSON output integrates with log aggregation systems (ELK, Loki)
- Built-in context binding (request_id, execution_id)
- Thread-safe and async-compatible

**Best Practices**:
- Log level: INFO (default), DEBUG (development)
- Required fields: timestamp, level, execution_id, container_id, event_type
- Include stack traces for errors (in logs, not in API responses)
- Sanitize sensitive data (tokens, passwords)

**Implementation Pattern**:
```python
import structlog

logger = structlog.get_logger()

# Log with context
logger.info(
    "execution_started",
    execution_id=execution_id,
    language=language,
    timeout=timeout
)

# Error with stack trace
logger.error(
    "execution_failed",
    execution_id=execution_id,
    error=str(e),
    stack_trace=traceback.format_exc()
)
```

### 6. Resource Metrics Collection

**Decision**: psutil for process metrics

**Rationale**:
- Cross-platform compatibility
- Provides CPU time, memory, I/O, and file descriptor counts
- Lightweight and well-maintained
- No external dependencies

**Metrics to Collect**:
- Wall-clock time: `time.perf_counter()` before/after execution
- CPU time: `time.process_time()` before/after execution
- Peak memory: `psutil.Process().memory_info().rss` (not exact, but usable)
- Optionally: I/O read/write bytes if available

**Implementation Pattern**:
```python
import time
import psutil

start_wall = time.perf_counter()
start_cpu = time.process_time()

# Execute code
process = subprocess.Popen(bwrap_cmd, ...)
process.wait()

duration_ms = (time.perf_counter() - start_wall) * 1000
cpu_time_ms = (time.process_time() - start_cpu) * 1000

# Memory is harder to measure accurately for subprocess
# Use container-level metrics via cgroups instead
```

### 7. Artifact Scanning

**Decision**: Recursive pathlib scan with MIME type detection

**Rationale**:
- pathlib provides clean path manipulation
- python-magic or mimetypes for MIME detection
- Filter hidden files (starting with `.`)
- Relative paths for consistent downloading

**Best Practices**:
- Scan after execution completes
- Exclude hidden files and temp directories
- Record file size and MIME type
- Use relative paths from workspace root

**Implementation Pattern**:
```python
from pathlib import Path
import mimetypes

def collect_artifacts(workspace: Path) -> list[ArtifactMetadata]:
    artifacts = []
    for file_path in workspace.rglob("*"):
        if file_path.is_file() and not file_path.name.startswith("."):
            rel_path = file_path.relative_to(workspace)
            size = file_path.stat().st_size
            mime_type, _ = mimetypes.guess_type(str(file_path))
            artifacts.append({
                "path": str(rel_path),
                "size": size,
                "mime_type": mime_type or "application/octet-stream",
                "type": "artifact"
            })
    return artifacts
```

### 8. Timeout Enforcement

**Decision**: subprocess.run() with timeout parameter

**Rationale**:
- Built-in timeout handling
- Raises TimeoutExpired on timeout
- Automatically terminates subprocess
- Clean integration with error handling

**Best Practices**:
- Validate timeout range (1-3600s)
- Default to 30 seconds
- Kill process group to handle child processes
- Log timeout events

**Implementation Pattern**:
```python
try:
    result = subprocess.run(
        bwrap_cmd,
        input=event_json,
        capture_output=True,
        text=True,
        timeout=request.timeout,
        cwd=str(workspace)
    )
except subprocess.TimeoutExpired:
    # Process already killed by subprocess.run
    return ExecutionResult(
        status="timeout",
        stderr=f"Execution timeout after {request.timeout} seconds"
    )
```

### 9. Heartbeat Implementation

**Decision**: Background asyncio task with periodic POST

**Rationale**:
- Native async support in asyncio
- Non-blocking heartbeat transmission
- Clean cancellation on execution completion
- Separate from execution flow

**Best Practices**:
- Send every 5 seconds during execution
- Include timestamp and optional progress
- Cancel task immediately on completion
- Log failures but don't fail execution

**Implementation Pattern**:
```python
async def heartbeat_loop(execution_id: str, stop_event: asyncio.Event):
    while not stop_event.is_set():
        try:
            await httpx_client.post(
                f"{control_plane_url}/internal/executions/{execution_id}/heartbeat",
                json={"timestamp": datetime.now().isoformat()}
            )
        except Exception as e:
            logger.warning(f"Heartbeat failed: {e}")

        await asyncio.sleep(5)

# Start heartbeat
stop_heartbeat = asyncio.Event()
heartbeat_task = asyncio.create_task(heartbeat_loop(execution_id, stop_heartbeat))

# Execute code
result = await execute_code(...)

# Stop heartbeat
stop_heartbeat.set()
heartbeat_task.cancel()
```

### 10. Graceful Shutdown

**Decision**: Signal handlers for SIGTERM/SIGINT

**Rationale**:
- Kubernetes sends SIGTERM before pod termination
- Need to mark running executions as crashed
- Send container_exited callback
- Clean shutdown within grace period

**Best Practices**:
- Register signal handlers on startup
- Mark active executions as crashed
- Send lifecycle callbacks
- Exit with code 143 (SIGTERM)
- Timeout shutdown after 10 seconds

**Implementation Pattern**:
```python
import signal

active_executions = {}

def handle_shutdown(signum, frame):
    logger.info(f"Received signal {signum}, shutting down...")

    # Mark all running executions as crashed
    for execution_id in active_executions:
        asyncio.create_task(report_crashed(execution_id))

    # Send container_exited
    asyncio.create_task(report_container_exited(exit_code=signum))

    # Force exit after 10 seconds
    asyncio.get_event_loop().call_later(10, lambda: sys.exit(143))

signal.signal(signal.SIGTERM, handle_shutdown)
```

## Security Considerations

### Input Validation
- Validate all HTTP request inputs (code size ≤1MB, timeout range, language whitelist)
- Sanitize file paths in artifacts (prevent path traversal)
- Validate JSON structure before parsing

### Secret Management
- INTERNAL_API_TOKEN via environment variable only
- Never log tokens or passwords
- Use read-only environment variables where possible

### Isolation Verification
- Test escape attempts: file access outside workspace, network operations, privilege escalation
- Verify bwrap availability on startup
- Log all isolation failures

### Resource Limits
- Enforce timeout at subprocess level
- Use ulimits for max processes and file descriptors
- Monitor memory usage (container-level)

## Dependencies Summary

**Runtime Dependencies**:
- Python 3.11+
- bubblewrap (system package)
- python3, node, bash (language runtimes)

**Python Dependencies**:
- fastapi >=0.104.0
- uvicorn[standard] >=0.24.0
- httpx >=0.25.0
- pydantic >=2.5.0
- psutil >=5.9.0
- structlog >=23.2.0

**Development Dependencies**:
- pytest >=7.4.0
- pytest-asyncio >=0.21.0
- pytest-cov >=4.1.0
- httpx (for testing)

## Performance Considerations

- Execution overhead target: ≤50ms (p95)
- Minimize subprocess spawning overhead
- Use async I/O for all HTTP operations
- Connection pooling for Control Plane client
- Batch artifact collection

## Testing Strategy

**Contract Tests**:
- Verify /execute endpoint request/response schemas
- Verify /health endpoint returns 200 OK
- Test error responses (400, 500)

**Integration Tests**:
- End-to-end execution flow
- Isolation verification (escape attempts)
- Callback retry logic
- Heartbeat transmission

**Unit Tests**:
- bwrap argument generation
- Result parsing from stdout
- Artifact scanning logic
- Timeout enforcement

## Open Questions Resolved

All technical unknowns have been resolved through research. No clarifications needed.

**Decisions Made**:
1. Python 3.11+ with FastAPI for HTTP API
2. subprocess + bwrap for process isolation
3. httpx for Control Plane callbacks with retry
4. structlog for structured logging
5. psutil for metrics collection
6. Asyncio for concurrency and heartbeat

**Next Phase**: Proceed to Phase 1 (Design & Contracts)
