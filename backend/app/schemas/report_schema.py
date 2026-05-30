from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime


class ReportCreate(BaseModel):
    reporter_id: int
    reported_user_id: int
    reported_username: str
    listing_id: Optional[int] = None
    reason: str
    detail: str
    images: Optional[List[str]] = []   # Cloudinary URLs, tối đa 3


class ReportResponse(BaseModel):
    id: int
    reporter_id: int
    reported_user_id: int
    reported_username: str
    listing_id: Optional[int]

    reason: str
    detail: str
    status: str
    images: Optional[List[str]] = []

    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator("images", mode="before")
    @classmethod
    def parse_images(cls, v):
        """Nếu ORM trả về list (qua property) thì dùng trực tiếp, không cần parse thêm."""
        if isinstance(v, list):
            return v
        import json
        try:
            return json.loads(v or "[]")
        except Exception:
            return []
