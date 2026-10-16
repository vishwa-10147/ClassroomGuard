import asyncio
from uuid import uuid4

from backend.app.core.database import AsyncSessionLocal, init_db
from backend.app.core.security import hash_password
from backend.app.models.user import User
from backend.app.models.organization import Organization
from sqlalchemy import select

USERS = [
    {
        "name": "System Administrator",
        "email": "admin@classguard.dev",
        "password": "Admin@12345",
        "role": "super_admin",
    },
    {
        "name": "Dr. Sarah Chen",
        "email": "admin.admin@classguard.dev",
        "password": "Admin@12345",
        "role": "admin",
    },
    {
        "name": "Prof. James Wilson",
        "email": "faculty@classguard.dev",
        "password": "Faculty@12345",
        "role": "faculty",
    },
    {
        "name": "Mark Rodriguez",
        "email": "security@classguard.dev",
        "password": "Security@12345",
        "role": "security",
    },
    {
        "name": "Emily Thompson",
        "email": "viewer@classguard.dev",
        "password": "Viewer@12345",
        "role": "viewer",
    },
]


async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        organization = (await db.execute(
            select(Organization).where(Organization.slug == "classroomguard-dev")
        )).scalar_one_or_none()
        if organization is None:
            organization = Organization(
                id="org-dev-001",
                name="ClassroomGuard Development",
                slug="classroomguard-dev",
                plan="enterprise",
            )
            db.add(organization)
            await db.flush()

        created = 0
        for u in USERS:
            result = await db.execute(
                select(User).where(User.email == u["email"])
            )
            existing = result.scalar_one_or_none()
            if existing:
                if existing.organization_id is None:
                    existing.organization_id = organization.id
                print(f"  [skip] {u['email']} already exists")
                continue

            user = User(
                id=str(uuid4()),
                name=u["name"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
                status="active",
                is_active=True,
                organization_id=organization.id,
            )
            db.add(user)
            created += 1
            print(f"  [created] {u['role']:12s} | {u['email']} | {u['password']}")

        await db.commit()
        print(f"\nDone. {created} user(s) created.")


if __name__ == "__main__":
    asyncio.run(seed())
