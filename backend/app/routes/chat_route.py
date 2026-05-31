"""
backend/app/routes/chat_route.py

Xử lý toàn bộ luồng giao dịch:
  ChatRequest  → buyer gửi yêu cầu → seller thấy & accept/reject
  ChatSession  → phòng chat 2 người sau khi accept
  Message      → tin nhắn trong session
  Rating       → đánh giá sau khi hoàn thành
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database.database import get_db
from app.database.models import (
    ChatRequest, ChatSession, Message, Rating, Listing, User
)

router = APIRouter(prefix="/chat", tags=["chat"])


# ══════════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class ChatRequestOut(BaseModel):
    id: int
    listing_id: int
    listing_name: str
    buyer_id: int
    buyer_name: str
    seller_id: int
    seller_name: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class SessionOut(BaseModel):
    id: int
    request_id: int
    listing_id: int
    listing_name: str
    buyer_id: int
    buyer_name: str
    seller_id: int
    seller_name: str
    status: str
    close_reason: Optional[str]
    seller_confirmed: bool
    buyer_confirmed: bool
    seller_rated: bool
    buyer_rated: bool
    created_at: datetime
    closed_at: Optional[datetime]

    class Config:
        from_attributes = True


class MessageOut(BaseModel):
    id: int
    session_id: int
    sender_id: Optional[int]
    text: str
    type: str
    timestamp: datetime

    class Config:
        from_attributes = True


class SendMessageBody(BaseModel):
    sender_id: Optional[int] = None
    text: str
    type: str = "user"   # "user" | "system"


class RatingBody(BaseModel):
    rater_id: int
    stars: int
    comment: Optional[str] = None


# ══════════════════════════════════════════════════════════════════════════════
# HELPER
# ══════════════════════════════════════════════════════════════════════════════

def _req_out(req: ChatRequest) -> ChatRequestOut:
    return ChatRequestOut(
        id=req.id,
        listing_id=req.listing_id,
        listing_name=req.listing.item_name if req.listing else "",
        buyer_id=req.buyer_id,
        buyer_name=req.buyer.username if req.buyer else "",
        seller_id=req.seller_id,
        seller_name=req.seller.username if req.seller else "",
        status=req.status,
        created_at=req.created_at,
    )


def _sess_out(s: ChatSession) -> SessionOut:
    return SessionOut(
        id=s.id,
        request_id=s.request_id,
        listing_id=s.listing_id,
        listing_name=s.request.listing.item_name if s.request and s.request.listing else "",
        buyer_id=s.buyer_id,
        buyer_name=s.request.buyer.username if s.request and s.request.buyer else "",
        seller_id=s.seller_id,
        seller_name=s.request.seller.username if s.request and s.request.seller else "",
        status=s.status,
        close_reason=s.close_reason,
        seller_confirmed=s.seller_confirmed,
        buyer_confirmed=s.buyer_confirmed,
        seller_rated=s.seller_rated,
        buyer_rated=s.buyer_rated,
        created_at=s.created_at,
        closed_at=s.closed_at,
    )


# ══════════════════════════════════════════════════════════════════════════════
# CHAT REQUESTS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/requests", response_model=ChatRequestOut, status_code=201)
def send_request(
    listing_id: int,
    buyer_id: int,
    db: Session = Depends(get_db),
):
    """Buyer gửi yêu cầu giao dịch tới seller."""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Bài đăng không tồn tại")

    # KHÓA GỬI REQUEST
    if listing.transaction_status == "negotiating":
        raise HTTPException(
            status_code=400,
            detail="Sản phẩm đang được thương lượng"
        )

    if listing.transaction_status == "sold":
        raise HTTPException(
            status_code=400,
            detail="Sản phẩm đã được bán"
        )

    if listing.seller_id == buyer_id:
        raise HTTPException(status_code=400, detail="Không thể gửi yêu cầu cho chính mình")

    # Kiểm tra đã có request pending/approved chưa
    existing = db.query(ChatRequest).filter(
        ChatRequest.listing_id == listing_id,
        ChatRequest.buyer_id == buyer_id,
        ChatRequest.status.in_(["pending", "approved"]),
    ).first()
    if existing:
        # Nếu request approved nhưng session đã completed → cho phép gửi lại
        if existing.status == "approved":
            session = db.query(ChatSession).filter(
                ChatSession.request_id == existing.id,
                ChatSession.close_reason == "completed",
            ).first()
            if not session:
                raise HTTPException(status_code=400, detail="Bạn đã gửi yêu cầu cho bài đăng này rồi")
        else:
            raise HTTPException(status_code=400, detail="Bạn đã gửi yêu cầu cho bài đăng này rồi")

    req = ChatRequest(
        listing_id=listing_id,
        buyer_id=buyer_id,
        seller_id=listing.seller_id,
        status="pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _req_out(req)


@router.get("/requests/seller/{seller_id}", response_model=list[ChatRequestOut])
def get_seller_requests(seller_id: int, db: Session = Depends(get_db)):
    """Lấy tất cả request gửi đến seller (kể cả pending/approved/rejected)."""
    rows = (
        db.query(ChatRequest)
        .filter(ChatRequest.seller_id == seller_id)
        .order_by(ChatRequest.created_at.desc())
        .all()
    )
    return [_req_out(r) for r in rows]


@router.get("/requests/buyer/{buyer_id}", response_model=list[ChatRequestOut])
def get_buyer_requests(buyer_id: int, db: Session = Depends(get_db)):
    """Lấy tất cả request buyer đã gửi."""
    rows = (
        db.query(ChatRequest)
        .filter(ChatRequest.buyer_id == buyer_id)
        .order_by(ChatRequest.created_at.desc())
        .all()
    )
    return [_req_out(r) for r in rows]


@router.post("/requests/{request_id}/accept", response_model=SessionOut)
def accept_request(request_id: int, db: Session = Depends(get_db)):
    """Seller chấp nhận → tạo ChatSession + tin nhắn hệ thống."""
    req = db.query(ChatRequest).filter(ChatRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Yêu cầu không tồn tại")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Yêu cầu đã được xử lý")

    # Kiểm tra seller đã có session active cho listing này chưa
    active = db.query(ChatSession).filter(
        ChatSession.seller_id == req.seller_id,
        ChatSession.listing_id == req.listing_id,
        ChatSession.status == "active",
    ).first()
    if active:
        raise HTTPException(
            status_code=400,
            detail="Bạn đang có cuộc trò chuyện đang diễn ra cho sản phẩm này",
        )

    req.status = "approved"
    listing = db.query(Listing).filter(Listing.id == req.listing_id).first()
    if listing:
        listing.transaction_status = "negotiating"

    session = ChatSession(
        request_id=req.id,
        listing_id=req.listing_id,
        buyer_id=req.buyer_id,
        seller_id=req.seller_id,
        status="active",
    )
    db.add(session)
    db.flush()  # lấy session.id

    # Tin nhắn hệ thống mở đầu
    seller_name = req.seller.username if req.seller else "Seller"
    buyer_name  = req.buyer.username  if req.buyer  else "Buyer"
    sys_msg = Message(
        session_id=session.id,
        sender_id=None,
        text=f"{seller_name} đã chấp thuận yêu cầu của {buyer_name}. Bắt đầu trao đổi!",
        type="system",
    )
    db.add(sys_msg)
    db.commit()
    db.refresh(session)
    return _sess_out(session)


@router.post("/requests/{request_id}/reject", status_code=200)
def reject_request(request_id: int, db: Session = Depends(get_db)):
    """Seller từ chối yêu cầu."""
    req = db.query(ChatRequest).filter(ChatRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Yêu cầu không tồn tại")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Yêu cầu đã được xử lý")
    req.status = "rejected"
    db.commit()
    return {"message": "Đã từ chối yêu cầu"}


# ══════════════════════════════════════════════════════════════════════════════
# CHAT SESSIONS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/sessions/{session_id}", response_model=SessionOut)
def get_session(session_id: int, db: Session = Depends(get_db)):
    s = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    return _sess_out(s)


@router.get("/sessions/user/{user_id}", response_model=list[SessionOut])
def get_user_sessions(user_id: int, db: Session = Depends(get_db)):
    """Lấy tất cả session của user (cả buyer lẫn seller)."""
    rows = (
        db.query(ChatSession)
        .filter(
            (ChatSession.buyer_id == user_id) | (ChatSession.seller_id == user_id)
        )
        .order_by(ChatSession.created_at.desc())
        .all()
    )
    return [_sess_out(s) for s in rows]


@router.post("/sessions/{session_id}/confirm", response_model=SessionOut)
def confirm_complete(session_id: int, user_id: int, db: Session = Depends(get_db)):
    """Buyer hoặc seller xác nhận hoàn thành giao dịch."""
    s = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    if s.status == "closed":
        raise HTTPException(status_code=400, detail="Session đã đóng")

    is_seller = (user_id == s.seller_id)
    is_buyer  = (user_id == s.buyer_id)
    if not is_seller and not is_buyer:
        raise HTTPException(status_code=403, detail="Bạn không có quyền")

    if is_seller:
        s.seller_confirmed = True
    else:
        s.buyer_confirmed = True

    if s.seller_confirmed and s.buyer_confirmed:
        # Cả hai xác nhận → đóng & đánh dấu listing sold
        s.status       = "closed"
        s.close_reason = "completed"
        s.closed_at    = datetime.utcnow()

        listing = db.query(Listing).filter(Listing.id == s.listing_id).first()
        if listing:
            listing.transaction_status = "sold"

        sys_text = "✅ Cả hai bên đã xác nhận giao dịch hoàn thành. Cuộc trò chuyện đã được đóng."
    else:
        who = (
            s.request.seller.username if is_seller and s.request and s.request.seller
            else s.request.buyer.username if s.request and s.request.buyer
            else "Một bên"
        )
        sys_text = f"⏳ {who} đã xác nhận hoàn thành. Đang chờ bên còn lại xác nhận."

    sys_msg = Message(session_id=session_id, sender_id=None, text=sys_text, type="system")
    db.add(sys_msg)
    db.commit()
    db.refresh(s)
    return _sess_out(s)


@router.post("/sessions/{session_id}/cancel", response_model=SessionOut)
def cancel_session(session_id: int, user_id: int, db: Session = Depends(get_db)):
    """Buyer hoặc seller hủy cuộc thương lượng."""
    s = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    if s.status == "closed":
        raise HTTPException(status_code=400, detail="Session đã đóng")
    if user_id not in (s.buyer_id, s.seller_id):
        raise HTTPException(status_code=403, detail="Bạn không có quyền")

    user = db.query(User).filter(User.id == user_id).first()
    username = user.username if user else "Người dùng"

    s.status       = "closed"
    s.close_reason = "cancelled"
    s.closed_at    = datetime.utcnow()

    # Đánh dấu ChatRequest tương ứng là cancelled
    # để buyer có thể gửi lại yêu cầu cho bài đăng này
    req = db.query(ChatRequest).filter(ChatRequest.id == s.request_id).first()
    if req:
        req.status = "cancelled"

    listing = db.query(Listing).filter(Listing.id == s.listing_id).first()
    if listing and listing.transaction_status != "sold":
        listing.transaction_status = "available"


    sys_msg = Message(
        session_id=session_id,
        sender_id=None,
        text=f"❌ {username} đã hủy cuộc thương lượng. Cuộc trò chuyện đã được đóng.",
        type="system",
    )
    db.add(sys_msg)
    db.commit()
    db.refresh(s)
    return _sess_out(s)


# ══════════════════════════════════════════════════════════════════════════════
# MESSAGES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/sessions/{session_id}/messages", response_model=list[MessageOut])
def get_messages(session_id: int, db: Session = Depends(get_db)):
    s = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    return s.messages   # đã order_by timestamp trong relationship


@router.post("/sessions/{session_id}/messages", response_model=MessageOut, status_code=201)
def send_message(session_id: int, body: SendMessageBody, db: Session = Depends(get_db)):
    s = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    if s.status == "closed":
        raise HTTPException(status_code=400, detail="Session đã đóng, không thể gửi tin")

    msg = Message(
        session_id=session_id,
        sender_id=body.sender_id,
        text=body.text.strip(),
        type=body.type,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


# ══════════════════════════════════════════════════════════════════════════════
# RATINGS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/sessions/{session_id}/rate")
def rate_user(
    session_id: int,
    body: RatingBody,
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session không tồn tại")

    if session.close_reason != "completed":
        raise HTTPException(status_code=400, detail="Chỉ được đánh giá sau khi hoàn tất giao dịch")

    # Xác định người được rate và vai trò của họ
    if body.rater_id == session.buyer_id:
        rated_id = session.seller_id
        rated_role = "seller"  # người được đánh giá là người bán

        if session.buyer_rated:
            raise HTTPException(status_code=400, detail="Bạn đã đánh giá rồi")

        session.buyer_rated = True

    elif body.rater_id == session.seller_id:
        rated_id = session.buyer_id
        rated_role = "buyer"  # người được đánh giá là người mua

        if session.seller_rated:
            raise HTTPException(status_code=400, detail="Bạn đã đánh giá rồi")

        session.seller_rated = True

    else:
        raise HTTPException(status_code=403, detail="Không hợp lệ")

    rating = Rating(
        session_id=session.id,
        listing_id=session.listing_id,
        rater_id=body.rater_id,
        rated_id=rated_id,
        stars=body.stars,
        comment=body.comment,
        rated_role=rated_role,
    )

    db.add(rating)

    # Update user rating
    user = db.query(User).filter(User.id == rated_id).first()

    total_score = (user.rating * user.rating_count) + body.stars
    user.rating_count += 1
    user.rating = round(total_score / user.rating_count, 1)

    db.commit()
    db.refresh(rating)

    return {
        "message": "Đánh giá thành công",
        "rating": user.rating,
        "rating_count": user.rating_count,
    }