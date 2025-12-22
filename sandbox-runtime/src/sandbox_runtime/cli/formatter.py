"""
Result formatting utilities for CLI output
"""

import json
from datetime import datetime
from typing import Any, Optional

# Try to import yaml, make it optional
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


class ResultFormatter:
    """
    Format execution results for different output types
    """

    def __init__(
        self,
        format: str = "pretty",
        show_profile: bool = False,
        verbose: bool = False,
        use_colors: bool = True
    ):
        self.format = format
        self.show_profile = show_profile
        self.verbose = verbose
        self.use_colors = use_colors and self._supports_color()

        # Color codes for pretty output
        if self.use_colors:
            self.colors = {
                'reset': '\033[0m',
                'red': '\033[91m',
                'green': '\033[92m',
                'yellow': '\033[93m',
                'blue': '\033[94m',
                'magenta': '\033[95m',
                'cyan': '\033[96m',
                'white': '\033[97m',
                'dim': '\033[2m',
                'bold': '\033[1m'
            }
        else:
            self.colors = {k: '' for k in ['reset', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'dim', 'bold']}

    def _supports_color(self) -> bool:
        """Check if terminal supports colors"""
        import sys
        return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()

    def _colorize(self, text: str, color: str) -> str:
        """Apply color to text"""
        return f"{self.colors[color]}{text}{self.colors['reset']}"

    def format_result(self, result) -> str:
        """
        Format the execution result

        Args:
            result: Execution result object

        Returns:
            Formatted string
        """
        if self.format == "json":
            return self._format_json(result)
        elif self.format == "yaml":
            return self._format_yaml(result)
        else:
            return self._format_pretty(result)

    def _format_pretty(self, result) -> str:
        """Format result in pretty human-readable format"""
        output = []

        # Execution status
        exit_code = getattr(result, 'exit_code', 0)
        if exit_code == 0:
            status_icon = "✅"
            status_text = "Execution succeeded"
            status_color = "green"
        else:
            status_icon = "❌"
            status_text = f"Execution failed (exit code: {exit_code})"
            status_color = "red"

        output.append(f"{self._colorize(status_icon, status_color)} {self._colorize(status_text, status_color)}")
        output.append("")

        # Standard output
        stdout = getattr(result, 'stdout', '')
        if stdout:
            output.append(self._colorize("📤 STDOUT:", "blue"))
            output.append(self._colorize("-" * 40, "dim"))
            # Preserve original line breaks and spacing
            stdout_content = stdout.rstrip()
            if stdout_content:
                output.append(stdout_content)
            else:
                output.append("(empty)")
            output.append("")

        # Standard error
        stderr = getattr(result, 'stderr', '')
        if stderr:
            output.append(self._colorize("📥 STDERR:", "yellow"))
            output.append(self._colorize("-" * 40, "dim"))
            stderr_content = stderr.rstrip()
            if stderr_content:
                output.append(stderr_content)
            else:
                output.append("(empty)")
            output.append("")

        # Function return value
        output.append(self._colorize("📄 RESULT:", "magenta"))
        output.append(self._colorize("-" * 40, "dim"))
        result_value = getattr(result, 'result', None)
        if result_value is not None:
            if isinstance(result_value, (dict, list, tuple)):
                # Format complex data types as JSON
                result_str = json.dumps(result_value, indent=2, ensure_ascii=False, default=str)
                # Highlight JSON keys
                result_str = result_str.replace('"', self._colorize('"', "cyan"))
                output.append(result_str)
            else:
                output.append(str(result_value))
        else:
            output.append("None")
        output.append("")

        # Performance metrics
        if self.show_profile or self.verbose:
            output.append(self._colorize("⚡ METRICS:", "cyan"))
            output.append(self._colorize("-" * 40, "dim"))

            metrics = getattr(result, 'metrics', None)
            if metrics:
                duration_ms = getattr(metrics, 'duration_ms', 0)
                cpu_time_ms = getattr(metrics, 'cpu_time_ms', 0)
                memory_peak_mb = getattr(metrics, 'memory_peak_mb', 0)

                output.append(f"  Duration:     {self._colorize(f'{duration_ms:.2f}', 'yellow')} ms")
                output.append(f"  CPU Time:     {self._colorize(f'{cpu_time_ms:.2f}', 'yellow')} ms")
                output.append(f"  Memory Peak:  {self._colorize(f'{memory_peak_mb:.2f}', 'yellow')} MB")

                # Additional metrics in verbose mode
                if self.verbose and hasattr(metrics, '__dict__'):
                    for key, value in metrics.__dict__.items():
                        if key not in ['duration_ms', 'cpu_time_ms', 'memory_peak_mb']:
                            output.append(f"  {key.replace('_', ' ').title()}:  {value}")
            else:
                output.append("  No metrics available")
            output.append("")

        # Additional details in verbose mode
        if self.verbose:
            output.append(self._colorize("🔍 DETAILS:", "blue"))
            output.append(self._colorize("-" * 40, "dim"))
            output.append(f"  Timestamp:    {datetime.now().isoformat()}")
            output.append(f"  Exit Code:    {exit_code}")

            # Show result type in verbose mode
            if result_value is not None:
                result_type = type(result_value).__name__
                if isinstance(result_value, (list, tuple)):
                    result_type += f" (len={len(result_value)})"
                elif isinstance(result_value, dict):
                    result_type += f" (keys={len(result_value)})"
                output.append(f"  Result Type:  {result_type}")

            output.append("")

        return "\n".join(output)

    def _format_json(self, result) -> str:
        """Format result as JSON"""
        # Extract all relevant attributes
        data = {
            "exit_code": getattr(result, 'exit_code', 0),
            "stdout": getattr(result, 'stdout', ''),
            "stderr": getattr(result, 'stderr', ''),
            "result": getattr(result, 'result', None),
        }

        # Add metrics if available
        metrics = getattr(result, 'metrics', None)
        if metrics:
            data["metrics"] = {
                "duration_ms": getattr(metrics, 'duration_ms', 0),
                "cpu_time_ms": getattr(metrics, 'cpu_time_ms', 0),
                "memory_peak_mb": getattr(metrics, 'memory_peak_mb', 0),
            }

            # Add all additional metrics in verbose mode
            if self.verbose and hasattr(metrics, '__dict__'):
                for key, value in metrics.__dict__.items():
                    if key not in data["metrics"]:
                        data["metrics"][key] = value

        # Add timestamp in verbose mode
        if self.verbose:
            data["timestamp"] = datetime.now().isoformat()

        return json.dumps(
            data,
            indent=2,
            ensure_ascii=False,
            default=str
        )

    def _format_yaml(self, result) -> str:
        """Format result as YAML"""
        if not HAS_YAML:
            # Fallback to JSON if yaml is not available
            print("Warning: PyYAML not installed, falling back to JSON format", file=sys.stderr)
            return self._format_json(result)

        # Extract data similar to JSON format
        data = {
            "exit_code": getattr(result, 'exit_code', 0),
            "stdout": getattr(result, 'stdout', ''),
            "stderr": getattr(result, 'stderr', ''),
            "result": getattr(result, 'result', None),
        }

        metrics = getattr(result, 'metrics', None)
        if metrics:
            data["metrics"] = {
                "duration_ms": getattr(metrics, 'duration_ms', 0),
                "cpu_time_ms": getattr(metrics, 'cpu_time_ms', 0),
                "memory_peak_mb": getattr(metrics, 'memory_peak_mb', 0),
            }

            if self.verbose and hasattr(metrics, '__dict__'):
                for key, value in metrics.__dict__.items():
                    if key not in data["metrics"]:
                        data["metrics"][key] = value

        if self.verbose:
            data["timestamp"] = datetime.now().isoformat()

        return yaml.dump(
            data,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False
        )