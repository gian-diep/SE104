"""
app/routes/sse_route.py

GET /sse/users/{user_id}/status
  → Client giữ kết nối này để nhận push event khi bị ban.
  → Server gửi:
      event: banned
      data: {"reason": "..."}
"""

import asyncio
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app import sse_bus

router = APIRouter(prefix="/sse", tags=["sse"])

HEARTBEAT_INTERVAL = 20  # giây — giữ connection sống qua proxy/load balancer


@router.get("/users/{user_id}/status")
async def user_status_stream(user_id: int):
    q = sse_bus.subscribe(user_id)

    async def generator():
        try:
            while True:
                try:
                    # Chờ event, timeout = heartbeat interval
                    msg = await asyncio.wait_for(q.get(), timeout=HEARTBEAT_INTERVAL)
                    yield f"event: {msg['event']}\ndata: {msg['data']}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat để giữ kết nối sống
                    yield ": heartbeat\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            sse_bus.unsubscribe(user_id, q)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # tắt buffering trên nginx
        },
    )