# ============================================================
# FILE: backend/app/routes/user_route.py
# THAY THẾ TOÀN BỘ FILE NÀY
# ============================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from typing import Optional
from pydantic import BaseModel

from app.database.database import get_db
from app.database.models import User, Rating, Listing

router = APIRouter(prefix="/users", tags=["users"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserUpdate(BaseModel):
    username: Optional[str] = None
    university: Optional[str] = None
    avatar_url: Optional[str] = None
    current_password: Optional[str] = None
    password: Optional[str] = None


@router.get("")
def get_users(db: Session = Depends(get_db)):
    # [THAY ĐỔI 2] Lọc bỏ user đã soft-delete
    users = db.query(User).filter(User.status != "deleted").all()
    return [
        {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "university": user.university,
            "avatar_url": user.avatar_url,
            "rating": user.rating,
            "rating_count": user.rating_count,
            "role": user.role,
            "status": user.status,
        }
        for user in users
    ]


@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại")

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "university": user.university,
        "avatar_url": user.avatar_url,
        "rating": user.rating,
        "rating_count": user.rating_count,
        "role": user.role,
        "status": user.status,
    }


@router.put("/{user_id}")
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại")

    if data.username is not None:
        user.username = data.username
    if data.university is not None:
        user.university = data.university
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url
    if data.password is not None:
        if not data.current_password:
            raise HTTPException(status_code=400, detail="Vui lòng nhập mật khẩu hiện tại")
        if not pwd_context.verify(data.current_password, user.password):
            raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
        user.password = pwd_context.hash(data.password)

    db.commit()
    db.refresh(user)
    return {
        "message": "Cập nhật thành công",
        "user": {
            "id": user.id,
            "username": user.username,
            "avatar_url": user.avatar_url,
        }
    }


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    [THAY ĐỔI 2] Soft delete: set status = 'deleted' thay vì xóa hẳn
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại")

    user.status = "deleted"
    db.commit()
    return {"message": "Đã xóa tài khoản"}


@router.get("/{user_id}/ratings")
def get_user_ratings(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại")

    ratings = (
        db.query(Rating)
        .filter(Rating.rated_id == user_id)
        .order_by(Rating.created_at.desc())
        .all()
    )

    result = []
    for r in ratings:
        rater = db.query(User).filter(User.id == r.rater_id).first()

        listing = None
        if r.listing_id:
            listing = db.query(Listing).filter(Listing.id == r.listing_id).first()

        result.append({
            "id": r.id,
            "stars": r.stars,
            "comment": r.comment,

            "rater_id": r.rater_id,
            "rater_name": rater.username if rater else "Ẩn danh",
            "rater_avatar": rater.avatar_url if rater else None,

            "listing_id": listing.id if listing else None,
            "listing_name": listing.item_name if listing else None,
            "listing_image": (
                listing.images[0]
                if listing and listing.images and len(listing.images) > 0
                else None
            ),

            "rated_role": r.rated_role,

            "created_at": r.created_at,
        })

    return {
        "user_id": user_id,
        "username": user.username,
        "rating": user.rating,
        "rating_count": user.rating_count,
        "ratings": result,
    }