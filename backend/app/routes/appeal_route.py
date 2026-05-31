"""
backend/app/routes/appeal_route.py

GET  /appeals/check/{user_id}   → kiểm tra user đã gửi khiếu nại chưa
POST /appeals/                  → user gửi khiếu nại (kèm ảnh tuỳ chọn)
GET  /appeals/admin             → admin xem tất cả khiếu nại
POST /appeals/{id}/review       → admin duyệt / từ chối (approve → tự unban)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.database.database import get_db
from app.database.models import Appeal, User, Notification

router = APIRouter(prefix="/appeals", tags=["appeals"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class AppealCreate(BaseModel):
    user_id: int
    reason:  str
    images:  Optional[List[str]] = []   # list Cloudinary URLs (tối đa 3)


class ReviewPayload(BaseModel):
    action: str          # "approve" | "reject"
    note:   Optional[str] = ""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _appeal_out(a: Appeal, user: User) -> dict:
    return {
        "id":         a.id,
        "user_id":    a.user_id,
        "username":   user.username  if user else "?",
        "email":      user.email     if user else "?",
        "avatar_url": user.avatar_url if user else None,
        "reason":     a.reason,
        "images":     a.images,
        "status":     a.status,
        "admin_note": a.admin_note,
        "created_at": a.created_at,
        "ban_until":  user.ban_until  if user else None,
        "ban_reason": user.ban_reason if user else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/check/{user_id}")
def check_appeal(user_id: int, db: Session = Depends(get_db)):
    """Kiểm tra user đã gửi khiếu nại chưa (chỉ tính lần ban hiện tại)."""
    appeal = db.query(Appeal).filter(
        Appeal.user_id == user_id,
        Appeal.status.in_(["pending", "rejected"]),
    ).first()
    if not appeal:
        return {"submitted": False}
    user = db.query(User).filter(User.id == user_id).first()
    return {"submitted": True, "appeal": _appeal_out(appeal, user)}


@router.post("/")
def create_appeal(payload: AppealCreate, db: Session = Depends(get_db)):
    """User gửi khiếu nại — mỗi lần bị ban chỉ được gửi 1 lần."""
    if db.query(Appeal).filter(
        Appeal.user_id == payload.user_id,
        Appeal.status.in_(["pending", "rejected"]),
    ).first():
        raise HTTPException(status_code=400, detail="Bạn đã gửi khiếu nại rồi.")

    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại.")

    # Giới hạn tối đa 3 ảnh
    images = (payload.images or [])[:3]

    appeal = Appeal(user_id=payload.user_id, reason=payload.reason.strip())
    appeal.images = images

    db.add(appeal)
    db.commit()
    db.refresh(appeal)
    return _appeal_out(appeal, user)


@router.get("/admin")
def get_all_appeals(db: Session = Depends(get_db)):
    """Admin lấy danh sách tất cả khiếu nại, mới nhất trước."""
    appeals = db.query(Appeal).order_by(Appeal.created_at.desc()).all()
    result = []
    for a in appeals:
        user = db.query(User).filter(User.id == a.user_id).first()
        result.append(_appeal_out(a, user))
    return result


@router.post("/{appeal_id}/review")
def review_appeal(
    appeal_id: int,
    payload: ReviewPayload,
    db: Session = Depends(get_db),
):
    """
    Admin duyệt khiếu nại.
    - approve → unban user (status = 'active'), xóa ban_reason, xóa appeal row
                để lần ban sau user vẫn có thể gửi khiếu nại lại
    - reject  → giữ nguyên appeal row (user không gửi lại được trong lần ban này)
    """
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Không tìm thấy khiếu nại.")
    if appeal.status != "pending":
        raise HTTPException(status_code=400, detail="Khiếu nại đã được xử lý.")

    if payload.action == "approve":
        user = db.query(User).filter(User.id == appeal.user_id).first()
        if user and user.status == "banned":
            user.status = "active"
            user.ban_reason = None
            user.ban_until  = None

        # Thông báo cho người dùng
        db.add(Notification(
            user_id=appeal.user_id,
            type="appeal_approved",
            title="✅ Khiếu nại của bạn được chấp thuận",
            body=f"Tài khoản đã được mở khóa.{' ' + payload.note if payload.note else ''}",
        ))

        # Đánh dấu approved để lưu lịch sử, KHÔNG xóa
        # Khi admin unban thủ công sau này, admin_route sẽ xóa appeal cũ
        appeal.status = "approved"
        appeal.admin_note = payload.note or None
        db.commit()

        user = db.query(User).filter(User.id == appeal.user_id).first()
        return _appeal_out(appeal, user)

    elif payload.action == "reject":
        appeal.status = "rejected"
        appeal.admin_note = payload.note or None

        # Thông báo cho người dùng
        db.add(Notification(
            user_id=appeal.user_id,
            type="appeal_rejected",
            title="❌ Khiếu nại của bạn bị từ chối",
            body=f"Tài khoản vẫn bị khóa.{' Lý do: ' + payload.note if payload.note else ''}",
        ))

        db.commit()
        db.refresh(appeal)

        user = db.query(User).filter(User.id == appeal.user_id).first()
        return _appeal_out(appeal, user)

    else:
        raise HTTPException(status_code=400, detail="action phải là 'approve' hoặc 'reject'.")