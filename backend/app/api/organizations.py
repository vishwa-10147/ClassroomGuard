from uuid import uuid4

from backend.app.api.dependencies import get_db, require_permission
from backend.app.core.audit import log_audit
from backend.app.models.alert import Alert
from backend.app.models.camera import Camera
from backend.app.models.classroom import Classroom
from backend.app.models.incident import Incident
from backend.app.models.organization import Organization
from backend.app.models.user import User
from backend.app.schemas.organization import (
    OrganizationCreate,
    OrganizationInvite,
    OrganizationResponse,
    OrganizationStats,
    OrganizationUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/api/v1/organizations",
    tags=["Organizations"],
)


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_organization(
    request: Request,
    body: OrganizationCreate,
    current_user: User = Depends(require_permission("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Organization).where(Organization.slug == body.slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Organization slug already exists")

    org = Organization(
        id=str(uuid4()),
        name=body.name,
        slug=body.slug,
        plan=body.plan,
    )
    db.add(org)
    await log_audit(
        db, current_user, "create", "organization",
        new_value={"name": org.name, "slug": org.slug, "plan": org.plan},
        request=request,
    )
    await db.commit()
    await db.refresh(org)
    return org


@router.get(
    "/{org_id}",
    response_model=OrganizationResponse,
)
async def get_organization(
    org_id: str,
    current_user: User = Depends(require_permission("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.patch(
    "/{org_id}",
    response_model=OrganizationResponse,
)
async def update_organization(
    org_id: str,
    request: Request,
    body: OrganizationUpdate,
    current_user: User = Depends(require_permission("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    updates = body.model_dump(exclude_unset=True)

    if "slug" in updates:
        existing = await db.execute(
            select(Organization).where(
                Organization.slug == updates["slug"],
                Organization.id != org_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Slug already in use")

    old_data = {"name": org.name, "slug": org.slug, "plan": org.plan}
    for key, value in updates.items():
        setattr(org, key, value)

    await log_audit(
        db, current_user, "update", "organization",
        resource_id=org_id,
        old_value=old_data,
        new_value=updates,
        request=request,
    )
    await db.commit()
    await db.refresh(org)
    return org


@router.get(
    "/{org_id}/stats",
    response_model=OrganizationStats,
)
async def get_organization_stats(
    org_id: str,
    current_user: User = Depends(require_permission("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    camera_count = await db.scalar(
        select(func.count()).select_from(Camera).where(Camera.organization_id == org_id)
    ) or 0
    user_count = await db.scalar(
        select(func.count()).select_from(User).where(User.organization_id == org_id)
    ) or 0
    alert_count = await db.scalar(
        select(func.count()).select_from(Alert).where(Alert.organization_id == org_id)
    ) or 0
    classroom_count = await db.scalar(
        select(func.count()).select_from(Classroom).where(Classroom.organization_id == org_id)
    ) or 0
    incident_count = await db.scalar(
        select(func.count()).select_from(Incident).where(Incident.organization_id == org_id)
    ) or 0

    return OrganizationStats(
        organization_id=org_id,
        camera_count=camera_count,
        user_count=user_count,
        alert_count=alert_count,
        classroom_count=classroom_count,
        incident_count=incident_count,
        max_cameras=org.max_cameras,
        max_users=org.max_users,
        plan=org.plan,
    )


@router.post(
    "/{org_id}/invite",
    status_code=status.HTTP_202_ACCEPTED,
)
async def invite_user(
    org_id: str,
    request: Request,
    body: OrganizationInvite,
    current_user: User = Depends(require_permission("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    from backend.app.models.user import User as UserModel
    existing = await db.execute(
        select(UserModel).where(UserModel.email == body.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User with this email already exists")

    await log_audit(
        db, current_user, "invite", "organization",
        resource_id=org_id,
        new_value={"email": body.email, "role": body.role},
        request=request,
    )
    await db.commit()

    return {
        "message": f"Invitation sent to {body.email}",
        "organization": org.name,
        "role": body.role,
    }
