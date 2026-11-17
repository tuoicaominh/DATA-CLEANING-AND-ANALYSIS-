from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CleaningActionRequest(BaseModel):
    type: Literal["missing_values", "remove_duplicates", "normalize_format"]
    parameters: dict = Field(default_factory=dict)


class CreateProcessingJobRequest(BaseModel):
    actions: list[CleaningActionRequest] = Field(min_length=1, max_length=10)


class OutputFileResponse(BaseModel):
    id: int
    name: str
    size: int
    download_url: str


class CleaningActionResponse(BaseModel):
    id: int
    column_id: int | None
    action_type: str
    parameters: dict
    affected_rows: int
    created_at: datetime


class ProcessingJobResponse(BaseModel):
    id: int
    file_id: int
    job_type: str
    status: str
    started_at: datetime | None
    finished_at: datetime | None
    error_message: str | None
    created_at: datetime
    actions: list[CleaningActionResponse] = Field(default_factory=list)
    output_file: OutputFileResponse | None = None
