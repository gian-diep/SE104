from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ReportCreate(BaseModel):
    reporter_id: int
    reported_user_id: int
    reported_username: str
    listing_id: Optional[int] = None
    reason: str
    detail: str


class ReportResponse(BaseModel):
    id: int
    reporter_id: int
    reported_user_id: int
    reported_username: str
    listing_id: Optional[int]

    reason: str
    detail: str
    status: str

    created_at: datetime

    class Config:
        from_attributes = True