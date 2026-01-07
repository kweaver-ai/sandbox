# Data Model: Runtime Executor (sandbox-executor)

**Feature**: 001-runtime-executor
**Date**: 2025-01-06
**Status**: Complete

## Overview

This document defines the core data entities for the sandbox-executor component, extracted from the feature specification and functional requirements.

## Core Entities

### 1. Execution Request

Represents a request to execute code in the sandbox.

**Fields**:
- `code` (string, required): User code to execute (Python/JavaScript/Shell)
- `language` (enum, required): Programming language - `python` | `javascript` | `shell`
- `timeout` (integer, required): Maximum execution time in seconds (1-3600, default 30)
- `stdin` (string, optional): Standard input for the process (JSON string for event data)
- `execution_id` (string, required): Unique execution identifier (format: `exec_[timestamp]_[uuid8]`)
- `event` (object, optional): Event data passed to handler function (JSON object)

**Validation Rules**:
- `code` size ≤1MB
- `timeout` range: 1-3600 seconds
- `language` must be in whitelist
- `execution_id` must match pattern `^exec_[0-9]{8}_[a-z0-9]{8}$`

**State Transitions**: N/A (immutable request)

### 2. Execution Result

Represents the outcome of a code execution.

**Fields**:
- `status` (enum, required): Execution status - `success` | `failed` | `timeout` | `error`
- `stdout` (string, required): Standard output (max 10MB)
- `stderr` (string, required): Standard error (max 10MB)
- `exit_code` (integer, required): Process exit code
- `execution_time` (float, required): Wall-clock execution time in seconds
- `return_value` (object or null, optional): Handler function return value (JSON-serializable)
- `metrics` (ExecutionMetrics, required): Performance metrics
- `artifacts` (array of string, required): List of generated file paths (relative to workspace)

**Validation Rules**:
- `execution_time` ≥0
- `exit_code` ≥-1 (where -1 indicates timeout/error)
- `stdout`/`stderr` truncated at 10MB with warning logged
- `return_value` must be JSON-serializable if present

**State Transitions**: N/A (immutable result)

### 3. Execution Metrics

Represents performance metrics collected during execution.

**Fields**:
- `duration_ms` (float, required): Wall-clock time in milliseconds
- `cpu_time_ms` (float, required): CPU time in milliseconds
- `peak_memory_mb` (float, optional): Peak memory usage in MB
- `io_read_bytes` (integer, optional): Bytes read from disk
- `io_write_bytes` (integer, optional): Bytes written to disk

**Validation Rules**:
- All numeric values ≥0
- `duration_ms` and `cpu_time_ms` are required
- Other fields are optional (may not be available in all environments)

**State Transitions**: N/A (immutable metrics)

### 4. Artifact Metadata

Represents a file generated during execution.

**Fields**:
- `path` (string, required): Relative file path from workspace root (e.g., `output/result.csv`)
- `size` (integer, required): File size in bytes
- `mime_type` (string, required): MIME type (e.g., `text/csv`, `image/png`)
- `type` (enum, required): File classification - `artifact` | `log` | `output`
- `created_at` (timestamp, optional): File creation time (ISO 8601)
- `checksum` (string, optional): SHA256 checksum
- `download_url` (string, optional): Pre-signed S3 URL for downloading

**Validation Rules**:
- `path` must not contain `..` (prevent path traversal)
- `path` must not start with `.` (exclude hidden files)
- `size` ≥0
- `mime_type` must be valid MIME type string

**State Transitions**: N/A (immutable metadata)

### 5. Heartbeat Signal

Represents a liveness signal during execution.

**Fields**:
- `timestamp` (timestamp, required): Heartbeat time (ISO 8601 format)
- `progress` (object, optional): Optional progress information (key-value pairs)

**Validation Rules**:
- `timestamp` must be valid ISO 8601 datetime
- `progress` can contain any JSON-serializable data

**State Transitions**: N/A (immutable signal)

### 6. Container Lifecycle Event

Represents executor container state changes.

**Fields**:
- `event_type` (enum, required): `ready` | `exited`
- `container_id` (string, required): Container ID (Docker or K8s container ID)
- `pod_name` (string, optional): Pod name (Kubernetes only)
- `executor_port` (integer, required): HTTP API port (default 8080)
- `ready_at` (timestamp, optional): When API started listening (for `ready` event)
- `exit_code` (integer, optional): Container exit code (for `exited` event)
- `exit_reason` (enum, optional): `normal` | `sigterm` | `sigkill` | `oom_killed` | `error`
- `exited_at` (timestamp, optional): When container exited (for `exited` event)

**Validation Rules**:
- `container_id` required for all events
- `exit_code` required for `exited` event
- `exit_reason` required for `exited` event
- Timestamps must be valid ISO 8601 datetimes

**State Transitions**:
- `ready` sent once on startup
- `exited` sent once on shutdown

## Entity Relationships

```
Execution Request
    ↓ (triggers)
Execution Result
    ├── contains → Execution Metrics
    └── contains → Artifact Metadata (0..n)

Execution Request
    ↓ (generates)
Heartbeat Signal (0..n during execution)

Container Lifecycle Event
    ├── (ready precedes) Execution Request
    └── Execution Result (exited follows completion)
```

## Data Flow

1. **Execution Flow**:
   ```
   Execution Request → Executor → (bwrap isolation) →
   Execution Result → Control Plane Callback
   ```

2. **Heartbeat Flow**:
   ```
   Active Execution → Heartbeat Loop →
   Heartbeat Signal (every 5s) → Control Plane Callback
   ```

3. **Lifecycle Flow**:
   ```
   Container Start → Lifecycle Event (ready) →
   Execution Requests... →
   Container Stop → Lifecycle Event (exited)
   ```

## State Machines

### Execution Status

```
[START] → pending → running → completed
                              ↓
                           failed
                              ↓
                           timeout
                              ↓
                            error
```

### Container Lifecycle

```
[START] → starting → ready → running → exited
                                      ↓
                                   crashed
```

## Validation Summary

**Input Validation** (all HTTP requests):
- Content-Type: application/json
- Request body size ≤1MB
- Required fields present and non-null
- Enum values in allowed sets
- Numeric values in valid ranges
- String patterns match regex

**Output Validation** (all HTTP responses):
- Content-Type: application/json
- Required fields present and non-null
- Consistent data types
- ISO 8601 timestamps
- Truncated large fields (stdout/stderr)

**Security Validation**:
- File paths don't contain `..`
- File paths don't start with `.`
- No command injection in code parameter
- No SQL injection in any parameters

## Error States

**Validation Errors** (400 Bad Request):
- Missing required field
- Invalid enum value
- Out-of-range numeric value
- Malformed JSON

**Execution Errors** (internal to executor):
- Code syntax error → status: failed, stderr contains traceback
- Handler not defined → status: failed, stderr explains requirement
- Timeout → status: timeout, stderr indicates timeout
- Isolation failure → status: error, stderr contains bwrap error
- Resource limit → status: error, stderr indicates limit exceeded

## Persistence

**No Database Persistence**: The executor does not persist data. All state is in-memory.

**Local Fallback**:
- Execution results saved to `/tmp/results/{execution_id}.json` if Control Plane unreachable
- Files cleaned up after successful upload or after 24 hours

**Reporting**:
- All results reported to Control Plane via HTTP callbacks
- Control Plane persists to database (MariaDB)

## Next Steps

This data model informs:
1. **API Contract Design** (contracts/executor-api.yaml)
2. **Pydantic Model Definitions** (executor/src/models.py)
3. **Test Data Fixtures** (executor/tests/fixtures.py)
