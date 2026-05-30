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
from app.database.models import Appeal, User

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
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/check/{user_id}")
def check_appeal(user_id: int, db: Session = Depends(get_db)):
    """Kiểm tra user đã gửi khiếu nại chưa."""
    appeal = db.query(Appeal).filter(Appeal.user_id == user_id).first()
    if not appeal:
        return {"submitted": False}
    user = db.query(User).filter(User.id == user_id).first()
    return {"submitted": True, "appeal": _appeal_out(appeal, user)}


@router.post("/")
def create_appeal(payload: AppealCreate, db: Session = Depends(get_db)):
    """User gửi khiếu nại — mỗi user chỉ được 1 lần."""
    if db.query(Appeal).filter(Appeal.user_id == payload.user_id).first():
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
    - approve → unban user (status = 'active'), xóa ban_reason
    - reject  → giữ nguyên
    """
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Không tìm thấy khiếu nại.")
    if appeal.status != "pending":
        raise HTTPException(status_code=400, detail="Khiếu nại đã được xử lý.")

    if payload.action == "approve":
        appeal.status = "approved"
        # Tự động unban
        user = db.query(User).filter(User.id == appeal.user_id).first()
        if user and user.status == "banned":
            user.status = "active"
            user.ban_reason = None
    elif payload.action == "reject":
        appeal.status = "rejected"
    else:
        raise HTTPException(status_code=400, detail="action phải là 'approve' hoặc 'reject'.")

    appeal.admin_note = payload.note or None
    db.commit()
    db.refresh(appeal)

    user = db.query(User).filter(User.id == appeal.user_id).first()
    return _appeal_out(appeal, user)