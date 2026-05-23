"""
backend/app/schemas/listing_schema.py

Thay đổi: field `images` nhận list string (image_id),
KHÔNG nhận base64 hay binary.
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class ListingCreate(BaseModel):
    item_name: str
    item_price: float = 0
    item_description: Optional[str] = None
    category: str
    condition: str
    subject: Optional[str] = None
    university: Optional[str] = None
    keywords: Optional[str] = None

    # ← Mỗi phần tử là image_id (ví dụ: "abc123.jpg")
    # hoặc URL tuyệt đối nếu user nhập URL ngoài
    images: List[str] = Field(default_factory=list, max_items=5)


class ListingUpdate(BaseModel):
    item_name: Optional[str] = None
    item_price: Optional[float] = None
    item_description: Optional[str] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    subject: Optional[str] = None
    university: Optional[str] = None
    keywords: Optional[str] = None
    images: Optional[List[str]] = None
    transaction_status: Optional[str] = None
    status: Optional[str] = None  # ✅ thêm dòng này

class ListingOut(BaseModel):
    id: int
    seller_id: int
    seller_name: str
    item_name: str
    item_price: float
    item_description: Optional[str]
    category: str
    condition: str
    subject: Optional[str]
    university: Optional[str]
    keywords: Optional[str]
    status: str                      # pending | approved | rejected
    transaction_status: str = "available"  # available | negotiating | sold
    seller_rating: float = 0
    seller_rating_count: int = 0
    seller_avatar_url: Optional[str] = None
    reject_reason: Optional[str] = None 


    # ← Trả về list image_id, frontend tự build URL
    images: List[str] = []

    class Config:
        from_attributes = True