"""
backend/app/routes/admin_route.py
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from app.database.database import get_db
from app.database.models import User, Listing, ChatRequest, ChatSession, Message, Notification, Appeal
from app import sse_bus
import asyncio
import json
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


def _notify_user_transactions(db: Session, banned_user_id: int):
    """
    Khi user bị ban:
      - ChatRequest pending → cancelled (người kia không cần chờ nữa)
      - ChatSession active → KHÔNG đóng, gửi system message + notification
        để người kia tự quyết định hủy hay chờ unban.
    """
    # 1. Hủy ChatRequest còn pending
    pending_requests = (
        db.query(ChatRequest)
        .filter(
            ChatRequest.status == "pending",
            (ChatRequest.buyer_id == banned_user_id) | (ChatRequest.seller_id == banned_user_id),
        )
        .all()
    )
    for req in pending_requests:
        req.status = "cancelled"

    # 2. ChatSession đang active → giữ nguyên, chỉ thông báo cho người kia
    active_sessions = (
        db.query(ChatSession)
        .filter(
            ChatSession.status == "active",
            (ChatSession.buyer_id == banned_user_id) | (ChatSession.seller_id == banned_user_id),
        )
        .all()
    )
    for session in active_sessions:
        # Xác định người kia (không phải người bị ban)
        other_user_id = (
            session.seller_id if session.buyer_id == banned_user_id else session.buyer_id
        )

        # Gửi system message vào chat để người kia thấy ngay
        db.add(Message(
            session_id=session.id,
            sender_id=None,
            text="⚠️ Người dùng kia vừa bị khóa tài khoản tạm thời. Bạn có thể chờ họ được mở khóa hoặc hủy cuộc trò chuyện này nếu không còn nhu cầu.",
            type="system",
        ))

        # Gửi notification cho người kia
        listing = db.query(Listing).filter(Listing.id == session.listing_id).first()
        listing_name = listing.item_name if listing else "sản phẩm"
        db.add(Notification(
            user_id=other_user_id,
            type="ban_partner",
            title="⚠️ Người trao đổi với bạn bị khóa tài khoản",
            body=f"Cuộc trò chuyện về '{listing_name}' vẫn còn mở. Bạn có thể chờ hoặc vào chat để hủy.",
        ))


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
    # Không filter gì khi không truyền status — trả tất cả kể cả deleted
    if keyword:
        q = q.filter(Listing.item_name.contains(keyword))
    q = q.order_by(Listing.created_at.desc())
    return [_to_out(r) for r in q.offset(skip).limit(limit).all()]


@router.get("/users")
def get_all_users(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
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
            "status":        u.status,
            "ban_until":     u.ban_until,
            "ban_reason":    u.ban_reason,
            "avatar_url":    u.avatar_url,
            "rating":        u.rating,
            "rating_count":  u.rating_count,
            "created_at":    u.created_at,
            "listing_count": len(u.listings),
        })
    return result


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    action: str = Query(..., description="ban | unban"),
    reason: Optional[str] = Query(None, description="Lý do ban (chỉ dùng khi action=ban)"),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Không thể thay đổi trạng thái admin")

    if action == "ban":
        user.status = "banned"
        user.ban_reason = reason or None
        user.ban_until  = None

        # Thông báo cho người đang trao đổi với user bị ban
        _notify_user_transactions(db, user_id)

        db.add(Notification(
            user_id=user.id,
            type="ban_permanent",
            title="🚫 Tài khoản của bạn đã bị khóa",
            body=f"Lý do: {reason or 'Vi phạm quy định'}. Bạn có thể gửi khiếu nại nếu cho rằng đây là nhầm lẫn.",
        ))

        # Push SSE event để kick user ngay lập tức nếu đang online
        await sse_bus.publish(
            user_id,
            event="banned",
            data=json.dumps({"reason": reason or "Vi phạm quy định"}, ensure_ascii=False),
        )

    elif action == "unban":
        user.status = "active"
        user.ban_reason = None
        user.ban_until  = None

        # Xóa appeal cũ (nếu có) để lần ban sau user vẫn gửi được khiếu nại
        old_appeal = db.query(Appeal).filter(Appeal.user_id == user_id).first()
        if old_appeal:
            db.delete(old_appeal)

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
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Không thể xóa admin")
    user.status = "deleted"
    db.query(Listing).filter(Listing.seller_id == user_id).update({"status": "deleted"})
    db.commit()


@router.get("/listings/{listing_id}", response_model=ListingOut)
def get_listing(listing_id: int, db: Session = Depends(get_db)):
    row = listing_service.get_listing_by_id(db, listing_id)
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng.")
    return _to_out(row)


@router.delete("/listings/{listing_id}", status_code=200)
def admin_delete_listing(listing_id: int, db: Session = Depends(get_db)):
    """
    Soft delete bài đăng (status = 'deleted').
    Không cho phép xóa bài đang thương lượng.
    """
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng.")

    if listing.transaction_status == "negotiating":
        raise HTTPException(
            status_code=400,
            detail="Không thể xóa bài đăng đang trong quá trình thương lượng."
        )

    listing.status = "deleted"
    db.commit()
    return {"message": "Đã xóa bài đăng."}