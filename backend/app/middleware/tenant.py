from backend.app.core.security import decode_access_token
from backend.app.core.tenant import current_org_id
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        token = current_org_id.set(None)
        try:
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                raw_token = auth_header[7:]
                try:
                    payload = decode_access_token(raw_token)
                    org_id = payload.get("organization_id")
                    if org_id:
                        current_org_id.set(org_id)
                except Exception:
                    pass
            response = await call_next(request)
        finally:
            current_org_id.reset(token)
        return response
