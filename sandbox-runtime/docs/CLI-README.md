# Sandbox Runtime CLI

The Sandbox Runtime CLI (`sandbox-run`) is a command-line tool for executing Python handler functions in a secure sandbox environment. It follows the AWS Lambda handler specification and provides a local development experience for testing serverless functions.

## Installation

```bash
# Install from source
cd sandbox-runtime
pip install -e .

# Or use uv
uv pip install -e .
```

## Usage

### Basic Usage

```bash
# Execute a Python script with default event (empty object)
sandbox-run script.py

# Execute with custom event data
sandbox-run script.py --event '{"name": "Alice"}'

# Execute with event from file
sandbox-run script.py --event-file event.json
```

### Command Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--event` | `-e` | Event data as JSON string | `{}` |
| `--event-file` | `-f` | Read event data from JSON file | - |
| `--context` | `-c` | Context data as JSON string | `{}` |
| `--context-file` | - | Read context data from JSON file | - |
| `--timeout` | `-t` | Execution timeout in seconds | `300` |
| `--verbose` | `-v` | Enable verbose logging | `False` |
| `--quiet` | `-q` | Quiet mode, only show results | `False` |
| `--profile` | `-p` | Show performance profiling | `False` |
| `--output` | `-o` | Save result to file | - |
| `--format` | - | Output format (pretty, json, yaml) | `pretty` |
| `--log-level` | - | Logging level (DEBUG, INFO, WARNING, ERROR) | `WARNING` |

## Handler Function Specification

Your Python script must define a `handler` function that accepts an `event` parameter:

```python
def handler(event):
    """
    Lambda-style handler function

    Args:
        event: Dictionary containing input data

    Returns:
        Any JSON-serializable value
    """
    name = event.get("name", "World")
    message = f"Hello, {name}!"

    # Print to stdout (captured)
    print(message)

    # Return result
    return {"message": message}
```

## Examples

### Example 1: Simple Hello World

```python
# hello.py
def handler(event):
    name = event.get("name", "World")
    return {"message": f"Hello, {name}!"}
```

```bash
$ sandbox-run hello.py --event '{"name": "Alice"}'
✅ Execution succeeded

📄 RESULT:
----------------------------------------
{"message": "Hello, Alice!"}
```

### Example 2: Mathematical Operations

```python
# math_ops.py
def handler(event):
    operation = event.get("operation", "sum")
    numbers = event.get("numbers", [])

    if operation == "sum":
        result = sum(numbers)
    elif operation == "average":
        result = sum(numbers) / len(numbers) if numbers else 0
    else:
        raise ValueError(f"Unknown operation: {operation}")

    return {"operation": operation, "result": result}
```

```bash
$ sandbox-run math_ops.py --event '{"operation": "average", "numbers": [1, 2, 3, 4, 5]}' --verbose
✅ Execution succeeded

⚡ METRICS:
----------------------------------------
  Duration:     15.23 ms
  CPU Time:     0.00 ms
  Memory Peak:  1.12 MB

📄 RESULT:
----------------------------------------
{"operation": "average", "result": 3.0}
```

### Example 3: Error Handling

```python
# error_example.py
def handler(event):
    raise ValueError("This is a test error")
```

```bash
$ sandbox-run error_example.py
❌ Execution failed (exit code: 1)

📥 STDERR:
----------------------------------------
System error: This is a test error
```

## Output Formats

### Pretty Format (Default)
Human-readable output with colors and sections.

### JSON Format
```bash
$ sandbox-run script.py --format json
{
  "exit_code": 0,
  "stdout": "Hello, World!\n",
  "stderr": "",
  "result": {"message": "Hello, World!"},
  "metrics": {
    "duration_ms": 45.23,
    "cpu_time_ms": 42.15,
    "memory_peak_mb": 32.5
  }
}
```

### YAML Format
```bash
$ sandbox-run script.py --format yaml
exit_code: 0
stdout: "Hello, World!\n"
stderr: ""
result:
  message: "Hello, World!"
metrics:
  duration_ms: 45.23
  cpu_time_ms: 42.15
  memory_peak_mb: 32.5
```

## Security Considerations

The CLI provides the following security features:

1. **Process Isolation**: Each handler runs in an isolated process using bubblewrap
2. **File System Isolation**: Limited file system access with read-only system directories
3. **Resource Limits**: CPU time and memory usage are restricted
4. **No Network Access**: By default, network access is disabled (currently requires `allow_network=True` for daemon communication)

## Performance Metrics

The CLI tracks and displays:
- **Duration**: Total execution time in milliseconds
- **CPU Time**: CPU time used by the handler
- **Memory Peak**: Maximum memory usage during execution

## Event and Context Files

You can store complex event or context data in JSON files:

```json
// event.json
{
  "user_id": 12345,
  "payload": {
    "action": "process",
    "items": ["item1", "item2", "item3"]
  },
  "metadata": {
    "source": "api",
    "version": "1.0"
  }
}
```

```bash
$ sandbox-run handler.py --event-file event.json
```

## Configuration

The CLI can be configured using a `.sandboxrc.json` file in the current directory or home directory:

```json
{
  "sandbox": {
    "allow_network": false,
    "cpu_quota": 300,
    "memory_limit": 262144,
    "max_idle_time": 60,
    "max_user_progress": 10,
    "max_task_count": 10
  },
  "cli": {
    "default_timeout": 300,
    "default_format": "pretty",
    "enable_colors": true,
    "show_profile": false
  },
  "logging": {
    "level": "WARNING"
  }
}
```

## Troubleshooting

### Handler Not Found
```
Error: Handler function not found
```
Ensure your script defines a `handler(event)` function.

### Invalid JSON
```
Error: Invalid event JSON: Expecting ',' delimiter
```
Check that your JSON string or file is valid.

### Execution Timeout
```
Error: Execution timed out after 300 seconds
```
Use `--timeout` to increase the timeout limit or optimize your handler.

## Known Limitations

1. **Network Access**: Currently requires `allow_network=True` for daemon communication
2. **Single Execution**: Each invocation creates a new sandbox instance
3. **Memory Limitations**: Complex dependencies may require increased memory limits

## Contributing

To contribute to the CLI:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.