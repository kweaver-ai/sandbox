# Quickstart Guide: Sandbox Control Plane

**Feature**: Sandbox Control Plane | **Date**: 2026-01-06 | **Status**: Complete

## Overview

This guide provides practical examples for using the Sandbox Control Plane API to create sessions, execute code, retrieve results, and manage templates.

## Prerequisites

- Control Plane service running at `http://localhost:8000`
- Valid API access token for authentication
- HTTP client (curl, httpie, or Python requests)

## Authentication

All API requests require authentication via Bearer token:

```bash
export API_TOKEN="your-access-token-here"
export API_BASE="http://localhost:8000/api/v1"
```

## Quick Reference

| Operation | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| Create Session | POST | `/sessions` | Create new sandbox session |
| Get Session | GET | `/sessions/{id}` | Get session details |
| Terminate Session | DELETE | `/sessions/{id}` | Terminate session |
| Execute Code | POST | `/sessions/{id}/execute` | Submit execution task |
| Get Execution Status | GET | `/executions/{id}/status` | Query execution status |
| Get Execution Result | GET | `/executions/{id}/result` | Get execution results |
| Upload File | POST | `/sessions/{id}/files/upload` | Upload file to workspace |
| Download File | GET | `/sessions/{id}/files/{name}` | Download file from workspace |
| List Templates | GET | `/templates` | List available templates |
| Get Template | GET | `/templates/{id}` | Get template details |
| List Containers | GET | `/containers` | List all containers |

---

## 1. Creating a Session

Create a new sandbox session with specified template and resources.

### Example: Python Basic Environment

```bash
curl -X POST "$API_BASE/sessions" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "python-basic",
    "timeout": 300,
    "resources": {
      "cpu": "1",
      "memory": "512Mi",
      "disk": "1Gi"
    },
    "env_vars": {
      "LOG_LEVEL": "info"
    }
  }'
```

**Response** (201 Created):
```json
{
  "session_id": "sess_abc123def4567890",
  "status": "creating",
  "template_id": "python-basic",
  "runtime_type": "docker",
  "workspace_path": "s3://sandbox-workspace/sessions/sess_abc123def4567890/",
  "resources": {
    "cpu": "1",
    "memory": "512Mi",
    "disk": "1Gi"
  },
  "created_at": "2026-01-06T10:00:00Z"
}
```

### Example: Python Data Science Environment

```bash
curl -X POST "$API_BASE/sessions" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "python-datascience",
    "timeout": 3600,
    "resources": {
      "cpu": "2",
      "memory": "2Gi",
      "disk": "5Gi"
    }
  }'
```

---

## 2. Getting Session Details

Query the status and details of a session.

```bash
curl -X GET "$API_BASE/sessions/sess_abc123def4567890" \
  -H "Authorization: Bearer $API_TOKEN"
```

**Response** (200 OK):
```json
{
  "session_id": "sess_abc123def4567890",
  "status": "running",
  "template_id": "python-basic",
  "runtime_type": "docker",
  "runtime_node": "node-01",
  "container_id": "a1b2c3d4e5f6",
  "workspace_path": "s3://sandbox-workspace/sessions/sess_abc123def4567890/",
  "resources": {
    "cpu": "1",
    "memory": "512Mi",
    "disk": "1Gi"
  },
  "created_at": "2026-01-06T10:00:00Z",
  "started_at": "2026-01-06T10:00:02Z",
  "timeout": 300
}
```

---

## 3. Executing Code

Submit code execution task to a session.

### Example: Simple Hello World

```bash
curl -X POST "$API_BASE/sessions/sess_abc123def4567890/execute" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def handler(event):\n    name = event.get(\"name\", \"World\")\n    return {\n        \"statusCode\": 200,\n        \"body\": f\"Hello, {name}!\"\n    }",
    "language": "python",
    "timeout": 30,
    "event": {
      "name": "Alice"
    }
  }'
```

**Response** (200 OK):
```json
{
  "execution_id": "exec_20260106_abc12345",
  "status": "submitted",
  "submitted_at": "2026-01-06T10:05:00Z"
}
```

