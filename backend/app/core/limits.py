from fastapi import HTTPException

CAMERA_LIMITS = {"free": 5, "pro": 25, "enterprise": -1}
USER_LIMITS = {"free": 10, "pro": 50, "enterprise": -1}


def check_camera_limit(plan: str, current_count: int) -> None:
    limit = CAMERA_LIMITS.get(plan, 5)
    if limit != -1 and current_count >= limit:
        raise HTTPException(
            status_code=403,
            detail=f"Camera limit reached ({limit}) for {plan} plan",
        )


def check_user_limit(plan: str, current_count: int) -> None:
    limit = USER_LIMITS.get(plan, 10)
    if limit != -1 and current_count >= limit:
        raise HTTPException(
            status_code=403,
            detail=f"User limit reached ({limit}) for {plan} plan",
        )
