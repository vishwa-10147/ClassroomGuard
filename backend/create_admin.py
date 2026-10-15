"""Create the first super admin account.

Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD, or are prompted for (password hidden).
The password must be at least 12 characters and is never printed.

Usage (repo root, or inside the backend container):
    python -m backend.create_admin
    ADMIN_EMAIL=it@college.edu ADMIN_PASSWORD='...' python -m backend.create_admin
"""

import asyncio
import getpass
import os
import sys

from backend.app.core.database import AsyncSessionLocal
from backend.app.core.security import hash_password
from backend.app.models.user import User
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select

MIN_PASSWORD_LENGTH = 12


def _credentials() -> tuple[str, str]:
    email = os.environ.get("ADMIN_EMAIL") or input("Admin email: ").strip()
    password = os.environ.get("ADMIN_PASSWORD") or getpass.getpass("Admin password: ")
    try:
        # Same validation as the login form, so the account can actually sign in
        email = TypeAdapter(EmailStr).validate_python(email)
    except ValidationError:
        sys.exit(f"{email!r} is not an email address that can be used to sign in")
    if len(password) < MIN_PASSWORD_LENGTH:
        sys.exit(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    return email, password


async def create_admin() -> None:
    email, password = _credentials()
    async with AsyncSessionLocal() as db:
        existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if existing:
            print(f"A user with email {email} already exists - nothing changed.")
            return

        db.add(User(
            name="ClassroomGuard Administrator",
            email=email,
            password_hash=hash_password(password),
            role="super_admin",
            status="active",
            is_active=True,
        ))
        await db.commit()
        print(f"Super admin {email} created.")


if __name__ == "__main__":
    asyncio.run(create_admin())
