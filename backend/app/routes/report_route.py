from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.report_schema import (
    ReportCreate,
    ReportResponse
)
from app.database.models import Report, User

router = APIRouter(prefix="/reports", tags=["Reports"])


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

            # thêm rating
            "reported_user_rating": user.rating,
            "reported_user_rating_count": user.rating_count,
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
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()

    if not report:
        raise HTTPException(404, "Không tìm thấy report")

    report.status = "resolved"

    db.commit()

    return {"message": "Đã xử lý"}