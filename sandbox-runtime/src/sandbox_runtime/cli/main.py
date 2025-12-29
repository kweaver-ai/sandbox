#!/usr/bin/env python3
"""
Sandbox Runtime CLI - Execute Lambda handler functions locally
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Optional

from sandbox_runtime.cli.runner import SandboxRunner
from sandbox_runtime.cli.formatter import ResultFormatter
from sandbox_runtime.utils.loggers import get_logger


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        prog="sandbox-run",
        description="Sandbox Runtime CLI - Execute Lambda handler functions locally"
    )

    # Positional argument
    parser.add_argument(
        "script_path",
        type=str,
        help="Python script file path containing handler(event) function"
    )

    # Event data arguments
    event_group = parser.add_mutually_exclusive_group()
    event_group.add_argument(
        "--event", "-e",
        type=str,
        default="{}",
        help="Event data as JSON string (default: {})"
    )
    event_group.add_argument(
        "--event-file", "-f",
        type=str,
        help="Read event data from JSON file"
    )

    # Context arguments
    context_group = parser.add_mutually_exclusive_group()
    context_group.add_argument(
        "--context", "-c",
        type=str,
        default="{}",
        help="Context data as JSON string (default: {})"
    )
    context_group.add_argument(
        "--context-file",
        type=str,
        help="Read context data from JSON file"
    )

    # Execution control
    parser.add_argument(
        "--timeout", "-t",
        type=int,
        default=300,
        help="Execution timeout in seconds (default: 300)"
    )

    # Output control
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Quiet mode, only show results"
    )
    parser.add_argument(
        "--profile", "-p",
        action="store_true",
        help="Show performance profiling information"
    )

    # Formatting options
    parser.add_argument(
        "--output", "-o",
        type=str,
        help="Save execution result to file"
    )
    parser.add_argument(
        "--format",
        choices=["pretty", "json", "yaml"],
        default="pretty",
        help="Output format (default: pretty)"
    )

    # Logging level
    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default="WARNING",
        help="Logging level (default: WARNING)"
    )

    # Version
    parser.add_argument(
        "--version",
        action="version",
        version="%(prog)s 1.0.0"
    )

    return parser.parse_args()


def read_json_file(file_path: str) -> str:
    """Read and validate JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Validate JSON syntax
            json.loads(content)
            return content
    except FileNotFoundError:
        print(f"Error: File not found: {file_path}", file=sys.stderr)
        sys.exit(2)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in file {file_path}: {e}", file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print(f"Error reading file {file_path}: {e}", file=sys.stderr)
        sys.exit(2)


async def main():
    """Main CLI function"""
    args = parse_args()

    # Set up logging
    logger = get_logger(__name__, level=args.log_level)

    # Validate script file
    script_path = Path(args.script_path)
    if not script_path.exists():
        print(f"Error: Script file not found: {args.script_path}", file=sys.stderr)
        sys.exit(2)

    if not script_path.is_file():
        print(f"Error: Path is not a file: {args.script_path}", file=sys.stderr)
        sys.exit(2)

    # Read event data
    try:
        if args.event_file:
            event_data = read_json_file(args.event_file)
        else:
            # Validate JSON string
            try:
                json.loads(args.event)
                event_data = args.event
            except json.JSONDecodeError as e:
                print(f"Error: Invalid event JSON: {e}", file=sys.stderr)
                sys.exit(2)
    except Exception as e:
        print(f"Error reading event data: {e}", file=sys.stderr)
        sys.exit(2)

    # Read context data
    try:
        if args.context_file:
            context_data = read_json_file(args.context_file)
        else:
            # Validate JSON string
            try:
                json.loads(args.context)
                context_data = args.context
            except json.JSONDecodeError as e:
                print(f"Error: Invalid context JSON: {e}", file=sys.stderr)
                sys.exit(2)
    except Exception as e:
        print(f"Error reading context data: {e}", file=sys.stderr)
        sys.exit(2)

    # Create runner
    runner = SandboxRunner()

    try:
        # Show execution info unless quiet mode
        if not args.quiet:
            print(f"Executing: {script_path}")
            if args.event_file:
                print(f"Using event file: {args.event_file}")
            if args.context_file:
                print(f"Using context file: {args.context_file}")
            print("-" * 50)

        # Execute script
        result = await runner.execute(
            script_path=str(script_path),
            event_data=event_data,
            context_data=context_data,
            timeout=args.timeout,
            verbose=args.verbose
        )

        # Format and display result
        formatter = ResultFormatter(
            format=args.format,
            show_profile=args.profile or args.verbose,
            verbose=args.verbose
        )

        output = formatter.format_result(result)

        # Print output
        print(output)

        # Save to file if requested
        if args.output:
            try:
                with open(args.output, 'w', encoding='utf-8') as f:
                    f.write(output)
                if not args.quiet:
                    print(f"\nResult saved to: {args.output}")
            except Exception as e:
                print(f"Error saving result to file: {e}", file=sys.stderr)
                sys.exit(1)

        # Set exit code based on execution result
        if hasattr(result, 'exit_code'):
            sys.exit(result.exit_code)
        else:
            # If no exit_code, assume success if no stderr
            if result.stderr:
                sys.exit(1)
            else:
                sys.exit(0)

    except TimeoutError as e:
        # 显示详细的超时错误信息
        error_msg = str(e)
        if "Execution timed out" not in error_msg:
            # 使用来自 _wait_for_ready() 的详细错误信息
            print(f"Error: {error_msg}", file=sys.stderr)
        else:
            print(f"Error: Execution timed out after {args.timeout} seconds", file=sys.stderr)
        sys.exit(4)
    except KeyboardInterrupt:
        print("\nInterrupted by user", file=sys.stderr)
        sys.exit(130)  # Standard exit code for SIGINT
    except Exception as e:
        # 显示详细错误信息
        print(f"Error: {e}", file=sys.stderr)
        if args.verbose:
            import traceback
            traceback.print_exc()
        # 根据异常类型设置不同的退出码
        if isinstance(e, RuntimeError):
            # Sandbox 启动错误，检查是否是内存相关
            if "memory" in str(e).lower() or "limit" in str(e).lower():
                sys.exit(137)  # OOM 退出码
            sys.exit(4)  # 其他 sandbox 错误
        sys.exit(1)  # 通用错误
    finally:
        # Cleanup runner resources
        await runner.cleanup()


def entry_point():
    """CLI entry point"""
    try:
        # Run async main function
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nInterrupted by user", file=sys.stderr)
        sys.exit(130)
    except Exception as e:
        print(f"Fatal error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    entry_point()