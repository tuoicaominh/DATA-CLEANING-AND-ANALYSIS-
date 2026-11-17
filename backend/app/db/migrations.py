import hashlib
import uuid
from pathlib import Path

from sqlalchemy import Engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from app.models.data_file import DataFile
from app.models.file_column import FileColumn
from app.modules.processing.data_io import profile_dataset, read_dataset


def migrate_legacy_uploaded_files(engine: Engine, storage_root: Path) -> None:
    """Copy legacy BYTEA uploads to the ERD file store without deleting source rows."""
    if "uploaded_files" not in inspect(engine).get_table_names():
        return

    uploads_root = storage_root / "uploads"
    uploads_root.mkdir(parents=True, exist_ok=True)
    legacy_columns = {column["name"] for column in inspect(engine).get_columns("uploaded_files")}
    required_columns = {"id", "owner_id", "original_name", "extension", "size_bytes", "content", "created_at"}
    if not required_columns.issubset(legacy_columns):
        return
    optional_columns = [name for name in ("client_id", "sha256") if name in legacy_columns]
    selected_columns = ["id", "owner_id", "original_name", "extension", "size_bytes", "content", "created_at", *optional_columns]
    select_sql = "SELECT " + ", ".join(selected_columns) + " FROM uploaded_files ORDER BY id"
    with engine.connect() as connection:
        legacy_rows = connection.execute(text(select_sql)).mappings().all()

    SessionFactory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, class_=Session)
    with SessionFactory() as db:
        for legacy in legacy_rows:
            if db.get(DataFile, legacy["id"]) is not None:
                continue

            extension = (legacy["extension"] or Path(legacy["original_name"]).suffix.lstrip(".") or "bin").lower()
            safe_extension = "".join(char for char in extension if char.isalnum())[:12] or "bin"
            relative_path = Path("uploads") / str(legacy["owner_id"]) / f"legacy-{legacy['id']}.{safe_extension}"
            destination = storage_root / relative_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            content = legacy["content"]
            if not destination.exists():
                destination.write_bytes(content)

            row_count = None
            column_count = None
            profiles = []
            file_status = "READY"
            try:
                headers, rows = read_dataset(destination, safe_extension)
                row_count = len(rows)
                column_count = len(headers)
                profiles = profile_dataset(headers, rows)
            except Exception:
                file_status = "PROFILE_ERROR"

            client_id = legacy.get("client_id") or str(uuid.uuid5(uuid.NAMESPACE_URL, f"legacy:{legacy['owner_id']}:{legacy['id']}"))
            data_file = DataFile(
                id=legacy["id"],
                user_id=legacy["owner_id"],
                original_name=legacy["original_name"],
                stored_path=relative_path.as_posix(),
                file_format=safe_extension,
                file_size=legacy["size_bytes"] or len(content),
                row_count=row_count,
                column_count=column_count,
                status=file_status,
                client_id=client_id,
                sha256=legacy.get("sha256") or hashlib.sha256(content).hexdigest(),
                uploaded_at=legacy["created_at"],
            )
            db.add(data_file)
            db.flush()
            db.add_all([
                FileColumn(
                    file_id=data_file.id,
                    ordinal_position=index,
                    column_name=profile["column_name"],
                    inferred_type=profile["inferred_type"],
                    missing_count=profile["missing_count"],
                    distinct_count=profile["distinct_count"],
                )
                for index, profile in enumerate(profiles, start=1)
            ])
            db.commit()

        with engine.begin() as connection:
            connection.execute(text(
                "SELECT setval(pg_get_serial_sequence('data_files', 'id'), "
                "GREATEST(COALESCE((SELECT MAX(id) FROM data_files), 1), 1), "
                "EXISTS (SELECT 1 FROM data_files))"
            ))
