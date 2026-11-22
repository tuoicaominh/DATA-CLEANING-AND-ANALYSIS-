import json
import re

from sqlalchemy import insert
from sqlalchemy.orm import Session

from app.models.quality_report import QualityIssue, SuspiciousRecord
from app.modules.processing.column_types import type_error
from app.modules.processing.data_io import _canonical, _is_missing


def _json_value(value):
    if isinstance(value, str):
        return value.replace("\x00", "\\u0000")
    if isinstance(value, list):
        return [_json_value(item) for item in value]
    if isinstance(value, dict):
        return {_json_value(key): _json_value(item) for key, item in value.items()}
    return value


def save_quality_report(
    db: Session, job_id: int, headers: list, rows: list, column_ids: dict, *,
    expected_types: dict | None = None, csv_source: bool = False, check_whitespace: bool = True,
) -> None:
    def add_issue(issue_type, count, column=None, expected_type=None):
        db.add(QualityIssue(
            job_id=job_id,
            column_id=column_ids.get(column),
            issue_type=issue_type,
            issue_count=count,
            issue_rate=count / len(rows) if rows else 0,
            details={"column_name": column, "expected_type": expected_type},
        ))

    first_row = {}
    duplicate_count = 0
    missing_counts = [0] * len(headers)
    whitespace_counts = [0] * len(headers)
    mismatch_counts = [0] * len(headers)
    types = [(expected_types or {}).get(column) for column in headers]
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
                continue
            if check_whitespace and isinstance(value, str) and re.sub(r"\s+", " ", value).strip() != value:
                whitespace_counts[index] += 1
            if types[index] and (reason := type_error(value, types[index], csv_source)):
                mismatch_counts[index] += 1
                findings.append({
                    "job_id": job_id,
                    "column_id": column_ids.get(headers[index]),
                    "source_row_number": row_number,
                    "original_value": _json_value(json.loads(
                        _canonical(value), parse_constant=lambda token: token
                    )),
                    "issue_type": "TYPE_MISMATCH",
                    "reason": reason,
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
        if mismatch_counts[index]:
            add_issue("TYPE_MISMATCH", mismatch_counts[index], column, types[index])
    # Keep this check even at zero so older jobs can be backfilled only once.
    add_issue("DUPLICATE_ROW", duplicate_count)
