import io
import json
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.middlewares.authentication import require_current_user
from app.db.session import get_db
from app.models.data_file import DataFile
from app.models.file_column import FileColumn
from app.models.output_file import OutputFile
from app.models.processing_job import ProcessingJob
from app.models.quality_report import QualityIssue, SuspiciousRecord
from app.models.user import User
from app.modules.processing.data_io import read_dataset
from app.modules.processing.quality import save_quality_report
from app.modules.processing.service import stored_path

router = APIRouter(tags=["Data analysis"])


@router.get("/cleaned-files/{job_id}/quality", include_in_schema=False)
@router.get("/analysis/cleaned-files/{job_id}/quality")
def get_cleaned_file_quality(
    job_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    format: Literal["json", "xlsx"] = "json",
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    source = db.scalar(
        select(DataFile).join(ProcessingJob, ProcessingJob.file_id == DataFile.id)
        .join(OutputFile, OutputFile.job_id == ProcessingJob.id)
        .where(
            ProcessingJob.id == job_id, ProcessingJob.user_id == user.id,
            DataFile.user_id == user.id, ProcessingJob.status == "COMPLETED",
            OutputFile.output_type == "CLEANED_DATA",
        )
        .with_for_update(of=ProcessingJob)
    )
    if source is None:
        raise HTTPException(404, "Không tìm thấy tệp kết quả.")

    issues_query = select(QualityIssue).where(QualityIssue.job_id == job_id).order_by(QualityIssue.id)
    issues = db.scalars(issues_query).all()
    if not issues:
        try:
            headers, rows = read_dataset(stored_path(source.stored_path), source.file_format)
        except (OSError, ValueError) as error:
            raise HTTPException(409, "Không thể đọc tệp nguồn để tạo báo cáo chất lượng.") from error
        columns = db.scalars(select(FileColumn).where(FileColumn.file_id == source.id))
        save_quality_report(db, job_id, headers, rows, {column.column_name: column.id for column in columns})
        db.flush()
        issues = db.scalars(issues_query).all()

    visible_records = (SuspiciousRecord.job_id == job_id, SuspiciousRecord.issue_type != "EXTRA_WHITESPACE")
    records_query = select(SuspiciousRecord, FileColumn.column_name).outerjoin(
        FileColumn, SuspiciousRecord.column_id == FileColumn.id,
    ).where(*visible_records).order_by(
        SuspiciousRecord.source_row_number, SuspiciousRecord.id,
    )
    expected_types = {
        issue.details.get("column_name"): issue.details.get("expected_type")
        for issue in issues if issue.issue_type == "TYPE_MISMATCH"
    }
    if format == "xlsx":
        from openpyxl import Workbook
        from openpyxl.cell import WriteOnlyCell
        from openpyxl.cell.cell import ILLEGAL_CHARACTERS_RE

        workbook = Workbook(write_only=True)
        sheet = workbook.create_sheet("Bản ghi đáng ngờ")
        sheet.freeze_panes = "A2"
        for column, width in zip("ABCDEF", (17, 28, 24, 22, 58, 70)):
            sheet.column_dimensions[column].width = width
        sheet.append(["Bản ghi nguồn", "Cột", "Mã vấn đề", "Kiểu yêu cầu", "Lý do", "Giá trị gốc"])
        for record, column_name in db.execute(records_query):
            values = [
                record.source_row_number,
                column_name,
                record.issue_type,
                expected_types.get(column_name) if record.issue_type == "TYPE_MISMATCH" else None,
                record.reason,
                record.original_value if isinstance(record.original_value, str)
                else json.dumps(record.original_value, ensure_ascii=False),
            ]
            cells = []
            for value in values:
                if isinstance(value, str):
                    value = ILLEGAL_CHARACTERS_RE.sub(lambda match: f"\\u{ord(match[0]):04x}", value)
                    # Continue long values across cells to avoid Excel's per-cell truncation.
                    for start in range(0, max(len(value), 1), 32767):
                        cell = WriteOnlyCell(sheet, value=value[start:start + 32767])
                        cell.data_type = "s"
                        cells.append(cell)
                else:
                    cells.append(value)
            sheet.append(cells)
        db.commit()
        output = io.BytesIO()
        workbook.save(output)
        return Response(
            output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="ban-ghi-dang-ngo-{job_id}.xlsx"'},
        )

    total = db.scalar(select(func.count(SuspiciousRecord.id)).where(*visible_records))
    records = db.execute(records_query.offset(offset).limit(limit)).all()
    db.commit()
    return {
        "quality_issues": [{
            "id": issue.id,
            "column_name": issue.details.get("column_name"),
            "issue_type": issue.issue_type,
            "expected_type": issue.details.get("expected_type"),
            "issue_count": issue.issue_count,
            "issue_rate": issue.issue_rate,
        } for issue in issues if issue.issue_count],
        "suspicious_records": [{
            "id": record.id,
            "source_row_number": record.source_row_number,
            "column_name": column_name,
            "original_value": record.original_value,
            "issue_type": record.issue_type,
            "expected_type": expected_types.get(column_name) if record.issue_type == "TYPE_MISMATCH" else None,
            "reason": record.reason,
        } for record, column_name in records],
        "suspicious_total": total,
    }
