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
from datetime import datetime, timedelta

from app.database.database import get_db
from app.database.models import User, Listing, ChatSession, Message, Notification
from app.schemas.listing_schema import ListingOut
from app.services import listing_service
router = APIRouter(prefix="/admin", tags=["admin"])


# ── Helper: chuyển Listing ORM → ListingOut ───────────────────────────────────
def _to_out(listing) -> ListingOut:
    """Chuyển ORM object → ListingOut, đọc images từ property."""
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
        images=listing.images,   # ← đọc qua property, trả list[str]
        seller_rating=listing.seller.rating if listing.seller else 0,
        seller_rating_count=listing.seller.rating_count if listing.seller else 0,
        reject_reason=listing.reject_reason,
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
            "status":        u.status,        # ← thêm
            "ban_until":     u.ban_until,     # ← thêm
            "ban_reason":    u.ban_reason,    # ← thêm
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
    reason: Optional[str] = Query(None, description="Lý do ban (chỉ dùng khi action=ban)"),
    db: Session = Depends(get_db),
):
    """
    Ban hoặc unban một user.
    - ban   → status = 'banned', lưu ban_reason nếu có
    - unban → status = 'active', xóa ban_reason
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Không thể thay đổi trạng thái admin")

    if action == "ban":
        user.status = "banned"
        user.ban_reason = reason or None
        user.ban_until  = None  # ban vĩnh viễn từ tab Users
        # Gửi thông báo cho người bị ban
        db.add(Notification(
            user_id=user.id,
            type="ban_permanent",
            title="🚫 Tài khoản của bạn đã bị khóa",
            body=f"Lý do: {reason or 'Vi phạm quy định'}. Bạn có thể gửi khiếu nại nếu cho rằng đây là nhầm lẫn.",
        ))
    elif action == "unban":
        user.status = "active"
        user.ban_reason = None
        user.ban_until  = None
    else:
        raise HTTPException(status_code=400, detail="action phải là 'ban' hoặc 'unban'")

    db.commit()
    db.refresh(user)
    return {
        "message": f"Đã {'ban' if action == 'ban' else 'unban'} user {user.username}",
        "user": {
            "id":     user.id,
            "status": user.status,
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


@router.get("/listings/{listing_id}", response_model=ListingOut)
def get_listing(listing_id: int, db: Session = Depends(get_db)):
    row = listing_service.get_listing_by_id(db, listing_id)
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng.")
    return _to_out(row)


@router.delete("/listings/{listing_id}", status_code=204)
def admin_delete_listing(listing_id: int, db: Session = Depends(get_db)):
    """
    Admin xóa bài đăng.
    Nếu bài đang negotiating → tự động đóng tất cả chat session active
    và reset transaction_status về available (trước khi xóa).
    Tương đương nhấn nút Hủy trong chat của cả 2 bên.
    """
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng.")

    # Nếu đang trong giao dịch → hủy tất cả session active liên quan
    if listing.transaction_status == "negotiating":
        active_sessions = (
            db.query(ChatSession)
            .filter(
                ChatSession.listing_id == listing_id,
                ChatSession.status == "active",
            )
            .all()
        )
        for session in active_sessions:
            session.status = "closed"
            session.close_reason = "cancelled"
            session.closed_at = datetime.utcnow()

            sys_msg = Message(
                session_id=session.id,
                sender_id=None,
                text="❌ Bài đăng đã bị Admin xóa. Cuộc thương lượng đã tự động bị hủy.",
                type="system",
            )
            db.add(sys_msg)

        listing.transaction_status = "available"

    db.delete(listing)
    db.commit()