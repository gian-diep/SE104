"""
app/sse_bus.py

In-memory pub/sub để push sự kiện tới user đang online qua SSE.
Mỗi user_id có thể có nhiều tab/kết nối → dùng list[asyncio.Queue].
"""

import asyncio
from collections import defaultdict
from typing import Dict, List

# { user_id: [Queue, Queue, ...] }
_subscribers: Dict[int, List[asyncio.Queue]] = defaultdict(list)


def subscribe(user_id: int) -> asyncio.Queue:
    """Tạo queue mới cho 1 SSE connection của user."""
    q: asyncio.Queue = asyncio.Queue()
    _subscribers[user_id].append(q)
    return q


def unsubscribe(user_id: int, q: asyncio.Queue) -> None:
    """Xóa queue khi client ngắt kết nối."""
    subs = _subscribers.get(user_id, [])
    if q in subs:
        subs.remove(q)
    if not subs:
        _subscribers.pop(user_id, None)


async def publish(user_id: int, event: str, data: str) -> None:
    """Push event tới tất cả tab của user đang online."""
    for q in list(_subscribers.get(user_id, [])):
        await q.put({"event": event, "data": data})