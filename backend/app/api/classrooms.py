from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.dependencies import get_db, require_permission
from backend.app.core.audit import log_audit
from backend.app.models.classroom import Classroom
from backend.app.models.user import User
from backend.app.schemas.classroom import (
    ClassroomCreate,
    ClassroomResponse,
    ClassroomUpdate,
)


router = APIRouter(
    prefix="/api/v1/classrooms",
    tags=["Classrooms"],
)


@router.get(
    "",
    response_model=list[ClassroomResponse],
)
async def list_classrooms(
    current_user: User = Depends(
        require_permission("classrooms:read")
    ),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Classroom).order_by(Classroom.name)
    )

    return result.scalars().all()


@router.get(
    "/{classroom_id}",
    response_model=ClassroomResponse,
)
async def get_classroom(
    classroom_id: str,
    current_user: User = Depends(
        require_permission("classrooms:read")
    ),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Classroom).where(
            Classroom.id == classroom_id
        )
    )

    classroom = result.scalar_one_or_none()

    if classroom is None:
        raise HTTPException(
            status_code=404,
            detail="Classroom not found",
        )

    return classroom


@router.post(
    "",
    response_model=ClassroomResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_classroom(
    request: Request,
    classroom_data: ClassroomCreate,
    current_user: User = Depends(
        require_permission("classrooms:write")
    ),
    db: AsyncSession = Depends(get_db),
):
    classroom = Classroom(
        id=str(uuid4()),
        name=classroom_data.name,
        building=classroom_data.building,
        floor=classroom_data.floor,
        room_number=classroom_data.room_number,
        total_seats=classroom_data.total_seats,
    )

    db.add(classroom)
    await log_audit(
        db, current_user, "create", "classroom",
        new_value={"name": classroom.name, "building": classroom.building, "room_number": classroom.room_number},
        request=request,
    )
    await db.commit()
    await db.refresh(classroom)

    return classroom


@router.patch(
    "/{classroom_id}",
    response_model=ClassroomResponse,
)
async def update_classroom(
    classroom_id: str,
    request: Request,
    classroom_data: ClassroomUpdate,
    current_user: User = Depends(
        require_permission("classrooms:write")
    ),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Classroom).where(
            Classroom.id == classroom_id
        )
    )

    classroom = result.scalar_one_or_none()

    if classroom is None:
        raise HTTPException(
            status_code=404,
            detail="Classroom not found",
        )

    updates = classroom_data.model_dump(exclude_unset=True)
    old_data = {"name": classroom.name, "building": classroom.building, "room_number": classroom.room_number}

    for key, value in updates.items():
        setattr(classroom, key, value)

    await log_audit(
        db, current_user, "update", "classroom",
        resource_id=classroom_id,
        old_value=old_data,
        new_value=updates,
        request=request,
    )
    await db.commit()
    await db.refresh(classroom)

    return classroom


@router.get(
    "/{classroom_id}/layout",
)
async def get_classroom_layout(
    classroom_id: str,
    current_user: User = Depends(
        require_permission("classrooms:read")
    ),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Classroom).where(Classroom.id == classroom_id)
    )
    classroom = result.scalar_one_or_none()
    if classroom is None:
        raise HTTPException(status_code=404, detail="Classroom not found")

    total = classroom.total_seats or 40
    cols = 8
    rows_count = (total + cols - 1) // cols

    rows = []
    seat_id = 1
    for r in range(rows_count):
        seats = []
        for c in range(cols):
            if seat_id <= total:
                seats.append({
                    "id": f"S{seat_id:03d}",
                    "label": f"{chr(65 + r)}{c + 1}",
                    "row": r,
                    "column": c,
                    "status": "empty",
                })
                seat_id += 1
        rows.append({
            "id": f"row-{r}",
            "seats": seats,
        })

    return {
        "classroomId": classroom_id,
        "rows": rows,
    }


@router.delete(
    "/{classroom_id}",
)
async def delete_classroom(
    classroom_id: str,
    request: Request,
    current_user: User = Depends(
        require_permission("classrooms:delete")
    ),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Classroom).where(
            Classroom.id == classroom_id
        )
    )

    classroom = result.scalar_one_or_none()

    if classroom is None:
        raise HTTPException(
            status_code=404,
            detail="Classroom not found",
        )

    await log_audit(
        db, current_user, "delete", "classroom",
        resource_id=classroom_id,
        old_value={"name": classroom.name, "building": classroom.building, "room_number": classroom.room_number},
        request=request,
    )
    await db.delete(classroom)
    await db.commit()

    return {
        "message": "Classroom deleted successfully",
        "id": classroom_id,
    }
