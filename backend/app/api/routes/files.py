import hashlib
import os
import uuid
from datetime import datetime
from pathlib import Path, PurePosixPath
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse as DownloadResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.middlewares.authentication import require_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.data_file import DataFile
from app.models.file_column import FileColumn
from app.models.output_file import OutputFile
from app.models.processing_job import ProcessingJob
from app.models.user import User
from app.modules.processing.column_types import suggest_column_types
from app.modules.processing.data_io import profile_dataset, read_dataset

router = APIRouter(prefix="/files", tags=["Files"])
MAX_FILE_SIZE = 50 * 1024 * 1024
ALLOWED_FORMATS = {"xls", "xlsx", "csv", "json"}


class FileResponse(BaseModel):
    id: int
    name: str
    size: int
    file_format: str
    row_count: int | None
    column_count: int | None
    status: str
    created_at: datetime


class ColumnResponse(BaseModel):
    id: int
    ordinal_position: int
    column_name: str
    inferred_type: str
    missing_count: int
    distinct_count: int
    suggested_type: str | None = None

    model_config = ConfigDict(from_attributes=True)


def _file_response(file: DataFile) -> dict:
    return {
        "id": file.id,
        "name": file.original_name,
        "size": file.file_size,
        "file_format": file.file_format,
        "row_count": file.row_count,
        "column_count": file.column_count,
        "status": file.status,
        "created_at": file.uploaded_at,
    }


def _stored_file_path(relative_path: str) -> Path:
    root = settings.storage_root.resolve()
    path = (root / relative_path).resolve()
    if not path.is_relative_to(root):
        raise HTTPException(500, "Đường dẫn lưu trữ file không hợp lệ.")
    return path


