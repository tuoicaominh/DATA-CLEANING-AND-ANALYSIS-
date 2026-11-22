from fastapi import APIRouter, Depends, HTTPException, Response, status
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


@router.delete("/processing-jobs/{job_id}", status_code=204)
def discard_processing_job(
    job_id: int,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    job = db.scalar(select(ProcessingJob).where(
        ProcessingJob.id == job_id, ProcessingJob.user_id == user.id
    ).with_for_update())
    if job is None:
        return Response(status_code=204)
    if job.status not in {"COMPLETED", "FAILED"}:
        raise HTTPException(409, "Job đang xử lý.")
    output = db.scalar(select(OutputFile).where(OutputFile.job_id == job.id))
    if output:
        service.stored_path(output.stored_path).unlink(missing_ok=True)
    db.delete(job)
    db.commit()
    return Response(status_code=204)


@router.get("/cleaned-files")
def list_cleaned_files(
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(OutputFile, DataFile.original_name)
        .join(ProcessingJob, OutputFile.job_id == ProcessingJob.id)
        .join(DataFile, ProcessingJob.file_id == DataFile.id)
        .where(
            ProcessingJob.user_id == user.id,
            DataFile.user_id == user.id,
            ProcessingJob.status == "COMPLETED",
            OutputFile.output_type == "CLEANED_DATA",
        )
        .order_by(OutputFile.created_at.desc(), OutputFile.id.desc())
    )
    return [
        {
            "job_id": output.job_id,
            "name": output.original_name,
            "source_name": source_name,
            "file_format": output.file_format,
            "created_at": output.created_at,
        }
        for output, source_name in rows
    ]


@router.delete("/cleaned-files/{job_id}", status_code=204)
def delete_cleaned_file(
    job_id: int,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    job = db.scalar(select(ProcessingJob).where(
        ProcessingJob.id == job_id, ProcessingJob.user_id == user.id,
    ).with_for_update())
    if job is not None and job.status == "COMPLETED":
        output = db.scalar(select(OutputFile).where(
            OutputFile.job_id == job.id, OutputFile.output_type == "CLEANED_DATA",
        ))
        if output is not None:
            service.stored_path(output.stored_path).unlink(missing_ok=True)
            db.delete(output)
            db.commit()
    return Response(status_code=204)
