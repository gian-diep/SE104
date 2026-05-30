from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from app.database.database import get_db
from app.schemas.report_schema import (
    ReportCreate,
    ReportResponse
)
from app.database.models import Report, User, Notification

router = APIRouter(prefix="/reports", tags=["Reports"])


class PunishPayload(BaseModel):
    action: str          # warn | ban_7days | ban_permanent
    note: Optional[str] = ""


# ─────────────────────────────────────────
# User gửi report
# ─────────────────────────────────────────
@router.post("/", response_model=ReportResponse)
def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_db)
):
    images = (payload.images or [])[:3]

    report = Report(
        reporter_id=payload.reporter_id,
        reported_username=payload.reported_username,
        reported_user_id=payload.reported_user_id,
        listing_id=payload.listing_id,
        reason=payload.reason,
        detail=payload.detail,
    )
    report.images = images

    db.add(report)
    db.commit()
    db.refresh(report)

    return report


# ─────────────────────────────────────────
# Admin lấy reports
# ─────────────────────────────────────────
@router.get("/admin")
def get_reports(db: Session = Depends(get_db)):
    reports = (
    db.query(Report, User)
    .join(User, User.id == Report.reported_user_id)
    .order_by(
        User.rating.asc(),
        Report.created_at.desc()
    )
    .all()
    )

    result = []
    for r, user in reports:
        result.append({
            "id": r.id,

            "reporter_id": r.reporter_id,

            "reported_username": r.reported_username,
            "reported_user_id": r.reported_user_id,

            "listing_id": r.listing_id,

            "reason": r.reason,
            "detail": r.detail,

            "status": r.status,
            "admin_note": r.admin_note,
            "images": r.images,

            "created_at": r.created_at,

            # thêm rating + trạng thái ban
            "reported_user_rating": user.rating,
            "reported_user_rating_count": user.rating_count,
            "reported_user_status": user.status,
            "reported_user_ban_until": user.ban_until.isoformat() if user.ban_until else None,
        })

    return result


# ─────────────────────────────────────────
# Admin resolve (đánh dấu xử lý, không phạt)
# ─────────────────────────────────────────
@router.put("/{report_id}/resolve")
def resolve_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()

    if not report:
        raise HTTPException(404, "Không tìm thấy report")

    report.status = "resolved"

    # Gửi thông báo cho người đã báo cáo
    db.add(Notification(
        user_id=report.reporter_id,
        type="report_resolved",
        title="✅ Báo cáo của bạn đã được xử lý",
        body="Admin đã xem xét và xử lý báo cáo bạn gửi.",
        ref_id=report_id,
    ))

    db.commit()

    return {"message": "Đã xử lý"}


# ─────────────────────────────────────────
# Admin xử phạt user từ report
# ─────────────────────────────────────────
@router.post("/{report_id}/punish")
def punish_user_from_report(
    report_id: int,
    payload: PunishPayload,
    db: Session = Depends(get_db),
):
    """
    Admin xử phạt người bị report.
    - warn          → cảnh cáo, không khóa tài khoản
    - ban_7days     → khóa 7 ngày
    - ban_permanent → khóa vĩnh viễn
    Tự động resolve report và gửi notification cho cả 2 bên.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(404, "Không tìm thấy report")

    user = db.query(User).filter(User.id == report.reported_user_id).first()
    if not user:
        raise HTTPException(404, "Không tìm thấy người dùng")

    action = payload.action
    note   = (payload.note or "").strip()

    if action == "warn":
        notif_type  = "warn"
        notif_title = "⚠️ Tài khoản của bạn bị cảnh cáo"
        notif_body  = f"Tài khoản nhận cảnh cáo do vi phạm quy định.{' ' + note if note else ''}"

    elif action == "ban_7days":
        user.status     = "banned"
        user.ban_reason = note or "Vi phạm quy định"
        user.ban_until  = datetime.utcnow() + timedelta(days=7)
        notif_type  = "ban_7days"
        notif_title = "🚫 Tài khoản bị khóa 7 ngày"
        notif_body  = f"Tài khoản bị khóa 7 ngày. Lý do: {note or 'Vi phạm quy định'}. Bạn có thể gửi khiếu nại nếu cho rằng đây là nhầm lẫn."

    elif action == "ban_permanent":
        user.status     = "banned"
        user.ban_reason = note or "Vi phạm quy định nghiêm trọng"
        user.ban_until  = None
        notif_type  = "ban_permanent"
        notif_title = "🚫 Tài khoản bị khóa vĩnh viễn"
        notif_body  = f"Tài khoản bị khóa vĩnh viễn. Lý do: {note or 'Vi phạm quy định nghiêm trọng'}. Bạn có thể gửi khiếu nại nếu cho rằng đây là nhầm lẫn."

    else:
        raise HTTPException(400, "action phải là 'warn', 'ban_7days' hoặc 'ban_permanent'")

    # Thông báo người bị phạt
    db.add(Notification(
        user_id=user.id,
        type=notif_type,
        title=notif_title,
        body=notif_body,
        ref_id=report_id,
    ))

    # Thông báo người đã báo cáo
    db.add(Notification(
        user_id=report.reporter_id,
        type="report_resolved",
        title="✅ Báo cáo của bạn đã được xử lý",
        body="Admin đã xem xét báo cáo và thực hiện biện pháp xử lý.",
        ref_id=report_id,
    ))

    report.status     = "resolved"
    report.admin_note = note or None
    db.commit()

    return {"message": "Đã xử phạt thành công"}