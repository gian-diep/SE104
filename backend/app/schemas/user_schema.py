# app/schemas/user_schema.py

from pydantic import BaseModel
from typing import Optional


class UserUpdate(BaseModel):
    username: Optional[str] = None
    university: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str

    avatar_url: Optional[str] = None
    university: Optional[str] = None

    rating: float = 0
    rating_count: int = 0

    class Config:
        from_attributes = True