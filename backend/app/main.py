from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routes import user_route
from app.routes import image_route          # ← THÊM
from app.routes import admin_route  
from app.routes import chat_route   
from app.routes import report_route
"""
Những thay đổi cần thêm vào backend/app/main.py
"""

# ════════════════════════════════════════════════════════════════════════════
# Ví dụ main.py đầy đủ sau khi chỉnh
# ════════════════════════════════════════════════════════════════════════════

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes import auth_route, listing_route
from app.routes import appeal_route
from app.routes import image_route          # ← THÊM

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_route.router)
app.include_router(listing_route.router)
app.include_router(image_route.router)      # ← THÊM (xử lý POST /images/upload)
app.include_router(user_route.router)
app.include_router(admin_route.router)
app.include_router(chat_route.router)
app.include_router(report_route.router)
app.include_router(appeal_route.router)

# # ── Mount static — frontend dùng trực tiếp mà không qua route ───────────────
# app.mount("/images",  StaticFiles(directory="uploads/images"),  name="images")   # ← THÊM
# app.mount("/avatars", StaticFiles(directory="uploads/avatars"), name="avatars")  # ← THÊM

@app.get("/")
def home():
    return {
        "message": "API running"
    }