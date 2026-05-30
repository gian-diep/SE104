"""
backend/app/services/listing_service.py

Thay đổi: images là list[str] (image_id), không phải binary.
"""

from sqlalchemy.orm import Session
from app.database.models import Listing
from app.schemas.listing_schema import ListingCreate, ListingUpdate
from sqlalchemy import or_
from app.database.models import User

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
    # Dùng property setter — tự động serialize thành JSON
    listing.images = data.images   # ← list of image_id strings

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
    q = db.query(Listing).filter(Listing.status == "approved")

    # FILTER
    if category:
        q = q.filter(Listing.category == category)

    if university:
        q = q.filter(Listing.university == university)

    # SEARCH
    if keyword:
        q = q.filter(
            or_(
                Listing.item_name.ilike(f"%{keyword}%"),
                Listing.item_description.ilike(f"%{keyword}%"),
                Listing.subject.ilike(f"%{keyword}%"),
                Listing.keywords.ilike(f"%{keyword}%"),
            )
        )

    # Mới nhất trước
    q = q.order_by(Listing.created_at.desc())

    return q.offset(skip).limit(limit).all()


def get_listing_by_id(db: Session, listing_id: int) -> Listing | None:
    return db.query(Listing).filter(Listing.id == listing_id, Listing.status != "deleted").first()


def get_listings_by_seller(db: Session, seller_id: int):
    return db.query(Listing).filter(Listing.seller_id == seller_id, Listing.status != "deleted").all()


def update_listing(db: Session, listing_id: int, data: ListingUpdate) -> Listing | None:
    listing = get_listing_by_id(db, listing_id)
    if not listing:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "images":
            listing.images = value
        elif field == "status":
            # ✅ Chỉ cho phép reset về pending nếu bài đang bị rejected
            if value == "pending" and listing.status == "rejected":
                listing.status = "pending"
        else:
            setattr(listing, field, value)
    db.commit()
    db.refresh(listing)
    return listing


def delete_listing(db: Session, listing_id: int) -> bool:
    listing = get_listing_by_id(db, listing_id)
    if not listing:
        return False
    listing.status = "deleted"
    db.commit()
    return True


def update_transaction_status(db: Session, listing_id: int, transaction_status: str) -> Listing | None:
    """Cập nhật trạng thái giao dịch: available | negotiating | sold"""
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
    listing.reject_reason = reason  # ← THÊM DÒNG NÀY
    db.commit()
    db.refresh(listing)
    return listing