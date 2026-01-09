# Data Model: Sandbox Control Plane

**Feature**: Sandbox Control Plane | **Date**: 2026-01-06 | **Status**: Complete

## Overview

This document defines the database schema for the Sandbox Control Plane service. The data model uses MariaDB 11.2+ as the relational database with JSON field support for flexible metadata storage.

## Entity Relationship Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Template  │────<│    Session   │>────│  Execution  │
└─────────────┘     └──────────────┘     └─────────────┘
                          │
                          │
                          v
                   ┌──────────────┐
                   │   Container  │
                   └──────────────┘
                          │
                          │
                          v
                   ┌──────────────┐
                   │ RuntimeNode  │
                   └──────────────┘

┌─────────────┐     ┌──────────────┐
│  Execution  │────<│   Artifact   │
└─────────────┘     └──────────────┘
```

## Entities

### Template

Represents a sandbox environment template with predefined image, resources, and configuration.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | VARCHAR(64) | PK, NOT NULL | Unique template identifier (tmpl_*) |
| `name` | VARCHAR(255) | NOT NULL, UNIQUE | Human-readable template name |
| `description` | TEXT | NULL | Template description |
| `image_url` | VARCHAR(512) | NOT NULL | Container image URL (e.g., registry.local/sandbox/python:3.11) |
| `runtime_type` | ENUM('python3.11', 'nodejs20', 'java17', 'go1.21') | NOT NULL | Runtime type |
| `default_cpu_cores` | DECIMAL(3,1) | NOT NULL, DEFAULT 0.5 | Default CPU cores (0.5, 1, 2, 4) |
| `default_memory_mb` | INT | NOT NULL, DEFAULT 512 | Default memory in MB (256, 512, 1024, 2048, 4096, 8192) |
| `default_disk_mb` | INT | NOT NULL, DEFAULT 1024 | Default disk size in MB (1024, 10240, 51200) |
| `default_timeout_sec` | INT | NOT NULL, DEFAULT 300 | Default execution timeout in seconds (1-3600) |
| `default_env_vars` | JSON | NULL | Default environment variables |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Template activation status |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**:
- `idx_template_name`: UNIQUE (name)
- `idx_template_runtime_type`: (runtime_type)
- `idx_template_active`: (is_active)

**Validation Rules**:
- `image_url` must reference valid container registry
- `runtime_type` must be supported by executor
- Resource defaults must be within allowed ranges (CPU: 0.5-4, Memory: 256-8192, Disk: 1024-51200)
- `default_env_vars` must be JSON object with string values

**Example**:
```json
{
  "id": "tmpl_python311_std",
  "name": "python3.11-standard",
  "description": "Standard Python 3.11 sandbox",
  "image_url": "registry.local/sandbox/python:3.11-standard",
  "runtime_type": "python3.11",
  "default_cpu_cores": 0.5,
  "default_memory_mb": 512,
  "default_disk_mb": 1024,
  "default_timeout_sec": 300,
  "default_env_vars": {"PYTHONPATH": "/workspace", "TZ": "UTC"},
  "is_active": true
}
```

---

### Session

Represents a sandbox execution session (container instance).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | VARCHAR(64) | PK, NOT NULL | Unique session identifier (sess_*) |
| `template_id` | VARCHAR(64) | FK(Template.id), NOT NULL | Associated template ID |
| `status` | ENUM('creating', 'running', 'completed', 'failed', 'timeout', 'terminated') | NOT NULL, DEFAULT 'creating' | Session status |
| `mode` | ENUM('ephemeral', 'persistent') | NOT NULL | Session mode (ephemeral: one-time, persistent: reusable) |
| `runtime_type` | ENUM('python3.11', 'nodejs20', 'java17', 'go1.21') | NOT NULL | Runtime type (inherited from template) |
| `cpu_cores` | DECIMAL(3,1) | NOT NULL | Allocated CPU cores |
| `memory_mb` | INT | NOT NULL | Allocated memory in MB |
| `disk_mb` | INT | NOT NULL | Allocated disk size in MB |
| `timeout_sec` | INT | NOT NULL | Session timeout in seconds |
| `env_vars` | JSON | NULL | Environment variables (merged with template defaults) |
| `container_id` | VARCHAR(128) | NULL | Docker/K8s container ID (populated after allocation) |
| `node_id` | VARCHAR(64) | NULL, FK(RuntimeNode.node_id) | Assigned runtime node ID |
| `workspace_s3_path` | VARCHAR(512) | NULL | S3 path for workspace files (s3://bucket/workspace/{session_id}/) |
| `agent_id` | VARCHAR(128) | NULL | Agent ID for affinity scheduling (persistent mode) |
| `executor_url` | VARCHAR(512) | NULL | Executor HTTP endpoint URL (http://{container_ip}:8080) |
| `error_message` | TEXT | NULL | Error message (if status is failed/timeout) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Session creation timestamp |
| `started_at` | TIMESTAMP | NULL | Container start timestamp |
| `terminated_at` | TIMESTAMP | NULL | Session termination timestamp |
| `last_activity_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Last activity timestamp (for timeout/cleanup) |
| `expires_at` | TIMESTAMP | NULL | Session expiration timestamp (based on timeout) |

