# ============================================================
# FILE: backend/app/services/listing_service.py
# THAY THẾ TOÀN BỘ FILE NÀY
# ============================================================

from sqlalchemy.orm import Session
from app.database.models import Listing
from app.schemas.listing_schema import ListingCreate, ListingUpdate
from app.database.models import User
from sqlalchemy import or_, func


def create_listing(db: Session, seller_id: int, data: ListingCreate) -> Listing:
    seller = db.query(User).filter(User.id == seller_id).first()
    listing = Listing(
        seller_id=seller_id,
        seller_name=seller.username,
        item_name=data.item_name,
        item_price=data.item_price,
        item_description=data.item_description,
        category=data.category,
        condition=data.condition,
        subject=data.subject,
        university=data.university,
        keywords=data.keywords,
        status="pending",
        transaction_status="available",
    )
    listing.images = data.images
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


def get_listings(
    db: Session,
    category: str = None,
    university: str = None,
    keyword: str = None,
    skip: int = 0,
    limit: int = 20,
):
    # [THAY ĐỔI 2] Lọc bỏ bài đã soft-delete
    q = db.query(Listing).filter(
        Listing.status == "approved"
    )

    if category:
        q = q.filter(Listing.category == category)
    if university:
        q = q.filter(Listing.university == university)

    if keyword:
        q = q.filter(
            or_(
                func.similarity(Listing.item_name, keyword) > 0.3,
                func.similarity(Listing.subject, keyword) > 0.3,
                func.similarity(Listing.keywords, keyword) > 0.3,
                Listing.item_name.ilike(f"%{keyword}%"),
                Listing.item_description.ilike(f"%{keyword}%"),
                Listing.subject.ilike(f"%{keyword}%"),
                Listing.keywords.ilike(f"%{keyword}%"),
            )
        ).order_by(
            func.similarity(Listing.item_name, keyword).desc()
        )
    q = q.order_by(Listing.created_at.desc())
    return q.offset(skip).limit(limit).all()


def get_listing_by_id(db: Session, listing_id: int) -> Listing | None:
    return db.query(Listing).filter(Listing.id == listing_id).first()


def get_listings_by_seller(db: Session, seller_id: int):
    # [THAY ĐỔI 2] Ẩn bài đã deleted với người dùng thường
    return (
        db.query(Listing)
        .filter(Listing.seller_id == seller_id, Listing.status != "deleted")
        .all()
    )


def update_listing(db: Session, listing_id: int, data: ListingUpdate) -> Listing | None:
    listing = get_listing_by_id(db, listing_id)
    if not listing:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "images":
            listing.images = value
        elif field == "status":
            if value == "pending" and listing.status == "rejected":
                listing.status = "pending"
        else:
            setattr(listing, field, value)
    db.commit()
    db.refresh(listing)
    return listing


def delete_listing(db: Session, listing_id: int) -> bool:
    """
    [THAY ĐỔI 2] Soft delete: đổi status → 'deleted' thay vì xóa hẳn
    """
    listing = get_listing_by_id(db, listing_id)
    if not listing:
        return False
    listing.status = "deleted"
    db.commit()
    return True


def update_transaction_status(db: Session, listing_id: int, transaction_status: str) -> Listing | None:
    listing = get_listing_by_id(db, listing_id)
    if not listing:
        return None
    listing.transaction_status = transaction_status
    db.commit()
    db.refresh(listing)
    return listing


def approve_listing(db: Session, listing_id: int) -> Listing | None:
    listing = get_listing_by_id(db, listing_id)
    if not listing:
        return None
    listing.status = "approved"
    db.commit()
    db.refresh(listing)
    return listing


def reject_listing(db: Session, listing_id: int, reason: str) -> Listing | None:
    listing = get_listing_by_id(db, listing_id)
    if not listing:
        return None
    listing.status = "rejected"
    listing.reject_reason = reason
    db.commit()
    db.refresh(listing)
    return listing