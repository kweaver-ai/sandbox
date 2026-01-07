# Sandbox Control Plane API Documentation

## Overview

The Sandbox Control Plane provides RESTful APIs for managing sandbox execution sessions and executing code in isolated container environments.

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

External API endpoints use Bearer token authentication:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Core Endpoints

### Session Management

#### Create Session
```http
POST /sessions
Content-Type: application/json

{
  "template_id": "python-basic",
  "timeout": 300,
  "resources": {
    "cpu": "1",
    "memory": "512Mi",
    "disk": "1Gi"
  }
}
```

#### Get Session
```http
GET /sessions/{session_id}
```

#### List Sessions
```http
GET /sessions?status=running&limit=10
```

#### Terminate Session
```http
DELETE /sessions/{session_id}
```

### Code Execution

#### Submit Execution
```http
POST /sessions/{session_id}/execute
Content-Type: application/json

{
  "code": "def handler(event):\n    return {'result': 'hello world'}",
  "language": "python",
  "timeout": 30,
  "event": {"name": "test"}
}
```

#### Get Execution Status
```http
GET /executions/{execution_id}/status
```

#### Get Execution Result
```http
GET /executions/{execution_id}/result
```

## Error Responses

All errors follow a structured format:

```json
{
  "error_code": "Sandbox.SessionNotFound",
  "description": "Session not found",
  "error_detail": "Session 'sess_abc123' does not exist",
  "solution": "Please check the session_id",
  "request_id": "req-abc-123"
}
```
