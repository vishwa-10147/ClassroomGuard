from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.dependencies import get_db, require_permission
from backend.app.models.user import User
from backend.app.models.classroom import Classroom
from backend.app.models.alert import Alert

router = APIRouter(prefix="/api/v1/search", tags=["Search"])

@router.get("")
async def global_search(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("search:read")),
):
    # Search users (students/teachers)
    user_query = select(User).where(or_(User.name.ilike(f"%{q}%"), User.email.ilike(f"%{q}%"))).limit(10)
    users_result = await db.execute(user_query)
    users = [{"id": u.id, "name": u.name, "type": "user"} for u in users_result.scalars().all()]

    # Search classrooms
    class_query = select(Classroom).where(Classroom.name.ilike(f"%{q}%")).limit(10)
    class_result = await db.execute(class_query)
    classrooms = [{"id": c.id, "name": c.name, "type": "classroom"} for c in class_result.scalars().all()]

    # Search alerts
    alert_query = select(Alert).where(Alert.title.ilike(f"%{q}%")).limit(10)
    alert_result = await db.execute(alert_query)
    alerts = [{"id": a.id, "name": a.title, "type": "alert"} for a in alert_result.scalars().all()]

    return {"results": users + classrooms + alerts}
