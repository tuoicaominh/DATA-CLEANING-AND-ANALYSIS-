import json
import re

from sqlalchemy import insert
from sqlalchemy.orm import Session

from app.models.quality_report import QualityIssue, SuspiciousRecord
from app.modules.processing.data_io import _canonical, _is_missing


def _json_value(value):
    if isinstance(value, str):
        return value.replace("\x00", "\\u0000")
    if isinstance(value, list):
        return [_json_value(item) for item in value]
    if isinstance(value, dict):
        return {_json_value(key): _json_value(item) for key, item in value.items()}
    return value


def save_quality_report(db: Session, job_id: int, headers: list, rows: list, column_ids: dict) -> None:
    def add_issue(issue_type, count, column=None):
        db.add(QualityIssue(
            job_id=job_id,
            column_id=column_ids.get(column),
            issue_type=issue_type,
            issue_count=count,
            issue_rate=count / len(rows) if rows else 0,
            details={"column_name": column},
        ))

    first_row = {}
    duplicate_count = 0
    missing_counts = [0] * len(headers)
    whitespace_counts = [0] * len(headers)
    findings = []
    for row_number, row in enumerate(rows, start=1):
        key = tuple(repr(value) for value in row)
        first = first_row.setdefault(key, row_number)
        if first != row_number:
            duplicate_count += 1
            findings.append({
                "job_id": job_id,
                "source_row_number": row_number,
                "original_value": _json_value(json.loads(
                    _canonical(dict(zip(headers, row))), parse_constant=lambda token: token
                )),
                "issue_type": "DUPLICATE_ROW",
                "reason": f"Trùng toàn bộ giá trị với bản ghi nguồn số {first}.",
            })
        for index, value in enumerate(row):
            if _is_missing(value):
                missing_counts[index] += 1
            elif isinstance(value, str) and re.sub(r"\s+", " ", value).strip() != value:
                whitespace_counts[index] += 1
                findings.append({
                    "job_id": job_id,
                    "column_id": column_ids.get(headers[index]),
                    "source_row_number": row_number,
                    "original_value": _json_value(value),
                    "issue_type": "EXTRA_WHITESPACE",
                    "reason": "Có khoảng trắng thừa hoặc ký tự khoảng trắng cần chuẩn hóa.",
                })
        if len(findings) >= 500:
            db.execute(insert(SuspiciousRecord), findings)
            findings.clear()
    if findings:
        db.execute(insert(SuspiciousRecord), findings)

    for index, column in enumerate(headers):
        if missing_counts[index]:
            add_issue("MISSING_VALUE", missing_counts[index], column)
        if whitespace_counts[index]:
            add_issue("EXTRA_WHITESPACE", whitespace_counts[index], column)
    # Keep this check even at zero so older jobs can be backfilled only once.
    add_issue("DUPLICATE_ROW", duplicate_count)
