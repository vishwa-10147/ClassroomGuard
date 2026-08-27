import asyncio

from sqlalchemy import select

from backend.app.core.database import AsyncSessionLocal
from backend.app.core.security import hash_password
from backend.app.models.user import User


async def create_admin():
    async with AsyncSessionLocal() as db:

        result = await db.execute(
            select(User).where(
                User.email == "admin@classguard.dev"
            )
        )

        existing = result.scalar_one_or_none()

        if existing:
            print("Admin user already exists.")
            print("Email: admin@classguard.dev")
            return

        user = User(
            name="ClassroomGuard Administrator",
            email="admin@classguard.dev",
            password_hash=hash_password("Admin@12345"),
            role="super_admin",
            status="active",
            is_active=True,
        )

        db.add(user)
        await db.commit()

        print("Admin user created successfully.")
        print("Email: admin@classguard.dev")
        print("Password: Admin@12345")


if __name__ == "__main__":
    asyncio.run(create_admin())
