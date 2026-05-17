"""
backend/app/routes/admin_route.py

Các endpoint dành riêng cho admin:
- GET  /admin/listings          → lấy TẤT CẢ bài đăng (kể cả pending, rejected)
- GET  /admin/users             → lấy danh sách user (trừ admin)
- PUT  /admin/users/{id}/status → ban / unban user
- DELETE /admin/users/{id}      → xóa user
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database.database import get_db
from app.database.models import User, Listing
from app.schemas.listing_schema import ListingOut

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Helper: chuyển Listing ORM → ListingOut ───────────────────────────────────
def _to_out(listing) -> ListingOut:
    return ListingOut(
        id=listing.id,
        seller_id=listing.seller_id,
        seller_name=listing.seller_name,
        item_name=listing.item_name,
        item_price=listing.item_price,
        item_description=listing.item_description,
        category=listing.category,
        condition=listing.condition,
        subject=listing.subject,
        university=listing.university,
        keywords=listing.keywords,
        status=listing.status,
        images=listing.images,
    )


# ══════════════════════════════════════════════════════════════════════════════
# LISTINGS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/listings", response_model=list[ListingOut])
def get_all_listings(
    status:   Optional[str] = Query(None),   # pending | approved | rejected | None = tất cả
    keyword:  Optional[str] = Query(None),
    skip:     int = Query(0, ge=0),
    limit:    int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    """
    Lấy tất cả bài đăng — dành cho admin kiểm duyệt.
    Không filter status mặc định (khác GET /listings chỉ trả approved).
    """
    q = db.query(Listing)
    if status:
        q = q.filter(Listing.status == status)
    if keyword:
        q = q.filter(Listing.item_name.contains(keyword))
    q = q.order_by(Listing.created_at.desc())
    return [_to_out(r) for r in q.offset(skip).limit(limit).all()]


# ══════════════════════════════════════════════════════════════════════════════
# USERS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/users")
def get_all_users(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách tất cả user (trừ admin).
    Trả thêm listing_count để hiển thị số bài đã đăng.
    """
    q = db.query(User).filter(User.role != "admin")
    if search:
        q = q.filter(
            User.username.contains(search) | User.email.contains(search)
        )
    users = q.order_by(User.created_at.desc()).all()

    result = []
    for u in users:
        result.append({
            "id":            u.id,
            "username":      u.username,
            "email":         u.email,
            "university":    u.university,
            "role":          u.role,
            "avatar_url":    u.avatar_url,
            "rating":        u.rating,
            "rating_count":  u.rating_count,
            "created_at":    u.created_at,
            "listing_count": len(u.listings),
        })
    return result


@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    action: str = Query(..., description="ban | unban"),
    db: Session = Depends(get_db),
):
    """
    Ban hoặc unban một user.
    - ban   → role = 'banned'
    - unban → role = 'user'
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Không thể thay đổi trạng thái admin")

    if action == "ban":
        user.role = "banned"
    elif action == "unban":
        user.role = "user"
    else:
        raise HTTPException(status_code=400, detail="action phải là 'ban' hoặc 'unban'")

    db.commit()
    db.refresh(user)
    return {
        "message": f"Đã {'ban' if action == 'ban' else 'unban'} user {user.username}",
        "user": {
            "id":   user.id,
            "role": user.role,
        }
    }


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Xóa user (cascade xóa listings, chat requests liên quan)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Không thể xóa admin")
    db.delete(user)
    db.commit()