from fastapi import HTTPException

from backend.app.core.tenant import current_org_id


def get_current_org_id() -> str:
    org_id = current_org_id.get()
    if not org_id:
        raise HTTPException(
            status_code=400,
            detail="User not associated with an organization",
        )
    return org_id
