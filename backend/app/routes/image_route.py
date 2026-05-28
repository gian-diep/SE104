"""
backend/app/routes/image_route.py
"""

import uuid
import cloudinary
import cloudinary.uploader
import os

from fastapi import APIRouter, UploadFile, File, HTTPException

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB   = 5

router = APIRouter(prefix="/images", tags=["images"])


async def _upload(file: UploadFile, folder: str) -> str:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Loại file không hợp lệ: {file.content_type}")

    content = await file.read()

    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File quá lớn. Tối đa {MAX_SIZE_MB}MB.")

    result = cloudinary.uploader.upload(content, folder=folder, resource_type="image")
    return result["secure_url"]


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    url = await _upload(file, "images")
    return {"image_id": url, "url": url}


@router.post("/upload/avatar")
async def upload_avatar(file: UploadFile = File(...)):
    url = await _upload(file, "avatars")
    return {"avatar_id": url, "url": url}