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
from app.database.models import (
    Report,
    User,
    Listing,
    Notification,
)

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)


def _create_notification(db, user_id: int, notif_type: str, title: str, body: str, ref_id: int = None):
    n = Notification(user_id=user_id, type=notif_type, title=title, body=body, ref_id=ref_id)
    db.add(n)


# ─────────────────────────────────────────
# User gửi report
# ─────────────────────────────────────────
@router.post("/", response_model=ReportResponse)
def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_db)
):
    report = Report(
        reporter_id=payload.reporter_id,
        reported_username=payload.reported_username,
        reported_user_id=payload.reported_user_id,
        listing_id=payload.listing_id,
        reason=payload.reason,
        detail=payload.detail,
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return report


# ─────────────────────────────────────────
# Admin lấy reports
# ─────────────────────────────────────────
@router.get("/admin")
def get_reports(
    db: Session = Depends(get_db)
):
    reports = (
        db.query(Report, User)
        .join(
            User,
            User.id == Report.reported_user_id
        )
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
            "created_at": r.created_at,

            "reported_user_rating": user.rating,
            "reported_user_rating_count": user.rating_count,

            # dùng STATUS thay vì ROLE
            "reported_user_status": user.status,
            "reported_user_ban_until": user.ban_until,
        })

    return result


# ─────────────────────────────────────────
# Admin resolve
# ─────────────────────────────────────────
@router.put("/{report_id}/resolve")
def resolve_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    report = (
        db.query(Report)
        .filter(Report.id == report_id)
        .first()
    )

    if not report:
        raise HTTPException(
            404,
            "Không tìm thấy report"
        )

    report.status = "resolved"

    # Thông báo cho người báo cáo
    _create_notification(
        db, report.reporter_id,
        notif_type="report_resolved",
        title="Báo cáo của bạn đã được xử lý",
        body=f"Báo cáo về '{report.reported_username}' đã được Admin xem xét và xử lý.",
        ref_id=report.id,
    )

    db.commit()

    return {
        "message": "Đã xử lý"
    }


# ─────────────────────────────────────────
# Payload xử phạt
# ─────────────────────────────────────────
class PunishPayload(BaseModel):
    action: str
    note: Optional[str] = None


# ─────────────────────────────────────────
# Admin xử phạt từ report
# warn | ban_7days | ban_permanent
# ─────────────────────────────────────────
@router.post("/{report_id}/punish")
def punish_user(
    report_id: int,
    payload: PunishPayload,
    db: Session = Depends(get_db)
):
    report = (
        db.query(Report)
        .filter(Report.id == report_id)
        .first()
    )

    if not report:
        raise HTTPException(
            404,
            "Không tìm thấy report"
        )

    user = (
        db.query(User)
        .filter(User.id == report.reported_user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            404,
            "Không tìm thấy người dùng"
        )

    # Không cho xử phạt admin
    if user.role == "admin":
        raise HTTPException(
            403,
            "Không thể xử phạt admin"
        )

    # ─────────────────────────
    # WARN
    # ─────────────────────────
    if payload.action == "warn":
        message = (
            f"Đã gửi cảnh cáo đến "
            f"{user.username}"
        )

    # ─────────────────────────
    # BAN 7 NGÀY
    # ─────────────────────────
    elif payload.action == "ban_7days":
        user.status = "banned"

        user.ban_until = (
            datetime.utcnow()
            + timedelta(days=7)
        )

        message = (
            f"Đã ban "
            f"{user.username} 7 ngày"
        )

    # ─────────────────────────
    # BAN VĨNH VIỄN
    # ─────────────────────────
    elif payload.action == "ban_permanent":
        user.status = "banned"

        # None = vĩnh viễn
        user.ban_until = None

        message = (
            f"Đã ban vĩnh viễn "
            f"{user.username}"
        )

    else:
        raise HTTPException(
            400,
            "action phải là "
            "'warn', "
            "'ban_7days' "
            "hoặc "
            "'ban_permanent'"
        )

    # ─────────────────────────
    # Lấy tên bài đăng nếu có
    # ─────────────────────────
    listing_name = None
    if report.listing_id:
        listing = db.query(Listing).filter(Listing.id == report.listing_id).first()
        if listing:
            listing_name = listing.item_name

    # ─────────────────────────
    # Ghi note + resolve
    # ─────────────────────────
    if payload.note:
        report.admin_note = payload.note

    report.status = "resolved"

    # Thông báo cho người báo cáo
    _create_notification(
        db, report.reporter_id,
        notif_type="report_resolved",
        title="Báo cáo của bạn đã được xử lý",
        body=f"Báo cáo về '{user.username}' đã được Admin xem xét và có hành động xử phạt.",
        ref_id=report.id,
    )

    # Thông báo cho người bị xử phạt
    if payload.action == "warn":
        listing_ctx = f" liên quan đến bài đăng '{listing_name}'" if listing_name else ""
        warn_body = (payload.note or f"Admin đã gửi cảnh cáo do vi phạm quy định{listing_ctx}. Vui lòng tuân thủ nội quy cộng đồng.")
        _create_notification(
            db, user.id,
            notif_type="warn",
            title="⚠️ Bạn đã bị cảnh cáo",
            body=warn_body,
            ref_id=report.id,
        )
    elif payload.action == "ban_7days":
        _create_notification(
            db, user.id,
            notif_type="ban_7days",
            title="🚫 Tài khoản bị tạm khóa 7 ngày",
            body=payload.note or "Tài khoản của bạn bị tạm khóa 7 ngày do vi phạm quy định cộng đồng.",
            ref_id=report.id,
        )
    elif payload.action == "ban_permanent":
        _create_notification(
            db, user.id,
            notif_type="ban_permanent",
            title="🚫 Tài khoản bị khóa vĩnh viễn",
            body=payload.note or "Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm nghiêm trọng quy định cộng đồng.",
            ref_id=report.id,
        )

    db.commit()
    db.refresh(user)

    return {
        "message": message,
        "user": {
            "id": user.id,
            "username": user.username,

            # role giữ nguyên
            "role": user.role,

            # status mới
            "status": user.status,
            "ban_until": user.ban_until,
        }
    }