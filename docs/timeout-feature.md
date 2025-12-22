# Sandbox Timeout Control Feature

## Overview

The Sandbox Runtime now supports timeout control for Python handler execution. This feature ensures that long-running or stuck handlers are properly terminated after a specified time limit.

## Implementation Details

### 1. Timeout Control via Event Parameter

The timeout can be controlled by passing a `__timeout` parameter in the `event` object:

```python
event = {
    "data": "...",
    "__timeout": 30  # Timeout in seconds (optional, default: 300)
    # Note: Double underscore prefix avoids conflict with user's business parameters
}
```

### 2. Timeout Enforcement

The timeout is enforced at multiple levels:

1. **API Level (`execute_code_v2`)**: Uses `asyncio.wait_for()` to timeout the execution
2. **Socket Level**: Sets socket timeout for communication with the sandbox daemon
3. **Daemon Level**: Uses threading with timeout to control handler execution

### 3. Default Values and Limits

- **Default Timeout**: 300 seconds (5 minutes)
- **Minimum Timeout**: 1 second (values <= 0 use default)
- **Maximum Timeout**: 3600 seconds (1 hour, values > 3600 use 3600)

## API Usage

### HTTP API (v2/execute_code)

```bash
curl -X POST http://localhost:9101/v2/execute_code \
  -H "Content-Type: application/json" \
  -d '{
    "handler_code": "def handler(event): import time; time.sleep(5); return {\"status\": \"done\"}",
    "event": {
      "__timeout": 3
    }
  }'
```

### Response on Timeout

```json
{
  "detail": {
    "error_code": "Sandbox.ExecTimeout",
    "description": "Handler execution timeout",
    "error_detail": "Execution timed out after 3 seconds",
    "solution": "Consider optimizing your handler or increasing the __timeout parameter in the event"
  }
}
```

### CLI Usage

```bash
# Using sandbox-run CLI
sandbox-run script.py --event '{"__timeout": 10}'
```

## Handler Implementation Examples

### Example 1: Simple Handler

```python
def handler(event):
    # Do some work
    import time
    time.sleep(2)

    return {
        "status": "success",
        "message": "Handler completed"
    }
```

### Example 2: Handler with Business "timeout" Parameter

```python
def handler(event):
    # User's business timeout parameter (not the system timeout)
    business_timeout = event.get("timeout", 30)  # User parameter

    import time

    # Simulate work
    for i in range(5):
        print(f"Processing step {i+1}/5 (business timeout: {business_timeout}s)")
        time.sleep(1)

    return {"status": "completed", "steps": 5}
```

### Example 3: Infinite Loop Handler (Will be Terminated by __timeout)

```python
def handler(event):
    # This will run forever unless __timeout is set
    count = 0
    while True:
        count += 1
        print(f"Still running... iteration {count}")
        time.sleep(1)
```

With system timeout in event (won't conflict with user's business timeout):
```json
{
  "handler_code": "...",
  "event": {
    "timeout": 30,        # User's business parameter
    "user_id": 12345,     # Other business parameters
    "__timeout": 5        # System timeout (will terminate after 5 seconds)
  }
}
```

## Error Codes

| Exit Code | Description |
|-----------|-------------|
| 0 | Success |
| 124 | Timeout (standard Unix timeout exit code) |
| 1 | Syntax or code loading error |
| 2 | Handler execution exception |

## Metrics

The execution metrics include timeout information:

```json
{
  "metrics": {
    "duration_ms": 5000,
    "memory_peak_mb": 32.5,
    "cpu_time_ms": 4900,
    "timeout_seconds": 5,
    "timed_out": true
  }
}
```

## Best Practices

### 1. Always Set Reasonable Timeouts

```python
# Good: Set timeout based on expected execution time
event = {
    "data": {"items": [...]},
    "timeout": 60  # 1 minute for processing 100 items
}
```

### 2. Handle Timeouts Gracefully

```python
def handler(event):
    start_time = time.time()
    timeout = event.get("timeout", 300)

    # Check remaining time periodically
    remaining = timeout - (time.time() - start_time)
    if remaining < 5:
        print("Warning: Running out of time!")

    # Do work...
```

### 3. Use Efficient Algorithms

```python
# Bad: O(n²) algorithm that may timeout
def handler(event):
    items = event.get("items", [])
    result = []
    for i in items:
        for j in items:  # O(n²)
            if i < j:
                result.append((i, j))
    return result

# Good: O(n log n) algorithm
def handler(event):
    items = event.get("items", [])
    sorted_items = sorted(items)
    # Use more efficient approach
    return ...
```

## Technical Details

### Threading Implementation

The sandbox daemon uses threading to implement timeout control:

```python
def execute_handler(handler_code, event, context):
    timeout_seconds = event.get("timeout", 300)

    def execute_with_timeout():
        nonlocal handler_result
        handler_result = handler_func(event)

    thread = threading.Thread(target=execute_with_timeout)
    thread.daemon = True
    thread.start()
    thread.join(timeout=timeout_seconds)

    if thread.is_alive():
        raise TimeoutError(f"Handler timed out after {timeout_seconds}s")
```

### Socket Timeouts

Communication between the main process and sandbox daemon uses socket timeouts:

- Connection timeout: 5 seconds
- Receive timeout: 3600 seconds (1 hour maximum)

### Process Isolation

The sandbox process isolation ensures that:
- Timeout termination doesn't affect other handlers
- System resources are properly cleaned up
- The sandbox can be reused after timeout

## Troubleshooting

### Handler Keeps Running After Timeout

Python doesn't support killing threads directly. If a handler contains infinite loops or blocking operations:

1. Use non-blocking operations where possible
2. Check for timeout conditions in long-running loops
3. Break work into smaller chunks

### False Timeouts

If you're getting timeouts unexpectedly:

1. Check if the handler is doing I/O operations
2. Verify the timeout value is reasonable for the task
3. Add logging to identify bottlenecks

### Performance Impact

The timeout mechanism has minimal performance impact:
- Thread creation overhead is negligible
- No polling is used
- Timeout checks are only at thread completion