### Example: Data Processing

```bash
curl -X POST "$API_BASE/sessions/sess_abc123def4567890/execute" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "import statistics\n\ndef handler(event):\n    numbers = event.get(\"data\", [])\n    return {\n        \"mean\": statistics.mean(numbers),\n        \"median\": statistics.median(numbers),\n        \"stdev\": statistics.stdev(numbers) if len(numbers) > 1 else 0\n    }",
    "language": "python",
    "timeout": 60,
    "event": {
      "data": [1, 2, 3, 4, 5]
    }
  }'
```

---

## 4. Getting Execution Status

Query the current status of an execution.

```bash
curl -X GET "$API_BASE/executions/exec_20260106_abc12345/status" \
  -H "Authorization: Bearer $API_TOKEN"
```

**Response** (200 OK):
```json
{
  "execution_id": "exec_20260106_abc12345",
  "session_id": "sess_abc123def4567890",
  "status": "completed",
  "created_at": "2026-01-06T10:05:00Z",
  "completed_at": "2026-01-06T10:05:02Z"
}
```

**Status Values**:
- `pending`: Execution queued
- `running`: Execution in progress
- `completed`: Execution finished successfully
- `failed`: Execution failed
- `timeout`: Execution timed out

---

## 5. Getting Execution Results

Retrieve the complete execution results including stdout, stderr, and return value.

```bash
curl -X GET "$API_BASE/executions/exec_20260106_abc12345/result" \
  -H "Authorization: Bearer $API_TOKEN"
```

**Response** (200 OK):
```json
{
  "execution_id": "exec_20260106_abc12345",
  "status": "success",
  "stdout": "Processing complete.\n",
  "stderr": "",
  "exit_code": 0,
  "execution_time": 0.07523,
  "return_value": {
    "statusCode": 200,
    "body": "Hello, Alice!"
  },
  "metrics": {
    "duration_ms": 75.23,
    "cpu_time_ms": 68.12,
    "peak_memory_mb": 42.5
  }
}
```

---

## 6. Uploading Files

Upload files to the session workspace.

```bash
curl -X POST "$API_BASE/sessions/sess_abc123def4567890/files/upload" \
  -H "Authorization: Bearer $API_TOKEN" \
  -F "file=@/path/to/input.csv" \
  -F "path=data/input.csv"
```

**Response** (200 OK):
```json
{
  "path": "data/input.csv",
  "size": 1024
}
```

---

## 7. Downloading Files

Download files from the session workspace.

```bash
curl -X GET "$API_BASE/sessions/sess_abc123def4567890/files/output/result.csv" \
  -H "Authorization: Bearer $API_TOKEN" \
  -O -J
```

**Response**: File content or redirect to S3 presigned URL for large files.

---

## 8. Listing Templates

Query all available sandbox environment templates.

```bash
curl -X GET "$API_BASE/templates?limit=10" \
  -H "Authorization: Bearer $API_TOKEN"
```

**Response** (200 OK):
```json
{
  "templates": [
    {
      "id": "python-basic",
      "name": "Python Basic Environment",
      "image": "registry.local/sandbox/python:3.11-basic",
      "default_resources": {
        "cpu": "1",
        "memory": "512Mi",
        "disk": "1Gi"
      },
      "created_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": "python-datascience",
      "name": "Python Data Science",
      "image": "registry.local/sandbox/python:3.11-datascience",
      "default_resources": {
        "cpu": "2",
        "memory": "2Gi",
        "disk": "5Gi"
      },
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 2
}
```

---

## 9. Getting Template Details

Query detailed information about a specific template.

```bash
curl -X GET "$API_BASE/templates/python-datascience" \
  -H "Authorization: Bearer $API_TOKEN"
```

