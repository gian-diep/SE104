from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User, Report

from app.schemas.auth_schema import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse
)

from app.services.auth_service import (
    register_user,
    login_user
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.get("/ban-info")
def get_ban_info(email: str, db: Session = Depends(get_db)):
    """Trả về user_id, ban_reason và report_reason cho user bị ban — dùng khi login thất bại."""
    user = db.query(User).filter(User.email == email).first()
    if not user or user.status != "banned":
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản bị ban")

    # Lấy report mới nhất liên quan đến user này (nếu có)
    latest_report = (
        db.query(Report)
        .filter(Report.reported_user_id == user.id)
        .order_by(Report.created_at.desc())
        .first()
    )

    return {
        "user_id": user.id,
        "ban_reason": user.ban_reason or None,
        "report_reason": latest_report.reason if latest_report else None,
        "report_detail": latest_report.detail if latest_report else None,
    }


@router.post(
    "/register",
    response_model=RegisterResponse
)
def register(
    user: RegisterRequest,
    db: Session = Depends(get_db)
):
    created_user = register_user(
        db,
        user
    )

    if created_user is None:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    return created_user

@router.post(
    "/login",
    response_model=LoginResponse
)
def login(
    user: LoginRequest,
    db: Session = Depends(get_db)
):
    logged_user = login_user(
        db,
        user.email,
        user.password
    )

    if logged_user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    return logged_user