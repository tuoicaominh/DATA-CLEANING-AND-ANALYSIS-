import re
from typing import Any


def apply(
    _headers: list[str],
    rows: list[list[Any]],
    parameters: dict[str, Any],
) -> tuple[list[list[Any]], int]:
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