**Response** (200 OK):
```json
{
  "id": "python-datascience",
  "name": "Python Data Science",
  "image": "registry.local/sandbox/python:3.11-datascience",
  "base_image": "python:3.11-slim",
  "pre_installed_packages": [
    "numpy>=1.24.0",
    "pandas>=2.0.0",
    "scikit-learn>=1.3.0"
  ],
  "default_resources": {
    "cpu": "2",
    "memory": "2Gi",
    "disk": "5Gi"
  },
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

## 10. Listing Containers

Query all containers and their status.

```bash
curl -X GET "$API_BASE/containers?status=running&limit=10" \
  -H "Authorization: Bearer $API_TOKEN"
```

**Response** (200 OK):
```json
{
  "containers": [
    {
      "container_id": "a1b2c3d4e5f6",
      "runtime_type": "docker",
      "status": "running",
      "session_id": "sess_abc123def4567890",
      "template_id": "python-basic",
      "resources": {
        "cpu": "1",
        "memory": "512Mi",
        "disk": "1Gi"
      },
      "created_at": "2026-01-06T10:00:00Z",
      "uptime_seconds": 300
    }
  ],
  "total": 1
}
```

---

## 11. Getting Container Logs

Retrieve container logs for debugging.

```bash
curl -X GET "$API_BASE/containers/a1b2c3d4e5f6/logs?tail=100" \
  -H "Authorization: Bearer $API_TOKEN"
```

**Response** (200 OK):
```
2026-01-06T10:00:00Z [INFO] sandbox-executor starting
2026-01-06T10:00:01Z [INFO] Workspace mounted at /workspace
2026-01-06T10:00:02Z [INFO] HTTP server listening on port 8080
```

---

## 12. Terminating a Session

Terminate a session and release resources.

```bash
curl -X DELETE "$API_BASE/sessions/sess_abc123def4567890" \
  -H "Authorization: Bearer $API_TOKEN"
```

**Response** (200 OK):
```json
{
  "message": "Session terminated successfully"
}
```

---

## Complete Workflow Example

End-to-end example: Create session, execute code, get results, terminate session.

```bash
# 1. Create session
SESSION_RESPONSE=$(curl -s -X POST "$API_BASE/sessions" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "python-basic",
    "timeout": 300,
    "resources": {
      "cpu": "1",
      "memory": "512Mi",
      "disk": "1Gi"
    }
  }')

SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.session_id')
echo "Created session: $SESSION_ID"

# 2. Wait for session to be ready
sleep 5

