from typing import Any

def _is_missing(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def apply(
    _headers: list[str],
    rows: list[list[Any]],
    parameters: dict[str, Any],
) -> tuple[list[list[Any]], int]:
    strategy = parameters.get("strategy", "drop_rows")
    if strategy == "drop_rows":
        kept = [row for row in rows if not any(_is_missing(value) for value in row)]
        return kept, len(rows) - len(kept)
    if strategy == "fill_value":
        fill_value = parameters.get("value", "")
        changed = 0
        filled = []
        for row in rows:
            new_row = [fill_value if _is_missing(value) else value for value in row]
            changed += int(new_row != row)
            filled.append(new_row)
        return filled, changed
    raise ValueError("Cách xử lý giá trị trống phải là drop_rows hoặc fill_value.")
