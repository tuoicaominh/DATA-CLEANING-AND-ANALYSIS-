from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse as DownloadResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.middlewares.authentication import require_current_user
from app.db.session import get_db
from app.models.data_file import DataFile
from app.models.output_file import OutputFile
from app.models.processing_job import ProcessingJob
from app.models.user import User
from app.modules.processing import service
from app.validators.processing import CreateProcessingJobRequest, ProcessingJobResponse

router = APIRouter(tags=["Processing jobs"])


@router.post(
    "/files/{file_id}/processing-jobs",
    response_model=ProcessingJobResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_processing_job(
    file_id: int,
    payload: CreateProcessingJobRequest,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    data_file = db.scalar(select(DataFile).where(DataFile.id == file_id, DataFile.user_id == user.id))
    if data_file is None:
        raise HTTPException(404, "Không tìm thấy file thuộc tài khoản của bạn.")
    if data_file.status != "READY":
        raise HTTPException(409, "File chưa sẵn sàng để làm sạch.")
    return service.create_and_run_job(db, data_file=data_file, user_id=user.id, actions=payload.actions)


@router.get("/files/{file_id}/processing-jobs", response_model=list[ProcessingJobResponse])
def list_file_processing_jobs(
    file_id: int,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    data_file = db.scalar(select(DataFile.id).where(DataFile.id == file_id, DataFile.user_id == user.id))
    if data_file is None:
        raise HTTPException(404, "Không tìm thấy file thuộc tài khoản của bạn.")
    jobs = db.scalars(select(ProcessingJob).where(
        ProcessingJob.file_id == file_id,
        ProcessingJob.user_id == user.id,
    ).order_by(ProcessingJob.created_at.desc(), ProcessingJob.id.desc())).all()
    return [service._job_payload(db, job) for job in jobs]


@router.get("/processing-jobs/{job_id}", response_model=ProcessingJobResponse)
def get_processing_job(
    job_id: int,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    job = db.scalar(select(ProcessingJob).where(ProcessingJob.id == job_id, ProcessingJob.user_id == user.id))
    if job is None:
        raise HTTPException(404, "Không tìm thấy job xử lý.")
    return service._job_payload(db, job)


@router.get("/processing-jobs/{job_id}/output")
def download_processing_output(
    job_id: int,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    output = db.scalar(select(OutputFile).join(
        ProcessingJob, OutputFile.job_id == ProcessingJob.id
    ).where(ProcessingJob.id == job_id, ProcessingJob.user_id == user.id))
    if output is None:
        raise HTTPException(404, "Job chưa có file kết quả.")
    path = service.stored_path(output.stored_path)
    if not path.is_file():
        raise HTTPException(404, "Không tìm thấy file kết quả trên kho lưu trữ.")
    return DownloadResponse(path, filename=output.original_name, media_type="application/octet-stream")
