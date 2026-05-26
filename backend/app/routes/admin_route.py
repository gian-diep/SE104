# ============================================================
# FILE: backend/app/routes/admin_route.py
# THAY THẾ TOÀN BỘ FILE NÀY
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from app.database.database import get_db
from app.database.models import User, Listing
from app.schemas.listing_schema import ListingOut
from app.services import listing_service

router = APIRouter(prefix="/admin", tags=["admin"])


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
        transaction_status=listing.transaction_status or "available",
        images=listing.images,
        seller_rating=listing.seller.rating if listing.seller else 0,
        seller_rating_count=listing.seller.rating_count if listing.seller else 0,
        reject_reason=listing.reject_reason,
    )


# ══════════════════════════════════════════════════════════════════════════════
# LISTINGS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/listings", response_model=list[ListingOut])
def get_all_listings(
    status:   Optional[str] = Query(None),
    keyword:  Optional[str] = Query(None),
    skip:     int = Query(0, ge=0),
    limit:    int = Query(50, le=200),
    db: Session = Depends(get_db),
):
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
    # [THAY ĐỔI 2] Lọc bỏ user đã soft-delete (status = "deleted")
    q = db.query(User).filter(User.role != "admin", User.status != "deleted")
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
            # [THAY ĐỔI 1] Trả thêm ban_until để frontend hiển thị loại ban
            "ban_until":     u.ban_until,
        })
    return result


@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    action: str = Query(..., description="ban | unban | ban_7days | ban_permanent | warn"),
    db: Session = Depends(get_db),
):
    """
    [THAY ĐỔI 1] Mở rộng action:
    - ban / ban_permanent → role = 'banned', ban_until = NULL (vĩnh viễn)
    - ban_7days           → role = 'banned', ban_until = now + 7 ngày
    - unban               → role = 'user',   ban_until = NULL
    - warn                → không thay đổi role (chỉ dùng qua /reports/{id}/punish)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Không thể thay đổi trạng thái admin")

    if action in ("ban", "ban_permanent"):
        user.role = "banned"
        user.ban_until = None  # vĩnh viễn
    elif action == "ban_7days":
        user.role = "banned"
        user.ban_until = datetime.utcnow() + timedelta(days=7)
    elif action == "unban":
        user.role = "user"
        user.ban_until = None
    else:
        raise HTTPException(status_code=400, detail="action không hợp lệ")

    db.commit()
    db.refresh(user)
    return {
        "message": f"Đã cập nhật trạng thái user {user.username}",
        "user": {
            "id":        user.id,
            "role":      user.role,
            "ban_until": user.ban_until,
        }
    }


@router.delete("/users/{user_id}", status_code=200)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    [THAY ĐỔI 2] Soft delete: không xóa khỏi DB, chỉ set status = 'deleted'
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Không thể xóa admin")

    user.status = "deleted"
    db.commit()
    return {"message": f"Đã xóa user {user.username}"}


@router.get("/listings/{listing_id}", response_model=ListingOut)
def get_listing(listing_id: int, db: Session = Depends(get_db)):
    row = listing_service.get_listing_by_id(db, listing_id)
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng.")
    return _to_out(row)