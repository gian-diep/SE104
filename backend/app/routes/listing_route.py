"""
backend/app/routes/listing_route.py

Trả về images là list[str] (image_id).
Frontend build URL: http://localhost:8000/images/{image_id}
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.database import get_db
from app.schemas.listing_schema import ListingCreate, ListingUpdate, ListingOut
from app.services import listing_service

router = APIRouter(prefix="/listings", tags=["listings"])


def _to_out(listing) -> ListingOut:
    """Chuyển ORM object → ListingOut, đọc images từ property."""
    return ListingOut(
        id=listing.id,
        seller_id=listing.seller_id,
        seller_name=listing.seller.username if listing.seller else listing.seller_name,
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
        images=listing.images,   # ← đọc qua property, trả list[str]
        seller_rating=listing.seller.rating if listing.seller else 0,
        seller_rating_count=listing.seller.rating_count if listing.seller else 0,
        seller_avatar_url=listing.seller.avatar_url if listing.seller else None,
        reject_reason=listing.reject_reason,
    )


# ── Public ────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[ListingOut])
def get_listings(
    category:   Optional[str] = Query(None),
    university: Optional[str] = Query(None),
    keyword:    Optional[str] = Query(None),
    skip:       int = Query(0, ge=0),
    limit:      int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    rows = listing_service.get_listings(db, category, university, keyword, skip, limit)
    return [_to_out(r) for r in rows]


@router.get("/seller/{seller_id}", response_model=List[ListingOut])
def get_by_seller(seller_id: int, db: Session = Depends(get_db)):
    rows = listing_service.get_listings_by_seller(db, seller_id)
    return [_to_out(r) for r in rows]


@router.get("/{listing_id}", response_model=ListingOut)
def get_listing(listing_id: int, db: Session = Depends(get_db)):
    row = listing_service.get_listing_by_id(db, listing_id)
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng.")
    return _to_out(row)


# ── Seller ────────────────────────────────────────────────────────────────────

@router.post("", response_model=ListingOut, status_code=201)
def create_listing(
    seller_id: int = Query(...),
    data: ListingCreate = ...,
    db: Session = Depends(get_db),
):
    row = listing_service.create_listing(db, seller_id, data)
    return _to_out(row)


@router.put("/{listing_id}", response_model=ListingOut)
def update_listing(listing_id: int, data: ListingUpdate, db: Session = Depends(get_db)):
    row = listing_service.update_listing(db, listing_id, data)
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng.")
    return _to_out(row)


@router.delete("/{listing_id}", status_code=204)
def delete_listing(listing_id: int, db: Session = Depends(get_db)):
    ok = listing_service.delete_listing(db, listing_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng.")


@router.patch("/{listing_id}/transaction-status", response_model=ListingOut)
def update_transaction_status(
    listing_id: int,
    transaction_status: str = Query(..., pattern="^(available|negotiating|sold)$"),
    db: Session = Depends(get_db),
):
    """Cập nhật trạng thái giao dịch: available | negotiating | sold"""
    row = listing_service.update_transaction_status(db, listing_id, transaction_status)
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng.")
    if row == "negotiating_locked":
        raise HTTPException(status_code=400, detail="Không thể đổi trạng thái khi đang thương lượng.")
    return _to_out(row)


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.post("/{listing_id}/approve", response_model=ListingOut)
def approve(listing_id: int, db: Session = Depends(get_db)):
    row = listing_service.approve_listing(db, listing_id)
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng.")
    return _to_out(row)


@router.post("/{listing_id}/reject", response_model=ListingOut)
def reject(listing_id: int, reason: str = Query(""), db: Session = Depends(get_db)):
    row = listing_service.reject_listing(db, listing_id, reason)
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng.")
    return _to_out(row)