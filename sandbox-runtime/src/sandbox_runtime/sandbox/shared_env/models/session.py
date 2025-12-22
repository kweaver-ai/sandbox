from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class SessionStatus(BaseModel):
    """会话状态"""

    id: str
    exists: bool
    created_at: Optional[float] = None
    mount_point: Optional[str] = None
    is_mounted: bool = False
    files: List[Dict[str, Any]] = []