**Indexes**:
- `idx_session_template_id`: (template_id)
- `idx_session_status`: (status)
- `idx_session_agent_id`: (agent_id) -- For affinity scheduling
- `idx_session_node_id`: (node_id) -- For node capacity tracking
- `idx_session_last_activity`: (last_activity_at) -- For cleanup job
- `idx_session_expires_at`: (expires_at) -- For timeout enforcement

**State Transitions**:
```
creating → running        (Container successfully started)
creating → failed         (Container startup failed)
running → completed       (Normal termination)
running → failed          (Execution error)
running → timeout         (Session timeout exceeded)
running → terminated      (User-initiated termination)
```

**Validation Rules**:
- `mode` must be 'ephemeral' or 'persistent'
- Resource values must be within template-defined ranges
- `env_vars` must be JSON object with string values (max 64 keys, 10KB total)
- `agent_id` required for persistent mode
- `status` transitions must follow valid state machine

**Example**:
```json
{
  "id": "sess_abc123",
  "template_id": "tmpl_python311_std",
  "status": "running",
  "mode": "persistent",
  "runtime_type": "python3.11",
  "cpu_cores": 0.5,
  "memory_mb": 512,
  "disk_mb": 1024,
  "timeout_sec": 300,
  "env_vars": {"API_KEY": "sk-xxx", "PYTHONPATH": "/workspace"},
  "container_id": "a1b2c3d4e5f6",
  "node_id": "node-01",
  "workspace_s3_path": "s3://sandbox-workspaces/sess_abc123/",
  "agent_id": "agent_456",
  "executor_url": "http://10.0.1.5:8080",
  "created_at": "2026-01-06T10:00:00Z",
  "started_at": "2026-01-06T10:00:02Z",
  "last_activity_at": "2026-01-06T10:05:00Z",
  "expires_at": "2026-01-06T10:10:00Z"
}
```

---

### Execution

Represents a code execution request within a session.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | VARCHAR(64) | PK, NOT NULL | Unique execution identifier (exec_*) |
| `session_id` | VARCHAR(64) | FK(Session.id), NOT NULL | Associated session ID |
| `status` | ENUM('pending', 'running', 'completed', 'failed', 'timeout') | NOT NULL, DEFAULT 'pending' | Execution status |
| `code` | TEXT | NOT NULL | Code to execute |
| `language` | VARCHAR(32) | NOT NULL | Programming language (python, javascript, java, go) |
| `entrypoint` | VARCHAR(255) | NULL | Entrypoint function/method (e.g., handler, main) |
| `event_data` | JSON | NULL | Event/context data passed to handler |
| `timeout_sec` | INT | NOT NULL | Execution timeout in seconds (max 3600) |
| `return_value` | JSON | NULL | Execution return value (JSON-encoded) |
| `stdout` | TEXT | NULL | Standard output (max 1MB) |
| `stderr` | TEXT | NULL | Standard error (max 1MB) |
| `exit_code` | INT | NULL | Exit code (0 = success, non-zero = error) |
| `metrics` | JSON | NULL | Execution metrics (duration_ms, memory_mb, cpu_time_ms) |
| `error_message` | TEXT | NULL | Error message (if status is failed/timeout) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Execution creation timestamp |
| `started_at` | TIMESTAMP | NULL | Execution start timestamp |
| `completed_at` | TIMESTAMP | NULL | Execution completion timestamp |

