# backend/app/routes/user_route.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from passlib.context import CryptContext
from typing import Optional

from app.database.database import get_db
from app.database.models import User, Rating
from app.schemas.user_schema import UserUpdate
from app.database.models import User, Rating

router = APIRouter(prefix="/users", tags=["users"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.get("")
def get_users(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(User).filter(User.status != "deleted")
    if search:
        term = f"%{search}%"
        q = q.filter(
            func.unaccent(User.username).ilike(func.unaccent(term)) |
            func.unaccent(User.university).ilike(func.unaccent(term))
        )
    users = q.all()

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
            "ban_until": user.ban_until,
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
        "ban_until": user.ban_until,
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

    from app.database.models import Rating, Listing

    ratings = (
        db.query(Rating)
        .filter(Rating.rated_id == user_id)
        .order_by(Rating.created_at.desc())
        .all()
    )

    result = []

    for r in ratings:
        rater = (
            db.query(User)
            .filter(User.id == r.rater_id)
            .first()
        )

        listing = None
        if r.listing_id:
            listing = (
                db.query(Listing)
                .filter(Listing.id == r.listing_id)
                .first()
            )

        result.append({
            "id": r.id,
            "stars": r.stars,
            "comment": r.comment,

            "rater_id": r.rater_id,
            "rater_name": rater.username if rater else "Ẩn danh",
            "rater_avatar": rater.avatar_url if rater else None,

            "listing_id": listing.id if listing else None,
            "listing_name": listing.item_name if listing else None,
            "listing_image":
                listing.images[0]
                if listing and listing.images and len(listing.images) > 0
                else None,

            "created_at": r.created_at,
        })

    return {
        "user_id": user_id,
        "username": user.username,
        "rating": user.rating,
        "rating_count": user.rating_count,
        "ratings": result,
    }