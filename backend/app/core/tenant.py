from contextvars import ContextVar
from typing import Optional

current_org_id: ContextVar[Optional[str]] = ContextVar("current_org_id", default=None)