@router.get("", response_model=list[FileResponse])
def list_files(user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    files = db.scalars(select(DataFile).where(DataFile.user_id == user.id)
                       .order_by(DataFile.uploaded_at, DataFile.id)).all()
    return [_file_response(file) for file in files]


@router.put("/{client_id}", response_model=FileResponse)
async def upload_file(
    client_id: UUID,
    request: Request,
    name: str = Query(min_length=1, max_length=255),
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    if name != PurePosixPath(name).name or "\\" in name or any(ord(char) < 32 for char in name):
        raise HTTPException(400, "Tên tệp không hợp lệ.")
    extension = PurePosixPath(name).suffix.lower().lstrip(".")
    if extension not in ALLOWED_FORMATS:
        raise HTTPException(400, "Chỉ nhận CSV, XLS, XLSX hoặc JSON.")
    length = request.headers.get("content-length")
    if length:
        try:
            if int(length) > MAX_FILE_SIZE:
                raise HTTPException(413, "Dung lượng tối đa 50 MB mỗi tệp.")
        except ValueError:
            raise HTTPException(400, "Dung lượng tệp không hợp lệ.")

    owner_dir = settings.storage_root / "uploads" / str(user.id)
    owner_dir.mkdir(parents=True, exist_ok=True)
    token = uuid.uuid4().hex
    # Keep the real suffix on the temporary file. Parsers such as openpyxl
    # validate the path extension before inspecting the workbook contents.
    temporary_path = owner_dir / f".{token}.part.{extension}"
    relative_path = Path("uploads") / str(user.id) / f"{token}.{extension}"
    destination = settings.storage_root / relative_path
    digest = hashlib.sha256()
    size = 0
    try:
        with temporary_path.open("wb") as output:
            async for chunk in request.stream():
                size += len(chunk)
                if size > MAX_FILE_SIZE:
                    raise HTTPException(413, "Dung lượng tối đa 50 MB mỗi tệp.")
                digest.update(chunk)
                output.write(chunk)
        if size == 0:
            raise HTTPException(400, "Tệp rỗng, không thể tải lên.")
        checksum = digest.hexdigest()
        # Serialize duplicate checks and inserts for this account, including across workers.
        db.execute(select(User.id).where(User.id == user.id).with_for_update(key_share=True))
        existing = db.scalar(select(DataFile).where(
            DataFile.user_id == user.id,
            DataFile.client_id == str(client_id),
        ))
        if existing:
            if existing.original_name != name or existing.sha256 != checksum:
                raise HTTPException(409, "Mã tệp đã được dùng cho nội dung khác.")
            temporary_path.unlink(missing_ok=True)
            return _file_response(existing)

        duplicate = db.scalar(select(DataFile.id).where(
            DataFile.user_id == user.id,
            DataFile.sha256 == checksum,
        ).limit(1))
        if duplicate is not None:
            raise HTTPException(409, "Tệp đã tồn tại.")

        try:
            headers, rows = read_dataset(temporary_path, extension)
        except Exception as error:
            raise HTTPException(400, f"Không đọc được cấu trúc dữ liệu trong file: {error}") from None
        profiles = profile_dataset(headers, rows)
        os.replace(temporary_path, destination)
        data_file = DataFile(
            user_id=user.id,
            original_name=name,
            stored_path=relative_path.as_posix(),
            file_format=extension,
            file_size=size,
            row_count=len(rows),
            column_count=len(headers),
            status="READY",
            client_id=str(client_id),
            sha256=checksum,
        )
        db.add(data_file)
        db.flush()
        db.add_all([
            FileColumn(
                file_id=data_file.id,
                ordinal_position=index,
                column_name=profile["column_name"],
                inferred_type=profile["inferred_type"],
                missing_count=profile["missing_count"],
                distinct_count=profile["distinct_count"],
            )
            for index, profile in enumerate(profiles, start=1)
        ])
        db.commit()
        db.refresh(data_file)
        return _file_response(data_file)
    except HTTPException:
        temporary_path.unlink(missing_ok=True)
        raise
    except (ValueError, UnicodeDecodeError) as error:
        temporary_path.unlink(missing_ok=True)
        raise HTTPException(400, f"Không đọc được file: {error}") from None
    except IntegrityError:
        db.rollback()
        temporary_path.unlink(missing_ok=True)
        existing = db.scalar(select(DataFile).where(
            DataFile.user_id == user.id,
            DataFile.client_id == str(client_id),
        ))
        if existing and existing.original_name == name and existing.sha256 == checksum:
            destination.unlink(missing_ok=True)
            return _file_response(existing)
        destination.unlink(missing_ok=True)
        raise HTTPException(409, "Không thể lưu file do trùng mã. Hãy thử lại.") from None
    except Exception:
        db.rollback()
        temporary_path.unlink(missing_ok=True)
        destination.unlink(missing_ok=True)
        raise


@router.get("/{file_id}/columns", response_model=list[ColumnResponse])
def list_file_columns(file_id: int, user: User = Depends(require_current_user), db: Session = Depends(get_db), suggest_types: bool = False):
    data_file = db.scalar(select(DataFile).where(DataFile.id == file_id, DataFile.user_id == user.id))
    if data_file is None:
        raise HTTPException(404, "Không tìm thấy file.")
    columns = db.scalars(select(FileColumn).where(FileColumn.file_id == file_id)
                         .order_by(FileColumn.ordinal_position)).all()
    if not suggest_types:
        return columns
    try:
        headers, rows = read_dataset(_stored_file_path(data_file.stored_path), data_file.file_format)
    except (OSError, ValueError) as error:
        raise HTTPException(409, "Không thể đọc tệp nguồn để gợi ý kiểu cột.") from error
    suggestions = suggest_column_types(headers, rows, data_file.file_format == "csv")
    return [
        ColumnResponse.model_validate(column).model_copy(update={"suggested_type": suggestions.get(column.column_name)})
        for column in columns
    ]


@router.get("/{file_id}/content")
def read_file(file_id: int, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    data_file = db.scalar(select(DataFile).where(DataFile.id == file_id, DataFile.user_id == user.id))
    if data_file is None:
        raise HTTPException(404, "Không tìm thấy file.")
    path = _stored_file_path(data_file.stored_path)
    if not path.is_file():
        raise HTTPException(404, "Không tìm thấy nội dung file trên kho lưu trữ.")
    return DownloadResponse(path, filename=data_file.original_name, media_type="application/octet-stream")


@router.delete("/{file_id}", status_code=204)
def delete_file(file_id: int, user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    data_file = db.scalar(select(DataFile).where(DataFile.id == file_id, DataFile.user_id == user.id))
    if data_file is not None:
        output_paths = db.scalars(
            select(OutputFile.stored_path)
            .join(ProcessingJob, OutputFile.job_id == ProcessingJob.id)
            .where(ProcessingJob.file_id == file_id, ProcessingJob.user_id == user.id)
        ).all()
        source_path = _stored_file_path(data_file.stored_path)
        db.delete(data_file)
        db.commit()
        source_path.unlink(missing_ok=True)
        for output_path in output_paths:
            _stored_file_path(output_path).unlink(missing_ok=True)
    return Response(status_code=204)
