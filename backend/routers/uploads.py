"""Photo uploads: validated image storage under backend/uploads, served via /api/uploads."""

import mimetypes
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool

from lib.authz import current_member
from models.portal import UploadOut

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/uploads", response_model=UploadOut)
async def upload_photo(file: UploadFile, member: dict = Depends(current_member)):
    ext = ALLOWED_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG or WebP images are allowed")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 5 MB or smaller")
    if len(data) < 64:
        raise HTTPException(status_code=400, detail="That file does not look like a valid image")
    name = f"{uuid.uuid4().hex}{ext}"
    await run_in_threadpool((UPLOAD_DIR / name).write_bytes, data)
    return UploadOut(url=f"/api/uploads/{name}")


@router.get("/uploads/{name}")
async def serve_photo(name: str):
    if "/" in name or "\\" in name or ".." in name:
        raise HTTPException(status_code=404, detail="Not found")
    path = UPLOAD_DIR / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path, media_type=mimetypes.guess_type(name)[0] or "application/octet-stream")
