#!/usr/bin/env python3
"""Development server startup script."""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "sandbox_control_plane.src.interfaces.rest.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
