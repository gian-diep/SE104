"""
backend/app/routes/image_route.py

Endpoints upload và serve ảnh từ folder local.
- POST /images/upload         → ảnh listing  → uploads/images/
- POST /images/upload/avatar  → avatar user  → uploads/avatars/
- GET  /images/{image_id}     → serve ảnh listing
- GET  /avatars/{avatar_id}   → serve avatar (mount StaticFiles trong main.py)
"""

import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

# ── Folders ───────────────────────────────────────────────────────────────────

IMAGES_DIR  = Path("uploads/images")
AVATARS_DIR = Path("uploads/avatars")

# Tự tạo nếu chưa có
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
AVATARS_DIR.mkdir(parents=True, exist_ok=True)

# ── Config ────────────────────────────────────────────────────────────────────

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB   = 5

EXT_MAP = {
    "image/jpeg": ".jpg",
    "image/png":  ".png",
    "image/webp": ".webp",
    "image/gif":  ".gif",
}

# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/images", tags=["images"])


# ── Helper ────────────────────────────────────────────────────────────────────

async def _save_upload(file: UploadFile, dest_dir: Path) -> str:
    """Validate và lưu file. Trả về filename (image_id)."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Loại file không hợp lệ: {file.content_type}. Chỉ chấp nhận JPEG, PNG, WEBP, GIF.",
        )

    content = await file.read()

    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File quá lớn. Tối đa {MAX_SIZE_MB}MB.",
        )

    ext      = EXT_MAP[file.content_type]
    filename = f"{uuid.uuid4()}{ext}"
    dest_dir.mkdir(parents=True, exist_ok=True)

    with open(dest_dir / filename, "wb") as f:
        f.write(content)

    return filename


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload ảnh listing → lưu vào uploads/images/
    Trả về { image_id, url }
    Frontend lưu image_id, hiển thị qua: GET /images/{image_id}
    """
    image_id = await _save_upload(file, IMAGES_DIR)
    return {
        "image_id": image_id,
        "url": f"/images/{image_id}",
    }


@router.post("/upload/avatar")
async def upload_avatar(file: UploadFile = File(...)):
    """
    Upload avatar user → lưu vào uploads/avatars/
    Trả về { avatar_id, url }
    Frontend lưu avatar_id, hiển thị qua: GET /avatars/{avatar_id}
    """
    avatar_id = await _save_upload(file, AVATARS_DIR)
    return {
        "avatar_id": avatar_id,
        "url": f"/avatars/{avatar_id}",
    }


@router.get("/{image_id}")
async def get_image(image_id: str):
    """
    Serve ảnh listing từ uploads/images/
    Dùng khi không mount StaticFiles, hoặc làm fallback.
    """
    if ".." in image_id or "/" in image_id or "\\" in image_id:
        raise HTTPException(status_code=400, detail="image_id không hợp lệ.")

    path = IMAGES_DIR / image_id
    if not path.exists():
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh.")

    return FileResponse(path)