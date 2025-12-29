# Sandbox CLI Implementation Notes

## Implementation Status

The Sandbox Runtime CLI has been successfully implemented with the following components:

### 1. Created Files
- `/sandbox-runtime/src/sandbox_runtime/cli/` - CLI module
  - `__init__.py` - Module initialization
  - `main.py` - Main CLI entry point with argument parsing
  - `runner.py` - Sandbox execution wrapper
  - `formatter.py` - Result formatting utilities (supports pretty, json, yaml)
  - `config.py` - CLI configuration management
- `/sandbox-runtime/scripts/sandbox-run` - Executable wrapper script
- `/sandbox-runtime/src/sandbox_runtime/sandbox/sandbox/__main__.py` - Daemon entry point

### 2. Modified Files
- `/sandbox-runtime/pyproject.toml` - Added console_scripts entry point for `sandbox-run`

### 3. Key Features Implemented
1. **Command-line Interface**: Full argument parsing with support for:
   - Script path (required)
   - Event data (string or file)
   - Context data (string or file)
   - Timeout control
   - Verbose/quiet modes
   - Multiple output formats (pretty, json, yaml)
   - Result file output

2. **Sandbox Integration**:
   - Wraps the existing `LambdaSandboxExecutor`
   - Creates a small sandbox pool (single instance for CLI)
   - Proper async initialization and cleanup

3. **Result Formatting**:
   - Pretty output with colors (when supported)
   - JSON and YAML output formats
   - Display of stdout, stderr, return value, and performance metrics
   - Optional profiling information

## Current Issues

### Issue 1: Network Isolation and Daemon Communication (RESOLVED)
The sandbox uses network namespace isolation (`--unshare-net`) for security, but this prevents the main process from connecting to the daemon running inside the sandbox.

**Solution**: The CLI currently requires `allow_network=True` for the daemon communication to work. The sandbox still has file system and process isolation.

**Future Improvements**:
- Use Unix domain sockets instead of TCP for IPC
- Implement port forwarding from sandbox to host
- Use firewall rules instead of network namespace for restriction

### Issue 2: Runtime Warnings
There are runtime warnings about coroutines not being awaited in the cleanup process.

## Testing Status

The CLI structure and argument parsing work correctly. The main components are functional:
- ✅ Argument parsing
- ✅ File reading and validation
- ✅ Result formatting
- ✅ Error handling
- ✅ Configuration management

The sandbox execution has issues:
- ❌ Sandbox pool initialization
- ❌ Connection between pool and sandbox instances

## Workarounds

For immediate use, the CLI can be modified to:
1. Use a single sandbox instance directly (without pool)
2. Implement a synchronous execution mode
3. Add better error handling and retry logic for sandbox startup

## Next Steps

1. **Fix Sandbox Pool**: Debug and fix the connection issue between AsyncSandboxPool and sandbox instances
2. **Add Unit Tests**: Create comprehensive tests for CLI components
3. **Documentation**: Add user documentation and examples
4. **Error Recovery**: Implement better error handling and recovery mechanisms
5. **Performance**: Optimize for CLI use case (faster startup, lower overhead)

## Usage Examples

Once the sandbox issue is resolved, the CLI can be used as follows:

```bash
# Basic execution
sandbox-run script.py

# With event data
sandbox-run script.py --event '{"name": "Alice"}'

# With event file
sandbox-run script.py --event-file event.json

# With context and verbose output
sandbox-run script.py --context '{"request_id": "123"}' --verbose

# JSON output
sandbox-run script.py --format json

# Save result to file
sandbox-run script.py --output result.json
```