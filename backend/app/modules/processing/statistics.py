import json
import re
from collections import Counter, defaultdict
from datetime import datetime
from decimal import Decimal
from math import isfinite

from app.modules.processing.column_types import suggest_column_types
from app.modules.processing.data_io import _canonical, _is_missing


def summarize_columns(headers, rows, csv_source):
    types = suggest_column_types(headers, rows, csv_source)
    for index, name in enumerate(headers):
        present = [row[index] for row in rows if not _is_missing(row[index])]
        frequencies = Counter(_canonical(value) for value in present)
        statistics = {
            "row_count": len(rows),
            "missing_count": len(rows) - len(present),
            "distinct_count": len(frequencies),
        }
        if types[name] in {"INTEGER", "DECIMAL"}:
            numeric_values = [float(Decimal(str(value).strip())) for value in present]
            if all(isfinite(value) for value in numeric_values):
                numbers = [Decimal(str(value)) for value in numeric_values]
                low, high = min(numbers), max(numbers)
                statistics.update(min=float(low), max=float(high), mean=float(sum(numbers) / len(numbers)))
                if low == high:
                    yield name, statistics, "histogram", [{"low": float(low), "high": float(high), "count": len(numbers)}]
                    continue
                bin_count = 8
                span = high - low
                counts = [0] * bin_count
                for value in numbers:
                    bucket = min(bin_count - 1, int((value - low) * bin_count / span))
                    counts[bucket] += 1
                edges = [float(low + span * position / bin_count) for position in range(bin_count)] + [float(high)]
                yield name, statistics, "histogram", [
                    {"low": edges[position], "high": edges[position + 1], "count": count}
                    for position, count in enumerate(counts)
                ]
                continue
        chart_data = []
        for value, count in frequencies.most_common(8):
            label = json.loads(value) if value.startswith('"') else value
            label = label.replace("\x00", "�").encode("utf-8", errors="replace").decode("utf-8")
            chart_data.append({"label": label[:160] + ("…" if len(label) > 160 else ""), "count": count})
        yield name, statistics, "frequency", chart_data


def chart_label(value):
    label = json.loads(value) if value.startswith('"') else value
    label = label.encode("utf-8", errors="replace").decode("utf-8")
    return label[:100] + ("…" if len(label) > 100 else "")


TIMESTAMP = re.compile(
    r"(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})[T ]+"
    r"(\d{1,2}):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:\s*(AM|PM|Z|[+-]\d{2}:?\d{2}))?",
    re.IGNORECASE,
)


def timestamp_hour(value):
    if isinstance(value, datetime):
        return value.hour
    if not isinstance(value, str):
        return None
    match = TIMESTAMP.fullmatch(value.strip())
    if not match:
        return None
    hour = int(match[1])
    suffix = (match[2] or "").upper()
    if suffix in {"AM", "PM"}:
        return hour % 12 + (12 if suffix == "PM" else 0) if 1 <= hour <= 12 else None
    return hour if hour < 24 else None


def hourly_counts(complete, time_axis, hours):
    rows_by_group = defaultdict(lambda: [0] * 24)
    counts = Counter()
    totals = [0] * 24
    values_by_hour = [set() for _ in range(24)]
    for row, hour in zip(complete, hours):
        group = _canonical(row[1 - time_axis])
        rows_by_group[group][hour] += 1
        counts[group] += 1
        totals[hour] += 1
        values_by_hour[hour].add(group)
    return {
        "kind": "hourly", "time_axis": time_axis, "groups": len(counts), "hour_totals": totals,
        "hour_distinct": [len(values) for values in values_by_hour],
        "points": [
            {"label": chart_label(group), "hours": rows_by_group[group], "value": count}
            for group, count in counts.most_common(8)
        ],
    }


def is_identifier(name):
    normalized = re.sub(r"[^a-z0-9]", "", name.lower())
    return name.strip().lower().startswith(("mã ", "mã_", "mã-")) or normalized in {"id", "sku", "code"} or bool(re.fullmatch(
        r"(?:transaction|order|invoice|customer|product|record|user)(?:id|no|number|code)", normalized,
    )) or bool(re.search(r"(?:[\s_-]id|[a-z]ID|[a-z]Id)$", name))


def compare_columns(rows, csv_source, names=("", "")):
    complete = [(x, y) for x, y in rows if not _is_missing(x) and not _is_missing(y)]
    response = {"total": len(rows), "complete": len(complete), "kind": "pairs", "points": []}
    if not complete:
        return response

    identifier_axes = [index for index, name in enumerate(names) if is_identifier(name)]
    for time_axis in (0, 1):
        hours = [timestamp_hour(row[time_axis]) for row in complete]
        if all(hour is not None for hour in hours):
            other_axis = 1 - time_axis
            if not all(timestamp_hour(row[other_axis]) is not None for row in complete):
                return {
                    **response, **hourly_counts(complete, time_axis, hours),
                    "prefer_distinct": other_axis in identifier_axes,
                }

    if len(identifier_axes) == 1:
        identifier = identifier_axes[0]
        values_by_group = defaultdict(set)
        counts = Counter()
        for row in complete:
            group = _canonical(row[1 - identifier])
            values_by_group[group].add(_canonical(row[identifier]))
            counts[group] += 1
        groups = sorted(counts, key=lambda group: len(values_by_group[group]), reverse=True)[:10]
        return {
            **response, "kind": "distinct", "numeric_axis": identifier, "groups": len(counts),
            "points": [
                {"label": chart_label(group), "value": len(values_by_group[group]), "count": counts[group]}
                for group in groups
            ],
        }

    types = suggest_column_types(["x", "y"], rows, csv_source)
    numeric = {}
    for index, name in enumerate(("x", "y")):
        if index not in identifier_axes and types[name] in {"INTEGER", "DECIMAL"}:
            values = [float(Decimal(str(row[index]).strip())) for row in complete]
            if all(isfinite(value) for value in values):
                numeric[index] = values

    if len(numeric) == 2:
        limit = min(500, len(complete))
        indices = [index * (len(complete) - 1) // max(1, limit - 1) for index in range(limit)]
        return {
            **response, "kind": "scatter",
            "extent": [[min(numeric[i]), max(numeric[i])] for i in (0, 1)],
            "points": [{"x": numeric[0][i], "y": numeric[1][i]} for i in indices],
        }

    if numeric:
        numeric_index, values = next(iter(numeric.items()))
        totals = defaultdict(Decimal)
        counts = Counter()
        for row, value in zip(complete, values):
            group = _canonical(row[1 - numeric_index])
            totals[group] += Decimal(str(value))
            counts[group] += 1
        return {
            **response, "kind": "average", "numeric_axis": numeric_index, "groups": len(counts),
            "points": [
                {"label": chart_label(group), "value": float(totals[group] / count), "count": count}
                for group, count in counts.most_common(10)
            ],
        }

    counts = Counter((_canonical(x), _canonical(y)) for x, y in complete)
    return {
        **response, "groups": len(counts),
        "points": [
            {"label": chart_label(x), "second_label": chart_label(y), "value": count}
            for (x, y), count in counts.most_common(10)
        ],
    }
