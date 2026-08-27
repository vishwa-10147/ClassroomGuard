from backend.app.api.dependencies import get_current_user, require_roles
from backend.app.models.user import User
from fastapi import APIRouter, Depends

router = APIRouter(
    prefix="/api/v1/rbac-test",
    tags=["RBAC Test"],
)


@router.get("/authenticated")
async def authenticated(
    current_user: User = Depends(get_current_user),
):
    return {
        "message": "Authentication successful",
        "user": current_user.email,
        "role": current_user.role,
    }


@router.get("/admin")
async def admin_only(
    current_user: User = Depends(
        require_roles("super_admin", "admin")
    ),
):
    return {
        "message": "Admin access granted",
        "user": current_user.email,
        "role": current_user.role,
    }


@router.get("/faculty")
async def faculty_access(
    current_user: User = Depends(
        require_roles(
            "super_admin",
            "admin",
            "faculty",
        )
    ),
):
    return {
        "message": "Faculty-level access granted",
        "user": current_user.email,
        "role": current_user.role,
    }


@router.get("/security")
async def security_access(
    current_user: User = Depends(
        require_roles(
            "super_admin",
            "admin",
            "security",
        )
    ),
):
    return {
        "message": "Security-level access granted",
        "user": current_user.email,
        "role": current_user.role,
    }
