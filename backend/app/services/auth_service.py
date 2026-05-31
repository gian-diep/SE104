from sqlalchemy.orm import Session
from datetime import datetime
from app.database.models import User
from app.schemas.auth_schema import RegisterRequest
from app.utils.security import (
    hash_password,
    verify_password
)


def register_user(
    db: Session,
    user_data: RegisterRequest
):
    existing_user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_user:
        return None

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password=hash_password(
            user_data.password
        ),
        university=user_data.university,
        role='user',
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


def login_user(
    db: Session,
    email: str,
    password: str
):
    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        return None

    # ─────────────────────────
    # CHẶN LOGIN nếu đã bị xóa
    # ─────────────────────────
    if user.status == "deleted":
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail="Tài khoản này đã bị xóa."
        )

    # ─────────────────────────
    # CHẶN LOGIN nếu bị ban
    # ─────────────────────────
    from datetime import datetime

# ─────────────────────────
# AUTO UNBAN nếu hết hạn
# ─────────────────────────
    if user.status == "banned" and user.ban_until:
        if user.ban_until < datetime.utcnow():
            user.status = "active"
            user.ban_until = None
            user.ban_reason = None
            db.commit()
            db.refresh(user)

    # ─────────────────────────
    # CHẶN LOGIN nếu bị ban
    # ─────────────────────────
    if user.status == "banned":
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail=(
                f"Tài khoản của bạn bị khóa đến {user.ban_until.strftime('%d/%m/%Y')}"
                if user.ban_until
                else "Tài khoản của bạn đã bị khóa vĩnh viễn"
            )
        )

    # ─────────────────────────
    # VERIFY PASSWORD
    # ─────────────────────────
    is_valid = verify_password(
        password,
        user.password
    )

    if not is_valid:
        return None

    return user