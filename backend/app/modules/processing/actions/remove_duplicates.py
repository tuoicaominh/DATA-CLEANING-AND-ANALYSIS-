from typing import Any


def apply(
    headers: list[str],
    rows: list[list[Any]],
    parameters: dict[str, Any],
) -> tuple[list[list[Any]], int]:
    selected_columns = parameters.get("columns") or headers
    if not isinstance(selected_columns, list) or any(name not in headers for name in selected_columns):
        raise ValueError("Cột dùng để tìm dữ liệu trùng không hợp lệ.")
    if not selected_columns:
        raise ValueError("Chọn ít nhất một cột để tìm dữ liệu trùng.")
    indexes = [headers.index(name) for name in selected_columns]
    seen = set()
    kept = []
    for row in rows:
        key = tuple(repr(row[index]) for index in indexes)
        if key in seen:
            continue
        seen.add(key)
        kept.append(row)
    return kept, len(rows) - len(kept)
