# API Reference

This document describes the REST API endpoints provided by the Sandbox Runtime server.

## Base URL

All API endpoints are prefixed with `/workspace/se/`:

```
http://localhost:8000/workspace/se/{endpoint}
```

## Authentication

Currently, the API does not require authentication. For production deployments, consider adding authentication middleware.

## Response Format

All responses follow this structure:

```json
{
  "success": true|false,
  "data": { ... },
  "error": "error message (if failed)"
}
```

## Endpoints

### Session Management

#### Create Session

Creates a new sandbox session for code execution.

**Endpoint:** `POST /workspace/se/session/{session_id}`

**Path Parameters:**
- `session_id` (string) - Unique identifier for the session

**Request Body:**
```json
{
  "allow_network": true,
  "cpu_quota": 2,
  "memory_limit": 131072,
  "timeout": 300
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "session_123",
    "status": "active",
    "created_at": "2025-01-10T12:00:00Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/workspace/se/session/my_session \
  -H "Content-Type: application/json" \
  -d '{
    "allow_network": true,
    "cpu_quota": 2,
    "memory_limit": 131072
  }'
```

#### Close Session

Closes an active sandbox session and releases resources.

**Endpoint:** `DELETE /workspace/se/session/{session_id}`

**Path Parameters:**
- `session_id` (string) - Session identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Session closed successfully"
  }
}
```

**Example:**
```bash
curl -X DELETE http://localhost:8000/workspace/se/session/my_session
```

---

### Code Execution

#### Execute Python Code

Executes Python code in the sandbox session.

**Endpoint:** `POST /workspace/se/execute_code/{session_id}`

**Path Parameters:**
- `session_id` (string) - Session identifier

**Request Body:**
```json
{
  "code": "print('Hello, World!')",
  "timeout": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exit_code": 0,
    "stdout": "Hello, World!\n",
    "stderr": "",
    "execution_time": 0.123
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/workspace/se/execute_code/my_session \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def handler(event):\n    return {\"message\": \"Hello!\"}\nprint(handler({}))",
    "timeout": 10
  }'
```

#### Execute Lambda Handler

Executes a Lambda-style handler function.

**Endpoint:** `POST /workspace/se/execute/{session_id}`

**Path Parameters:**
- `session_id` (string) - Session identifier

**Request Body:**
```json
{
  "code": "def handler(event, context):\n    return {\"statusCode\": 200, \"body\": \"Hello\"}",
  "event": { "name": "World" },
  "timeout": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "result": {"statusCode": 200, "body": "Hello"},
    "exit_code": 0,
    "stdout": "",
    "stderr": "",
    "execution_time": 0.056
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/workspace/se/execute/my_session \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def handler(event, context): return {\"message\": f\"Hello, {event.get(\"name\", \"World\")}!\"}",
    "event": {"name": "Sandbox"},
    "timeout": 10
  }'
```

---

### File Operations

#### Upload File

Uploads a file to the sandbox session.

**Endpoint:** `POST /workspace/se/upload/{session_id}`

**Path Parameters:**
- `session_id` (string) - Session identifier

**Request:** `multipart/form-data`

**Form Fields:**
- `file` - File to upload
- `path` (optional) - Destination path within session

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "data.csv",
    "path": "/workspace/files/data.csv",
    "size": 1024
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/workspace/se/upload/my_session \
  -F "file=@./local_file.txt" \
  -F "path=/workspace/files/"
```

#### Download File

Downloads a file from the sandbox session.

**Endpoint:** `GET /workspace/se/download/{session_id}/{filename}`

**Path Parameters:**
- `session_id` (string) - Session identifier
- `filename` (string) - Name of file to download

**Response:** File content (binary or text)

**Example:**
```bash
curl -O http://localhost:8000/workspace/se/download/my_session/output.txt
```

#### List Files

Lists files in the sandbox session directory.

**Endpoint:** `GET /workspace/se/files/{session_id}`

**Path Parameters:**
- `session_id` (string) - Session identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {"name": "input.txt", "size": 1024, "modified": "2025-01-10T12:00:00Z"},
      {"name": "output.txt", "size": 2048, "modified": "2025-01-10T12:05:00Z"}
    ]
  }
}
```

**Example:**
```bash
curl http://localhost:8000/workspace/se/files/my_session
```

---

### Health Check

#### Health Status

Check if the server is running.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "version": "0.1.0"
}
```

**Example:**
```bash
curl http://localhost:8000/health
```

---

## Error Responses

Errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Session 'my_session' does not exist"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `SESSION_NOT_FOUND` | Session does not exist |
| `SESSION_EXPIRED` | Session has timed out |
| `EXECUTION_TIMEOUT` | Code execution exceeded timeout |
| `RESOURCE_LIMIT` | Resource limit exceeded (CPU/memory) |
| `INVALID_CODE` | Code syntax or runtime error |
| `FILE_NOT_FOUND` | Requested file does not exist |

---

## Status Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 400 | Bad Request |
| 404 | Resource Not Found |
| 500 | Internal Server Error |

---

## SDK Usage

Instead of using raw HTTP requests, you can use the Python SDK:

```python
from sandbox_runtime.sdk import SandboxClient

client = SandboxClient(base_url="http://localhost:8000")

# Create session
await client.create_session(session_id="my_session")

# Execute code
result = await client.execute_code(
    session_id="my_session",
    code="print('Hello!')",
    timeout=10
)

print(result.stdout)

# Close session
await client.close_session(session_id="my_session")
```

See [Development](development.md) for more SDK examples.
