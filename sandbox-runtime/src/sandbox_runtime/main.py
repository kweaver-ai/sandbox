import argparse
from sandbox_runtime.sandbox.shared_env import run

if __name__ == "__main__":
    # 初始化沙箱池

    parser = argparse.ArgumentParser(description="Sandbox API Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind")
    parser.add_argument("--port", type=int, default=9101, help="Port to bind")
    parser.add_argument(
        "--workers", type=int, default=1, help="Number of worker processes"
    )
    parser.add_argument("--log-level", default="info", help="Logging level")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    parser.add_argument("--ssl-keyfile", help="SSL key file")
    parser.add_argument("--ssl-certfile", help="SSL certificate file")

    args = parser.parse_args()

    run(
        host=args.host,
        port=args.port,
        workers=args.workers,
        log_level=args.log_level,
        reload=args.reload,
        ssl_keyfile=args.ssl_keyfile,
        ssl_certfile=args.ssl_certfile,
    )