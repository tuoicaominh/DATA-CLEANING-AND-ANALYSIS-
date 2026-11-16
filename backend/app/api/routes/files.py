import hashlib
from datetime import datetime
from pathlib import PurePosixPath
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.middlewares.authentication import require_current_user
from app.db.session import get_db
from app.models.uploaded_file import UploadedFile
from app.models.user import User

router = APIRouter(prefix="/files", tags=["Files"])
MAX_FILE_SIZE = 50 * 1024 * 1024


class FileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    size: int
    created_at: datetime


@router.get("", response_model=list[FileResponse])
def list_files(user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(UploadedFile).where(UploadedFile.owner_id == user.id)
                      .order_by(UploadedFile.created_at, UploadedFile.id)).all()


@router.put("/{file_id}", response_model=FileResponse)
async def upload_file(file_id: UUID, request: Request, name: str = Query(min_length=1, max_length=255),
                      user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    if name != PurePosixPath(name).name or "\\" in name or any(ord(c) < 32 for c in name):
        raise HTTPException(400, "Tên tệp không hợp lệ.")
    if PurePosixPath(name).suffix.lower() not in {".xls", ".xlsx", ".csv", ".json"}:
        raise HTTPException(400, "Chỉ nhận CSV, Excel hoặc JSON.")
    length = request.headers.get("content-length")
    if length:
        try:
            if int(length) > MAX_FILE_SIZE:
                raise HTTPException(413, "Dung lượng tối đa 50 MB mỗi tệp.")
        except ValueError:
            raise HTTPException(400, "Dung lượng tệp không hợp lệ.")
    chunks = []
    size = 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > MAX_FILE_SIZE:
            raise HTTPException(413, "Dung lượng tối đa 50 MB mỗi tệp.")
        chunks.append(chunk)
    content = b"".join(chunks)
    digest = hashlib.sha256(content).hexdigest()
    key = (user.id, str(file_id))
    existing = db.get(UploadedFile, key)
    if existing:
        if existing.name != name or existing.sha256 != digest:
            raise HTTPException(409, "Mã tệp đã được sử dụng cho tệp khác.")
        return existing
    item = UploadedFile(owner_id=user.id, id=str(file_id), name=name, size=size, content=content, sha256=digest)
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.get(UploadedFile, key)
        if existing and existing.name == name and existing.sha256 == digest:
            return existing
        raise HTTPException(409, "Không thể lưu tệp do trùng mã. Hãy thử lại.")
    db.refresh(item)
    return item


@router.get("/{file_id}/content")
def read_file(file_id: UUID, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    item = db.get(UploadedFile, (user.id, str(file_id)))
    if item is None:
        raise HTTPException(404, "Không tìm thấy tệp.")
    return Response(item.content, media_type="application/octet-stream", headers={"Cache-Control": "no-store"})


@router.delete("/{file_id}", status_code=204)
def delete_file(file_id: UUID, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    item = db.get(UploadedFile, (user.id, str(file_id)))
    if item is not None:
        db.delete(item)
        db.commit()
    return Response(status_code=204)
