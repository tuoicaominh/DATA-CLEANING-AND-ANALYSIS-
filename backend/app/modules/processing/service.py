import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.cleaning_action import CleaningAction
from app.models.data_file import DataFile
from app.models.file_column import FileColumn
from app.models.output_file import OutputFile
from app.models.processing_job import ProcessingJob
from app.modules.processing.data_io import read_dataset, write_dataset
from app.validators.processing import CleaningActionRequest

ACTION_TYPES = {"missing_values", "remove_duplicates", "normalize_format"}


def stored_path(relative_path: str) -> Path:
    root = settings.storage_root.resolve()
    path = (root / relative_path).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Đường dẫn lưu trữ không hợp lệ.")
    return path


def _is_missing(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _apply_action(headers: list[str], rows: list[list[Any]], action: CleaningActionRequest) -> tuple[list[list[Any]], int]:
    parameters = action.parameters
    if action.type == "missing_values":
        strategy = parameters.get("strategy", "drop_rows")
        if strategy == "drop_rows":
            kept = [row for row in rows if not any(_is_missing(value) for value in row)]
            return kept, len(rows) - len(kept)
        if strategy == "fill_value":
            fill_value = parameters.get("value", "")
            changed = 0
            filled = []
            for row in rows:
                new_row = [fill_value if _is_missing(value) else value for value in row]
                changed += int(new_row != row)
                filled.append(new_row)
            return filled, changed
        raise ValueError("Cách xử lý giá trị trống phải là drop_rows hoặc fill_value.")

    if action.type == "remove_duplicates":
        selected_columns = parameters.get("columns") or headers
        if not isinstance(selected_columns, list) or any(name not in headers for name in selected_columns):
            raise ValueError("Cột dùng để tìm dữ liệu trùng không hợp lệ.")
        if not selected_columns:
            raise ValueError("Chọn ít nhất một cột để tìm dữ liệu trùng.")
        indexes = [headers.index(name) for name in selected_columns]
        seen = set()
        kept = []
        for row in rows:
            key = tuple(repr(row[index]) for index in indexes)
            if key in seen:
                continue
            seen.add(key)
            kept.append(row)
        return kept, len(rows) - len(kept)

    if action.type == "normalize_format":
        case_mode = parameters.get("case", "preserve")
        if case_mode not in {"preserve", "lower", "upper"}:
            raise ValueError("Tham số case phải là preserve, lower hoặc upper.")
        changed_rows = 0
        normalized = []
        for row in rows:
            new_row = []
            for value in row:
                if isinstance(value, str):
                    value = re.sub(r"\s+", " ", value).strip()
                    if case_mode == "lower":
                        value = value.lower()
                    elif case_mode == "upper":
                        value = value.upper()
                new_row.append(value)
            changed_rows += int(new_row != row)
            normalized.append(new_row)
        return normalized, changed_rows

    raise ValueError("Loại thao tác làm sạch không được hỗ trợ.")


def _job_payload(db: Session, job: ProcessingJob) -> dict:
    output = db.scalar(select(OutputFile).where(OutputFile.job_id == job.id))
    actions = db.scalars(select(CleaningAction).where(CleaningAction.job_id == job.id)
                         .order_by(CleaningAction.created_at, CleaningAction.id)).all()
    return {
        "id": job.id,
        "file_id": job.file_id,
        "job_type": job.job_type,
        "status": job.status,
        "started_at": job.started_at,
        "finished_at": job.finished_at,
        "error_message": job.error_message,
        "created_at": job.created_at,
        "actions": [
            {
                "id": action.id,
                "column_id": action.column_id,
                "action_type": action.action_type,
                "parameters": action.parameters,
                "affected_rows": action.affected_rows,
                "created_at": action.created_at,
            }
            for action in actions
        ],
        "output_file": {
            "id": output.id,
            "name": output.original_name,
            "size": output.file_size,
            "download_url": f"/api/processing-jobs/{job.id}/output",
        } if output else None,
    }


def create_and_run_job(
    db: Session,
    *,
    data_file: DataFile,
    user_id: int,
    actions: list[CleaningActionRequest],
) -> dict:
    if not actions:
        raise HTTPException(422, "Chọn ít nhất một thao tác làm sạch.")
    if any(action.type not in ACTION_TYPES for action in actions):
        raise HTTPException(422, "Có thao tác làm sạch không được hỗ trợ.")

    job = ProcessingJob(file_id=data_file.id, user_id=user_id, job_type="CLEANING", status="QUEUED")
    db.add(job)
    db.commit()
    db.refresh(job)
    job.status = "RUNNING"
    job.started_at = datetime.now(timezone.utc)
    db.commit()

    output_path: Path | None = None
    try:
        source_path = stored_path(data_file.stored_path)
        if not source_path.is_file():
            raise ValueError("Không tìm thấy nội dung file nguồn.")
        headers, rows = read_dataset(source_path, data_file.file_format)
        file_columns = db.scalars(select(FileColumn).where(FileColumn.file_id == data_file.id)).all()
        column_ids = {column.column_name: column.id for column in file_columns}
        action_records = []
        for action in actions:
            column_name = action.parameters.get("column")
            column_id = column_ids.get(column_name) if isinstance(column_name, str) else None
            record = CleaningAction(
                job_id=job.id,
                column_id=column_id,
                action_type=action.type,
                parameters=action.parameters,
                affected_rows=0,
            )
            db.add(record)
            action_records.append(record)
        db.commit()

        for action, record in zip(actions, action_records):
            rows, affected_rows = _apply_action(headers, rows, action)
            record.affected_rows = affected_rows
            db.commit()

        output_format = "xlsx" if data_file.file_format == "xls" else data_file.file_format
        suffix = "." + output_format
        original_stem = Path(data_file.original_name).stem
        safe_stem = re.sub(r"[^\w.-]+", "_", original_stem, flags=re.UNICODE).strip("._") or "data"
        output_name = f"{safe_stem}_cleaned{suffix}"
        relative_output = Path("outputs") / str(user_id) / f"{uuid.uuid4().hex}{suffix}"
        output_path = stored_path(relative_output.as_posix())
        output_path.parent.mkdir(parents=True, exist_ok=True)
        write_dataset(output_path, output_format, headers, rows)
        output_file = OutputFile(
            job_id=job.id,
            output_type="CLEANED_DATA",
            file_format=output_format,
            original_name=output_name,
            stored_path=relative_output.as_posix(),
            file_size=output_path.stat().st_size,
        )
        db.add(output_file)
        job.status = "COMPLETED"
        job.finished_at = datetime.now(timezone.utc)
        job.error_message = None
        db.commit()
        db.refresh(job)
        return _job_payload(db, job)
    except Exception as error:
        db.rollback()
        if output_path:
            output_path.unlink(missing_ok=True)
        job = db.get(ProcessingJob, job.id)
        if job:
            job.status = "FAILED"
            job.finished_at = datetime.now(timezone.utc)
            job.error_message = str(error)[:2000]
            db.commit()
            return _job_payload(db, job)
        raise
