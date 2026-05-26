from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database.database import get_db
from app.database.models import BanAppeal, User, Notification

router = APIRouter(prefix="/appeals", tags=["Appeals"])


def _create_notification(db, user_id: int, notif_type: str, title: str, body: str):
    n = Notification(user_id=user_id, type=notif_type, title=title, body=body)
    db.add(n)


def _get_active_appeal(db: Session, user_id: int):
    """
    Trả về appeal hiện tại của lần ban này (nếu có).

    Logic:
    - Tìm appeal mới nhất của user có status = 'pending' hoặc 'rejected'
    - Nếu tồn tại → user đã dùng quyền khiếu nại cho lần ban này rồi
    - Nếu không → có thể tạo mới (lần ban mới chưa khiếu nại)

    Tại sao đúng:
    - Khi appeal được approve → user.status = 'active' → user không còn bị ban
    - Lần ban tiếp theo: user.status = 'banned' lại, nhưng không có appeal nào
      pending/rejected cho lần ban mới này → được phép tạo mới
    - Nếu appeal bị reject → status = 'rejected' → bị chặn, không khiếu nại thêm
    """
    return (
        db.query(BanAppeal)
        .filter(
            BanAppeal.user_id == user_id,
            BanAppeal.status.in_(["pending", "rejected"])
        )
        .order_by(BanAppeal.created_at.desc())
        .first()
    )


# ─────────────────────────────────────────
# Schema
# ─────────────────────────────────────────

class AppealCreate(BaseModel):
    user_id: int
    reason: str


class AppealReview(BaseModel):
    action: str          # "approve" | "reject"
    note: Optional[str] = None


# ─────────────────────────────────────────
# Kiểm tra trạng thái khiếu nại lần ban này
# GET /appeals/check/{user_id}
# ─────────────────────────────────────────

@router.get("/check/{user_id}")
def check_appeal(user_id: int, db: Session = Depends(get_db)):
    """
    Frontend gọi sau khi biết user bị ban để biết:
    - Chưa khiếu nại lần ban này   → submitted: false  → hiện form
    - Đang chờ xét / bị từ chối    → submitted: true   → hiện trạng thái
    """
    appeal = _get_active_appeal(db, user_id)
    if not appeal:
        return {"submitted": False, "appeal": None}
    return {
        "submitted": True,
        "appeal": {
            "id":         appeal.id,
            "status":     appeal.status,
            "reason":     appeal.reason,
            "admin_note": appeal.admin_note,
            "created_at": appeal.created_at,
        }
    }


# ─────────────────────────────────────────
# User gửi khiếu nại
# POST /appeals/
# ─────────────────────────────────────────

@router.post("/")
def create_appeal(payload: AppealCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")

    if user.status != "banned":
        raise HTTPException(status_code=400, detail="Tài khoản không bị ban")

    if not payload.reason or len(payload.reason.strip()) < 10:
        raise HTTPException(status_code=400, detail="Nội dung khiếu nại quá ngắn (tối thiểu 10 ký tự)")

    # Kiểm tra lần ban này đã dùng quyền khiếu nại chưa
    existing = _get_active_appeal(db, payload.user_id)
    if existing:
        if existing.status == "pending":
            raise HTTPException(status_code=400, detail="Bạn đã gửi khiếu nại và đang chờ Admin xét duyệt")
        if existing.status == "rejected":
            raise HTTPException(status_code=400, detail="Khiếu nại của bạn đã bị từ chối. Bạn không thể khiếu nại thêm cho lần ban này")

    appeal = BanAppeal(
        user_id=payload.user_id,
        reason=payload.reason.strip(),
    )
    db.add(appeal)
    db.commit()
    db.refresh(appeal)

    return {
        "message": "Gửi khiếu nại thành công",
        "appeal": {
            "id":         appeal.id,
            "status":     appeal.status,
            "created_at": appeal.created_at,
        }
    }


# ─────────────────────────────────────────
# Admin lấy danh sách khiếu nại
# GET /appeals/admin
# ─────────────────────────────────────────

@router.get("/admin")
def get_appeals(db: Session = Depends(get_db)):
    appeals = (
        db.query(BanAppeal)
        .join(User, User.id == BanAppeal.user_id)
        .order_by(BanAppeal.created_at.desc())
        .all()
    )

    result = []
    for a in appeals:
        u = a.user
        result.append({
            "id":         a.id,
            "user_id":    a.user_id,
            "username":   u.username if u else "—",
            "email":      u.email if u else "—",
            "avatar_url": u.avatar_url if u else None,
            "ban_until":  u.ban_until if u else None,
            "reason":     a.reason,
            "status":     a.status,
            "admin_note": a.admin_note,
            "created_at": a.created_at,
        })

    return result


# ─────────────────────────────────────────
# Admin xử lý khiếu nại
# POST /appeals/{appeal_id}/review
# ─────────────────────────────────────────

@router.post("/{appeal_id}/review")
def review_appeal(appeal_id: int, payload: AppealReview, db: Session = Depends(get_db)):
    appeal = db.query(BanAppeal).filter(BanAppeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Không tìm thấy khiếu nại")

    if appeal.status != "pending":
        raise HTTPException(status_code=400, detail="Khiếu nại này đã được xử lý")

    if payload.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action phải là 'approve' hoặc 'reject'")

    user = db.query(User).filter(User.id == appeal.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")

    if payload.note:
        appeal.admin_note = payload.note.strip()

    if payload.action == "approve":
        appeal.status = "approved"
        # Gỡ ban → lần ban tiếp theo (nếu có) user sẽ được khiếu nại lại
        user.status = "active"
        user.ban_until = None

        _create_notification(
            db, user.id,
            notif_type="appeal_approved",
            title="✅ Khiếu nại được chấp thuận",
            body=payload.note or "Admin đã xem xét và chấp thuận khiếu nại của bạn. Tài khoản đã được khôi phục.",
        )
        message = f"Đã chấp thuận khiếu nại và gỡ ban cho {user.username}"

    else:  # reject
        appeal.status = "rejected"
        # User vẫn bị ban, không thể khiếu nại thêm cho lần ban này

        _create_notification(
            db, user.id,
            notif_type="appeal_rejected",
            title="❌ Khiếu nại bị từ chối",
            body=payload.note or "Admin đã xem xét và từ chối khiếu nại của bạn. Lệnh ban vẫn còn hiệu lực.",
        )
        message = f"Đã từ chối khiếu nại của {user.username}"

    db.commit()

    return {
        "message": message,
        "appeal": {
            "id":     appeal.id,
            "status": appeal.status,
        }
    }