from contextvars import ContextVar

current_org_id: ContextVar[str | None] = ContextVar("current_org_id", default=None)
