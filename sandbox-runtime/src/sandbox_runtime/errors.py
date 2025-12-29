import json
from typing import Optional, Dict, Any


class SandboxError(Exception):
    """Custom error class for sandbox environment with message, detail and code."""
    
    def __init__(
        self,
        message: str,
        detail: Optional[str] = None,
        **kwargs: Any
    ):
        self.message = message
        self.detail = detail
        self.extra = kwargs
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary format."""
        error_dict = {
            "message": self.message,
            "detail": self.detail,
        }
        # Add any extra attributes
        error_dict.update(self.extra)
        # Remove None values
        return {k: v for k, v in error_dict.items() if v is not None}

    def to_json(self) -> str:
        """Convert error to JSON string."""
        return json.dumps(self.to_dict(), ensure_ascii=False)

    def __str__(self) -> str:
        """String representation of the error."""
        parts = [f"Error: {self.message}"]
        if self.detail:
            parts.append(f"Detail: {self.detail}")
        if self.extra:
            parts.append(f"Extra: {self.extra}")
        return "\n".join(parts)

    def __repr__(self) -> str:
        """Detailed string representation of the error."""
        return f"SandboxError(message='{self.message}', detail='{self.detail}', extra={self.extra})"


class SandboxHTTPError(SandboxError):
    """Custom error class for sandbox environment with message, detail and code."""
    
    def __init__(
        self,
        url: str,
        status: int,
        reason: str,
        message: str = "Request failed",
        detail: Optional[str] = None,
        **kwargs: Any
    ):
        super().__init__(message, detail, **kwargs)
        self.url = url
        self.status = status
        self.reason = reason