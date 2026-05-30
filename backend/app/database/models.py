import json
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy import (
    Boolean, Column, DateTime, Float,
    ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.database import Base


# ══════════════════════════════════════════════════════
# USER
# ══════════════════════════════════════════════════════

class User(Base):
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, index=True)
    username     = Column(NVARCHAR(255), nullable=False)
    email        = Column(String(255), unique=True, nullable=False)
    password     = Column(String(255), nullable=False)
    # university   = Column(String(255), nullable=True)
    university   = Column(NVARCHAR(255), nullable=True)
    role         = Column(String(20),  nullable=False, default="user")
    ban_reason   = Column(NVARCHAR(500), nullable=True)
    avatar_url   = Column(String(500), nullable=True)
    rating       = Column(Float,   nullable=False, default=0.0)
    rating_count = Column(Integer, nullable=False, default=0)
    created_at   = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at   = Column(DateTime, server_default=func.now(),
                          onupdate=func.now(), nullable=False)

    listings = relationship(
        "Listing", back_populates="seller", cascade="all, delete-orphan"
    )
    sent_requests = relationship(
        "ChatRequest", foreign_keys="ChatRequest.buyer_id",
        back_populates="buyer"
    )
    received_requests = relationship(
        "ChatRequest", foreign_keys="ChatRequest.seller_id",
        back_populates="seller"
    )


# ══════════════════════════════════════════════════════
# LISTING
# ══════════════════════════════════════════════════════

class Listing(Base):
    __tablename__ = "listings"

    id               = Column(Integer, primary_key=True, index=True)
    seller_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                              nullable=False, index=True)
    seller_name      = Column(NVARCHAR(255), nullable=False)          # ← ForeignKey
    item_name        = Column(NVARCHAR(255), nullable=False)
    item_price       = Column(Float, default=0)
    item_description = Column(NVARCHAR(500), nullable=True)
    category         = Column(NVARCHAR(100), nullable=False)
    condition        = Column(NVARCHAR(50), nullable=False)
    subject          = Column(NVARCHAR(255), nullable=True)
    university       = Column(NVARCHAR(255), nullable=True)
    keywords         = Column(NVARCHAR(500), nullable=True)
    status               = Column(String(20), default="pending")       # pending | approved | rejected
    reject_reason = Column(NVARCHAR(500), nullable=True)
    transaction_status   = Column(String(20), default="available")    # available | negotiating | sold
    images_json          = Column(Text, default="[]")                  # ["abc.jpg", "def.png"]
    created_at       = Column(DateTime, server_default=func.now(), nullable=False)

    # ── Relationships ────────────────────────────────────────────────────────
    seller       = relationship("User", back_populates="listings")  # ← THÊM
    chat_requests = relationship(
        "ChatRequest", back_populates="listing", cascade="all, delete-orphan"
    )

    # ── images property (lưu JSON, không dùng bảng riêng) ───────────────────
    @property
    def images(self) -> list:
        try:
            return json.loads(self.images_json or "[]")
        except Exception:
            return []

    @images.setter
    def images(self, value: list):
        self.images_json = json.dumps(value or [], ensure_ascii=False)


# ══════════════════════════════════════════════════════
# CHAT REQUEST
# ══════════════════════════════════════════════════════

class ChatRequest(Base):
    __tablename__ = "chat_requests"

    id         = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer,
                        ForeignKey("listings.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    buyer_id   = Column(Integer,
                        ForeignKey("users.id", ondelete="NO ACTION"),
                        nullable=False, index=True)
    seller_id  = Column(Integer,
                        ForeignKey("users.id", ondelete="NO ACTION"),
                        nullable=False, index=True)
    status     = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    listing = relationship("Listing", back_populates="chat_requests")
    buyer   = relationship("User", foreign_keys=[buyer_id],
                           back_populates="sent_requests")
    seller  = relationship("User", foreign_keys=[seller_id],
                           back_populates="received_requests")
    session = relationship("ChatSession", back_populates="request", uselist=False)


