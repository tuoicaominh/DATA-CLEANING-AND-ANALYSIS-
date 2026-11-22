from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class QualityIssue(Base):
    __tablename__ = "quality_issues"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("processing_jobs.id", ondelete="CASCADE"), index=True)
    column_id: Mapped[int | None] = mapped_column(ForeignKey("file_columns.id", ondelete="CASCADE"))
    issue_type: Mapped[str] = mapped_column(String(40))
    issue_count: Mapped[int] = mapped_column(BigInteger)
    issue_rate: Mapped[float] = mapped_column(Float)
    details: Mapped[dict] = mapped_column(JSONB)


class SuspiciousRecord(Base):
    __tablename__ = "suspicious_records"
    __table_args__ = (Index("ix_suspicious_records_job_row", "job_id", "source_row_number", "id"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("processing_jobs.id", ondelete="CASCADE"))
    column_id: Mapped[int | None] = mapped_column(ForeignKey("file_columns.id", ondelete="CASCADE"))
    source_row_number: Mapped[int] = mapped_column(BigInteger)
    original_value: Mapped[Any] = mapped_column(JSONB)
    issue_type: Mapped[str] = mapped_column(String(40))
    reason: Mapped[str] = mapped_column(Text)
    resolution_status: Mapped[str] = mapped_column(String(32), default="PENDING")
    corrected_value: Mapped[Any | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
