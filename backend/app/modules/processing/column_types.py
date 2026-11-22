import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from app.modules.processing.data_io import _is_missing


COLUMN_TYPES = ("VARCHAR", "INTEGER", "DECIMAL", "DATE", "BOOLEAN")
DECIMAL_PATTERN = re.compile(r"[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?")


def date_text_is_valid(value: str) -> bool:
    if not re.fullmatch(r"[0-9]{2}/[0-9]{2}/[0-9]{4}", value):
        return False
    try:
        datetime.strptime(value, "%d/%m/%Y")
    except ValueError:
        return False
    return True


def type_error(value, expected: str, csv_source: bool) -> str | None:
    if _is_missing(value):
        return None
    actual = {
        str: "văn bản", int: "số nguyên", float: "số", bool: "boolean",
        date: "ngày", datetime: "ngày giờ", list: "mảng", dict: "đối tượng",
    }.get(type(value), type(value).__name__)
    if expected == "VARCHAR" and isinstance(value, str):
        return None
    if expected == "DATE":
        if isinstance(value, date) or isinstance(value, str) and date_text_is_valid(value.strip()):
            return None
        return f"Yêu cầu DATE (dd/MM/yyyy). Giá trị {actual} không biểu diễn ngày hợp lệ theo mẫu này."
    if expected == "BOOLEAN":
        if type(value) is bool or csv_source and value.strip().lower() in {"true", "false"}:
            return None
    if expected in {"INTEGER", "DECIMAL"}:
        number = None
        if type(value) in {int, float}:
            number = Decimal(str(value))
        elif csv_source and DECIMAL_PATTERN.fullmatch(value.strip()):
            try:
                number = Decimal(value.strip())
            except InvalidOperation:
                pass
        if number is not None and number.is_finite():
            if expected == "DECIMAL":
                return None
            if csv_source and not re.fullmatch(r"[+-]?[0-9]+", value.strip()):
                message = "có phần thập phân" if number != number.to_integral_value() else "không có dạng số nguyên"
                return f"Yêu cầu INTEGER. Giá trị {message}."
            if number == number.to_integral_value():
                return None
            return "Yêu cầu INTEGER. Giá trị có phần thập phân."
        if csv_source:
            return f"Yêu cầu {expected}. Nội dung ô không phải là số hợp lệ."
    return f"Yêu cầu {expected}. Kiểu thực tế là {actual}."


def suggest_column_types(headers, rows, csv_source: bool) -> dict[str, str]:
    suggestions = {}
    for index, name in enumerate(headers):
        values = [row[index] for row in rows if not _is_missing(row[index])]
        if not values or csv_source and any(re.match(r"[+-]?0[0-9]", value.strip()) for value in values):
            suggestions[name] = "VARCHAR"
            continue
        suggestions[name] = next(
            (kind for kind in ("BOOLEAN", "INTEGER", "DECIMAL", "DATE")
             if all(type_error(value, kind, csv_source) is None for value in values)),
            "VARCHAR",
        )
    return suggestions