# ══════════════════════════════════════════════════════
# CHAT SESSION
# ══════════════════════════════════════════════════════

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id         = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer,
                        ForeignKey("chat_requests.id", ondelete="CASCADE"),
                        nullable=False, unique=True)
    listing_id = Column(Integer,
                        ForeignKey("listings.id", ondelete="NO ACTION"),
                        nullable=False, index=True)
    buyer_id   = Column(Integer,
                        ForeignKey("users.id", ondelete="NO ACTION"),
                        nullable=False, index=True)
    seller_id  = Column(Integer,
                        ForeignKey("users.id", ondelete="NO ACTION"),
                        nullable=False, index=True)
    status           = Column(String(20), nullable=False, default="active")
    close_reason     = Column(String(20), nullable=True)
    seller_confirmed = Column(Boolean, nullable=False, default=False)
    buyer_confirmed  = Column(Boolean, nullable=False, default=False)
    seller_rated     = Column(Boolean, nullable=False, default=False)
    buyer_rated      = Column(Boolean, nullable=False, default=False)
    closed_at  = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    request  = relationship("ChatRequest", back_populates="session")
    messages = relationship(
        "Message", back_populates="session",
        cascade="all, delete-orphan", order_by="Message.timestamp"
    )
    ratings = relationship("Rating", back_populates="session")


# ══════════════════════════════════════════════════════
# MESSAGE
# ══════════════════════════════════════════════════════

class Message(Base):
    __tablename__ = "messages"

    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer,
                        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    sender_id  = Column(Integer,
                        ForeignKey("users.id", ondelete="NO ACTION"),
                        nullable=True)
    text      = Column(NVARCHAR(500),       nullable=False)
    type      = Column(String(20), nullable=False, default="user")
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)

    session = relationship("ChatSession", back_populates="messages")


# ══════════════════════════════════════════════════════
# RATING
# ══════════════════════════════════════════════════════

class Rating(Base):
    __tablename__ = "ratings"

    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer,
                        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    listing_id = Column(Integer,
                        ForeignKey("listings.id", ondelete="NO ACTION"),
                        nullable=False)
    rater_id   = Column(Integer,
                        ForeignKey("users.id", ondelete="NO ACTION"),
                        nullable=False)
    rated_id   = Column(Integer,
                        ForeignKey("users.id", ondelete="NO ACTION"),
                        nullable=False)
    stars      = Column(Integer, nullable=False)
    comment    = Column(NVARCHAR(500),    nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    session = relationship("ChatSession", back_populates="ratings")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)

    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reported_username = Column(NVARCHAR(100), nullable=False)
    reported_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=True)

    reason = Column(NVARCHAR(500), nullable=False)
    detail = Column(NVARCHAR(500), nullable=False)

    status = Column(String, default="pending")
    # pending | resolved | rejected

    admin_note = Column(Text, nullable=True)
    images_json = Column(Text, default="[]")   # list[str] — Cloudinary URLs, tối đa 3

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def images(self) -> list:
        try:
            return json.loads(self.images_json or "[]")
        except Exception:
            return []

    @images.setter
    def images(self, value: list):
        self.images_json = json.dumps(value or [], ensure_ascii=False)

class Appeal(Base):
    __tablename__ = "ban_appeals"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    reason     = Column(NVARCHAR(2000), nullable=False)
    images_json = Column(Text, default="[]")          # list[str] — Cloudinary URLs
    status     = Column(String(20), nullable=False, default="pending")
    # pending | approved | rejected
    admin_note = Column(NVARCHAR(1000), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User")

    @property
    def images(self) -> list:
        try:
            return json.loads(self.images_json or "[]")
        except Exception:
            return []

    @images.setter
    def images(self, value: list):
        self.images_json = json.dumps(value or [], ensure_ascii=False)
