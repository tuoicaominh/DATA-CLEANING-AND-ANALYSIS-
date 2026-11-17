from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db.base import Base
from app.db.session import engine
from app.api.routes import api_router
from app.models import cleaning_action, data_file, file_column, output_file, processing_job, user  # noqa: F401
from app.core.config import settings
from app.db.migrations import migrate_legacy_uploaded_files


@asynccontextmanager
async def lifespan(app: FastAPI):
    (settings.storage_root / "uploads").mkdir(parents=True, exist_ok=True)
    (settings.storage_root / "outputs").mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    migrate_legacy_uploaded_files(engine, settings.storage_root)
    yield


app = FastAPI(title="Data Cleaning API", version="0.1.0", lifespan=lifespan)
app.include_router(api_router, prefix="/api")