**Indexes**:
- `idx_execution_session_id`: (session_id)
- `idx_execution_status`: (status)
- `idx_execution_created_at`: (created_at) -- For cleanup

**State Transitions**:
```
pending → running       (Submitted to executor)
running → completed     (Successful execution)
running → failed        (Execution error)
running → timeout       (Timeout exceeded)
```

**Validation Rules**:
- `code` must be non-empty text (max 1MB)
- `language` must match session's `runtime_type`
- `timeout_sec` must be ≤ session's remaining timeout
- `event_data` must be JSON object (max 1MB)
- `return_value` must be JSON-serializable
- `stdout` and `stderr` truncated to 1MB if exceeded

**Example**:
```json
{
  "id": "exec_xyz789",
  "session_id": "sess_abc123",
  "status": "completed",
  "code": "def handler(event, context):\n    return {'result': 'hello world'}",
  "language": "python",
  "entrypoint": "handler",
  "event_data": {"name": "test"},
  "timeout_sec": 30,
  "return_value": {"result": "hello world"},
  "stdout": "Execution started\n",
  "stderr": "",
  "exit_code": 0,
  "metrics": {"duration_ms": 1234, "memory_mb": 64, "cpu_time_ms": 456},
  "created_at": "2026-01-06T10:05:00Z",
  "started_at": "2026-01-06T10:05:01Z",
  "completed_at": "2026-01-06T10:05:02Z"
}
```

---

### Container

Represents a container instance managed by the container scheduler.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | VARCHAR(128) | PK, NOT NULL | Container ID (Docker/K8s container ID) |
| `session_id` | VARCHAR(64) | FK(Session.id), NOT NULL | Associated session ID |
| `runtime_type` | ENUM('docker', 'kubernetes') | NOT NULL | Container runtime type |
| `node_id` | VARCHAR(64) | NOT NULL, FK(RuntimeNode.node_id) | Host node ID |
| `container_name` | VARCHAR(255) | NOT NULL | Container name (e.g., sandbox-sess_abc123) |
| `image_url` | VARCHAR(512) | NOT NULL | Container image URL |
| `status` | ENUM('created', 'running', 'paused', 'exited', 'deleting') | NOT NULL, DEFAULT 'created' | Container status |
| `ip_address` | VARCHAR(45) | NULL | Container IP address (IPv4/IPv6) |
| `executor_port` | INT | NULL | Executor port (default: 8080) |
| `cpu_cores` | DECIMAL(3,1) | NOT NULL | Allocated CPU cores |
| `memory_mb` | INT | NOT NULL | Allocated memory in MB |
| `disk_mb` | INT | NOT NULL | Allocated disk size in MB |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Container creation timestamp |
| `started_at` | TIMESTAMP | NULL | Container start timestamp |
| `exited_at` | TIMESTAMP | NULL | Container exit timestamp |

**Indexes**:
- `idx_container_session_id`: (session_id)
- `idx_container_node_id`: (node_id)
- `idx_container_status`: (status)

**Validation Rules**:
- `status` transitions must follow Docker/K8s container lifecycle
- `ip_address` must be valid IPv4/IPv6 address
- `executor_port` must be in range 1024-65535

**Example**:
```json
{
  "id": "a1b2c3d4e5f6",
  "session_id": "sess_abc123",
  "runtime_type": "docker",
  "node_id": "node-01",
  "container_name": "sandbox-sess_abc123",
  "image_url": "registry.local/sandbox/python:3.11-standard",
  "status": "running",
  "ip_address": "10.0.1.5",
  "executor_port": 8080,
  "cpu_cores": 0.5,
  "memory_mb": 512,
  "disk_mb": 1024,
  "created_at": "2026-01-06T10:00:00Z",
  "started_at": "2026-01-06T10:00:02Z"
}
```

