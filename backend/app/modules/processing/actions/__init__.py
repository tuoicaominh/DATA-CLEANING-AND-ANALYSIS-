from app.modules.processing.actions import missing_values, normalize_format, remove_duplicates


HANDLERS = {
    "missing_values": missing_values.apply,
    "remove_duplicates": remove_duplicates.apply,
    "normalize_format": normalize_format.apply,
}
