from fastapi import APIRouter

from app.api.routes.analysis import router as analysis_router
from app.api.routes.auth import router as auth_router
from app.api.routes.files import router as files_router
from app.api.routes.health import router as health_router
from app.api.routes.processing import router as processing_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(files_router)
api_router.include_router(processing_router)
api_router.include_router(analysis_router)