---

### Artifact

Represents execution output artifacts (files, logs, etc.).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | VARCHAR(64) | PK, NOT NULL | Unique artifact identifier (art_*) |
| `execution_id` | VARCHAR(64) | FK(Execution.id), NOT NULL | Associated execution ID |
| `artifact_type` | ENUM('file', 'stdout', 'stderr', 'return_value') | NOT NULL | Artifact type |
| `name` | VARCHAR(255) | NULL | Artifact name (e.g., output.txt, result.json) |
| `s3_path` | VARCHAR(512) | NOT NULL | S3 object path (s3://bucket/artifacts/{execution_id}/{name}) |
| `size_bytes` | BIGINT | NOT NULL | Artifact size in bytes |
| `content_type` | VARCHAR(128) | NULL | Content type (e.g., text/plain, application/json) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Artifact creation timestamp |

**Indexes**:
- `idx_artifact_execution_id`: (execution_id)
- `idx_artifact_type`: (artifact_type)

**Validation Rules**:
- `s3_path` must be valid S3 URI
- `size_bytes` must be ≥ 0
- `artifact_type` must be one of: file, stdout, stderr, return_value

**Example**:
```json
{
  "id": "art_file123",
  "execution_id": "exec_xyz789",
  "artifact_type": "file",
  "name": "output.json",
  "s3_path": "s3://sandbox-artifacts/exec_xyz789/output.json",
  "size_bytes": 1024,
  "content_type": "application/json",
  "created_at": "2026-01-06T10:05:03Z"
}
```

---

### RuntimeNode

Represents a runtime node (Docker host or Kubernetes node) in the cluster.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `node_id` | VARCHAR(64) | PK, NOT NULL | Unique node identifier (node_*) |
| `hostname` | VARCHAR(255) | NOT NULL, UNIQUE | Node hostname |
| `runtime_type` | ENUM('docker', 'kubernetes') | NOT NULL | Container runtime type |
| `ip_address` | VARCHAR(45) | NOT NULL | Node IP address |
| `api_endpoint` | VARCHAR(512) | NULL | Docker socket URL or K8s API endpoint |
| `status` | ENUM('online', 'offline', 'draining', 'maintenance') | NOT NULL, DEFAULT 'online' | Node status |
| `total_cpu_cores` | DECIMAL(5,1) | NOT NULL | Total CPU cores available |
| `total_memory_mb` | INT | NOT NULL | Total memory available in MB |
| `allocated_cpu_cores` | DECIMAL(5,1) | NOT NULL, DEFAULT 0 | Allocated CPU cores |
| `allocated_memory_mb` | INT | NOT NULL, DEFAULT 0 | Allocated memory in MB |
| `running_containers` | INT | NOT NULL, DEFAULT 0 | Number of running containers |
| `max_containers` | INT | NOT NULL | Maximum containers allowed |
| `cached_images` | JSON | NULL | List of cached image URLs |
| `labels` | JSON | NULL | Node labels for scheduling (e.g., zone, gpu-type) |
| `last_heartbeat_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Last heartbeat timestamp |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Node registration timestamp |

**Indexes**:
- `idx_node_status`: (status)
- `idx_node_runtime_type`: (runtime_type)
- `idx_node_last_heartbeat`: (last_heartbeat_at) -- For health monitoring

**Validation Rules**:
- `allocated_cpu_cores` ≤ `total_cpu_cores`
- `allocated_memory_mb` ≤ `total_memory_mb`
- `running_containers` ≤ `max_containers`
- `status` transitions: online ↔ draining, offline → online (recovery)
- Node marked offline if `last_heartbeat_at` > 30 seconds ago

**Example**:
```json
{
  "node_id": "node-01",
  "hostname": "sandbox-node-01.example.com",
  "runtime_type": "docker",
  "ip_address": "10.0.1.10",
  "api_endpoint": "http://10.0.1.10:2375",
  "status": "online",
  "total_cpu_cores": 16.0,
  "total_memory_mb": 65536,
  "allocated_cpu_cores": 4.0,
  "allocated_memory_mb": 16384,
  "running_containers": 10,
  "max_containers": 50,
  "cached_images": ["registry.local/sandbox/python:3.11-standard", "registry.local/sandbox/nodejs:20"],
  "labels": {"zone": "us-west-1a", "gpu": "false"},
  "last_heartbeat_at": "2026-01-06T10:05:00Z",
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

## Relationships

### Foreign Keys

| Table | Foreign Key | References | On Delete |
|-------|-------------|------------|-----------|
| Session | template_id | Template(id) | CASCADE |
| Session | node_id | RuntimeNode(node_id) | SET NULL |
| Execution | session_id | Session(id) | CASCADE |
| Container | session_id | Session(id) | CASCADE |
| Container | node_id | RuntimeNode(node_id) | CASCADE |
| Artifact | execution_id | Execution(id) | CASCADE |

### Cascade Deletion Rules

- **Deleting Template** → CASCADE delete all associated Sessions
- **Deleting Session** → CASCADE delete all associated Executions and Containers
- **Deleting Execution** → CASCADE delete all associated Artifacts
- **Deleting Container** → No cascade (container records archived for auditing)
- **Deleting RuntimeNode** → SET NULL on Session.node_id (containers must be drained first)

---

## Data Retention

| Entity | Retention Period | Cleanup Strategy |
|--------|------------------|------------------|
| Session | 7 days after termination | Background cleanup job (delete_at field) |
| Execution | 30 days after completion | Background cleanup job |
| Artifact | 30 days after creation | Background cleanup job (S3 lifecycle policy) |
| Container | 1 day after exit | Background cleanup job |
| RuntimeNode | Permanent (manual deletion only) | N/A |

---

## Migration Notes

### Database Initialization

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS sandbox_control_plane
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create user (if needed)
CREATE USER IF NOT EXISTS 'sandbox_api'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON sandbox_control_plane.* TO 'sandbox_api'@'%';
FLUSH PRIVILEGES;
```

### Index Creation Strategy

1. Create all tables with PRIMARY KEY constraints
2. Create FOREIGN KEY constraints after all tables exist
3. Create indexes after data is loaded (for bulk imports)
4. Use `ALTER TABLE` for adding indexes to existing tables

---

## Performance Considerations

### Query Optimization

- **Frequently queried fields**: status, template_id, created_at, last_activity_at
- **Join queries**: Session → Template, Execution → Session, Container → RuntimeNode
- **Full-text search**: Not required (exact match on IDs and names)
- **Pagination**: All list endpoints support pagination (limit, offset)

### Connection Pooling

- SQLAlchemy async engine configuration:
  - `pool_size=20`: Minimum persistent connections
  - `max_overflow=40`: Maximum additional connections
  - `pool_recycle=3600`: Recycle connections after 1 hour
  - `pool_pre_ping=True`: Verify connections before use

---

## Security Considerations

### Data Encryption

- **At rest**: MariaDB Transparent Data Encryption (TDE) or disk encryption
- **In transit**: TLS/SSL for database connections
- **Sensitive fields**: `env_vars` JSON may contain API keys (encrypt at application level)

### Access Control

- **Database user**: Least privilege (SELECT, INSERT, UPDATE, DELETE on sandbox tables only)
- **Application user**: No DROP, CREATE, ALTER, GRANT privileges
- **Backup user**: Read-only access for backup jobs

### Input Validation

- All JSON fields validated at application level (Pydantic schemas)
- SQL injection prevention: Use parameterized queries (SQLAlchemy ORM)
- Length limits on all VARCHAR and TEXT fields

---

## Conclusion

This data model provides a robust foundation for the Sandbox Control Plane service with:

- **Clear separation of concerns**: Templates, Sessions, Executions, Containers, Artifacts, RuntimeNodes
- **Flexible metadata**: JSON fields for env_vars, metrics, labels, event_data
- **State tracking**: Status enums with valid state transitions
- **Performance optimization**: Strategic indexes on frequently queried fields
- **Data integrity**: Foreign key constraints with CASCADE deletion
- **Observability**: Timestamps for lifecycle tracking (created_at, started_at, completed_at, etc.)
- **Scalability**: Support for 1000+ concurrent sessions with connection pooling
