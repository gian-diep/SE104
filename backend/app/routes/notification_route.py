from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import Notification, Report, Listing

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/{user_id}")
def get_notifications(user_id: int, db: Session = Depends(get_db)):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    result = []
    for n in notifs:
        listing_id = None
        listing_name = None
        # Nếu có ref_id (report_id), lấy listing liên quan
        if n.ref_id:
            report = db.query(Report).filter(Report.id == n.ref_id).first()
            if report and report.listing_id:
                listing_id = report.listing_id
                listing = db.query(Listing).filter(Listing.id == report.listing_id).first()
                if listing:
                    listing_name = listing.item_name

        result.append({
            "id":           n.id,
            "type":         n.type,
            "title":        n.title,
            "body":         n.body,
            "is_read":      n.is_read,
            "ref_id":       n.ref_id,
            "listing_id":   listing_id,
            "listing_name": listing_name,
            "created_at":   n.created_at,
        })
    return result


@router.put("/{user_id}/read-all")
def mark_all_read(user_id: int, db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "ok"}


@router.put("/item/{notif_id}/read")
def mark_one_read(notif_id: int, db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notif_id).first()
    if not n:
        raise HTTPException(404, "Không tìm thấy thông báo")
    n.is_read = True
    db.commit()
    return {"message": "ok"}