# 3. Execute code
EXEC_RESPONSE=$(curl -s -X POST "$API_BASE/sessions/$SESSION_ID/execute" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def handler(event):\n    return {\"result\": event[\"x\"] + event[\"y\"]}",
    "language": "python",
    "timeout": 30,
    "event": {
      "x": 10,
      "y": 32
    }
  }')

EXECUTION_ID=$(echo $EXEC_RESPONSE | jq -r '.execution_id')
echo "Submitted execution: $EXECUTION_ID"

# 4. Poll for completion
while true; do
  STATUS=$(curl -s -X GET "$API_BASE/executions/$EXECUTION_ID/status" \
    -H "Authorization: Bearer $API_TOKEN" | jq -r '.status')

  if [ "$STATUS" == "completed" ] || [ "$STATUS" == "failed" ] || [ "$STATUS" == "timeout" ]; then
    break
  fi

  echo "Execution status: $STATUS"
  sleep 1
done

# 5. Get result
curl -s -X GET "$API_BASE/executions/$EXECUTION_ID/result" \
  -H "Authorization: Bearer $API_TOKEN" | jq '.'

# 6. Terminate session
curl -s -X DELETE "$API_BASE/sessions/$SESSION_ID" \
  -H "Authorization: Bearer $API_TOKEN"
```

**Expected Output**:
```
Created session: sess_abc123def4567890
Submitted execution: exec_20260106_abc12345
Execution status: pending
Execution status: running
{
  "execution_id": "exec_20260106_abc12345",
  "status": "success",
  "stdout": "",
  "stderr": "",
  "exit_code": 0,
  "execution_time": 0.045,
  "return_value": {
    "result": 42
  },
  "metrics": {
    "duration_ms": 45.2,
    "cpu_time_ms": 40.1,
    "peak_memory_mb": 32.5
  }
}
{
  "message": "Session terminated successfully"
}
```

---

## Error Handling

All API errors follow a structured format:

```json
{
  "error_code": "Sandbox.SessionNotFound",
  "description": "Session not found",
  "error_detail": "Session 'sess_invalid123' does not exist or has been terminated",
  "solution": "Please check the session_id"
}
```

**Common Error Codes**:
- `Sandbox.InvalidParameter`: Invalid request parameter
- `Sandbox.SessionNotFound`: Session does not exist
- `Sandbox.ExecutionNotFound`: Execution does not exist
- `Sandbox.ExecException`: Handler execution error
- `Sandbox.TooManyRequestsExection`: No available sandbox (all nodes at capacity)
- `Sandbox.ExecTimeout`: Execution timeout
- `Sandbox.InternalError`: Internal server error

---

## Best Practices

### 1. **Resource Selection**
- Start with default resources (1 CPU, 512Mi memory) for simple tasks
- Scale up for data processing or machine learning workloads
- Monitor execution metrics to optimize resource allocation

### 2. **Timeout Configuration**
- Set appropriate timeouts based on expected execution time
- Default session timeout: 300s (5 minutes)
- Maximum execution timeout: 3600s (1 hour)

### 3. **Error Handling**
- Always check execution status before retrieving results
- Handle timeout and failure cases gracefully
- Use structured error messages for debugging

### 4. **Session Management**
- Use persistent sessions for multiple related executions
- Terminate sessions when done to free resources
- Monitor session expiration times

### 5. **File Operations**
- Upload input files before submitting execution
- Check file size limits (100MB per file)
- Use S3 presigned URLs for large file downloads

---

## Python SDK Example

```python
import requests
import time

class SandboxClient:
    def __init__(self, api_base, api_token):
        self.api_base = api_base
        self.headers = {"Authorization": f"Bearer {api_token}"}

    def create_session(self, template_id, resources=None):
        response = requests.post(
            f"{self.api_base}/sessions",
            json={"template_id": template_id, "resources": resources},
            headers=self.headers
        )
        return response.json()

    def execute_code(self, session_id, code, event=None, timeout=30):
        response = requests.post(
            f"{self.api_base}/sessions/{session_id}/execute",
            json={
                "code": code,
                "language": "python",
                "timeout": timeout,
                "event": event or {}
            },
            headers=self.headers
        )
        return response.json()

    def wait_for_result(self, execution_id, poll_interval=1):
        while True:
            status_response = requests.get(
                f"{self.api_base}/executions/{execution_id}/status",
                headers=self.headers
            )
            status = status_response.json()["status"]

            if status in ["completed", "failed", "timeout"]:
                break

            time.sleep(poll_interval)

        result_response = requests.get(
            f"{self.api_base}/executions/{execution_id}/result",
            headers=self.headers
        )
        return result_response.json()

    def terminate_session(self, session_id):
        response = requests.delete(
            f"{self.api_base}/sessions/{session_id}",
            headers=self.headers
        )
        return response.json()

# Usage
client = SandboxClient("http://localhost:8000/api/v1", "your-token")

session = client.create_session("python-basic")
session_id = session["session_id"]

execution = client.execute_code(
    session_id,
    "def handler(event):\n    return {'result': event['x'] + event['y']}",
    event={"x": 10, "y": 32}
)
execution_id = execution["execution_id"]

result = client.wait_for_result(execution_id)
print(result)

client.terminate_session(session_id)
```

---

## Next Steps

- Explore the [API specification](./contracts/control-plane-api.yaml) for complete endpoint documentation
- Review the [data model](./data-model.md) for database schema details
- Read the [implementation plan](./plan.md) for architecture insights
- Check the [research document](./research.md) for technology choices

---

## Support

For issues or questions:
1. Check error codes and messages
2. Review API documentation
3. Contact support with session_id and execution_id for debugging
