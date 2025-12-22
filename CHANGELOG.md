#  changelog description

## 0.1.0

- [feat] add executor_code v2 version
    - Sandbox instance management and Bubblewrap isolation configuration
    - Sandbox recovery mechanism and health check
    - Standardized execution results and context management
    - Unified error definition and exception handling system
    - Internal monitoring and parameter verification tools
    - RESTful API interface (see README for details)

- [feat] add sandbox CLI tool
    - Command-line interface `sandbox-run` for executing Lambda handler functions locally
    - Support for event and context data via command-line arguments or JSON files
    - Multiple output formats: pretty (colored), JSON, YAML
    - Performance metrics display (duration, CPU time, memory usage)
    - Verbose and quiet modes for different output levels
    - Result saving to file capability
    - Configuration management via .sandboxrc.json

- [feat] add timeout control for handler execution
    - Timeout control via `__timeout` parameter in event object
    - Multi-level timeout enforcement (API, socket, daemon)
    - Default timeout: 300 seconds, configurable per request
    - Proper termination of handlers with sleep or infinite loops
    - Clear error messages with exit code 124 for timeouts
    - No namespace conflicts with user business parameters

- [fix] resolve sandbox daemon communication issues
    - Fixed PYTHONPATH configuration for sandbox daemon
    - Created __main__.py entry point for daemon module
    - Resolved socket connection issues between pool and sandbox instances
    - Added proper async/await handling in executor initialization

- [fix] improve installation and packaging
    - Updated pyproject.toml to support PEP 660 (editable installs)
    - Added setup.cfg and setup.py for backward compatibility
    - Created console script entry point for sandbox-run CLI
    - Fixed build backend requirements

- [docs] comprehensive documentation updates
    - Added CLI-README.md with usage examples
    - Created timeout-feature.md with technical details
    - Added sandbox-cli-design.md with architecture overview
    - Updated cli-implementation-notes.md with current status
    - Provided examples and best practices
