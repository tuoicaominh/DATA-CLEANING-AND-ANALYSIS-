import csv
import json
from datetime import date, datetime
from pathlib import Path
from typing import Any


def _headers_and_rows(raw_headers: list[Any], raw_rows: list[list[Any]]) -> tuple[list[str], list[list[Any]]]:
    if not raw_headers:
        raise ValueError("File không có dòng tiêu đề cột.")
    headers = []
    seen = set()
    for index, value in enumerate(raw_headers, start=1):
        name = str(value).strip() if value is not None else ""
        name = name or f"column_{index}"
        candidate = name
        suffix = 2
        while candidate in seen:
            candidate = f"{name}_{suffix}"
            suffix += 1
        headers.append(candidate)
        seen.add(candidate)
    rows = []
    for row in raw_rows:
        values = list(row[:len(headers)])
        values.extend([None] * (len(headers) - len(values)))
        rows.append(values)
    return headers, rows


def read_dataset(path: Path, file_format: str) -> tuple[list[str], list[list[Any]]]:
    extension = file_format.lower().lstrip(".")
    if extension == "csv":
        try:
            content = path.read_text(encoding="utf-8-sig")
        except UnicodeDecodeError:
            content = path.read_text(encoding="cp1252")
        sample = content[:8192]
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        except csv.Error:
            dialect = csv.excel
        reader = csv.reader(content.splitlines(), dialect)
        all_rows = list(reader)
        if not all_rows:
            raise ValueError("File không có dữ liệu.")
        return _headers_and_rows(all_rows[0], all_rows[1:])

    if extension == "json":
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
        if isinstance(payload, dict):
            if isinstance(payload.get("data"), list):
                payload = payload["data"]
            elif isinstance(payload.get("records"), list):
                payload = payload["records"]
            else:
                payload = [payload]
        if not isinstance(payload, list) or not payload:
            raise ValueError("JSON phải là một danh sách bản ghi hoặc một đối tượng dữ liệu.")
        if all(isinstance(record, dict) for record in payload):
            headers = list(dict.fromkeys(key for record in payload for key in record.keys()))
            return _headers_and_rows(headers, [[record.get(name) for name in headers] for record in payload])
        if all(isinstance(record, list) for record in payload):
            return _headers_and_rows([f"column_{i}" for i in range(1, len(payload[0]) + 1)], payload)
        raise ValueError("Các bản ghi JSON phải cùng là object hoặc array.")

    if extension == "xlsx":
        from openpyxl import load_workbook

        workbook = load_workbook(path, read_only=True, data_only=True)
        try:
            sheet = workbook.active
            iterator = sheet.iter_rows(values_only=True)
            raw_headers = list(next(iterator, ()))
            return _headers_and_rows(raw_headers, [list(row) for row in iterator])
        finally:
            workbook.close()

    if extension == "xls":
        import xlrd

        workbook = xlrd.open_workbook(path, on_demand=True)
        try:
            sheet = workbook.sheet_by_index(0)
            raw_headers = sheet.row_values(0) if sheet.nrows else []
            rows = [sheet.row_values(row_index) for row_index in range(1, sheet.nrows)]
            return _headers_and_rows(raw_headers, rows)
        finally:
            workbook.release_resources()

    raise ValueError("Định dạng file không được hỗ trợ.")


def _is_missing(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)


def profile_dataset(headers: list[str], rows: list[list[Any]]) -> list[dict[str, Any]]:
    profiles = []
    for index, name in enumerate(headers):
        values = [row[index] for row in rows]
        present = [value for value in values if not _is_missing(value)]
        if not present:
            inferred_type = "empty"
        elif all(isinstance(value, bool) for value in present):
            inferred_type = "boolean"
        elif all(isinstance(value, (int, float)) and not isinstance(value, bool) for value in present):
            inferred_type = "number"
        elif all(isinstance(value, (date, datetime)) for value in present):
            inferred_type = "datetime"
        elif all(isinstance(value, str) for value in present):
            inferred_type = "string"
        else:
            inferred_type = "mixed"
        profiles.append({
            "column_name": name,
            "inferred_type": inferred_type,
            "missing_count": len(values) - len(present),
            "distinct_count": len({_canonical(value) for value in present}),
        })
    return profiles


def write_dataset(path: Path, file_format: str, headers: list[str], rows: list[list[Any]]) -> str:
    extension = file_format.lower().lstrip(".")
    if extension == "csv":
        with path.open("w", encoding="utf-8-sig", newline="") as output:
            writer = csv.writer(output)
            writer.writerow(headers)
            writer.writerows(rows)
        return "csv"

    if extension == "json":
        records = [dict(zip(headers, row)) for row in rows]
        path.write_text(json.dumps(records, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        return "json"

    from openpyxl import Workbook

    workbook = Workbook(write_only=True)
    sheet = workbook.create_sheet("Cleaned Data")
    sheet.append(headers)
    for row in rows:
        sheet.append([value if isinstance(value, (str, int, float, bool, date, datetime)) or value is None else str(value) for value in row])
    workbook.save(path)
    return "xlsx"
