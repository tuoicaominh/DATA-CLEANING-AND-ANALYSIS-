from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.controllers import auth_controller
from app.api.middlewares.authentication import require_current_user
from app.db.session import get_db
from app.models.user import User
from app.validators.auth import RegisterRequest, SignInRequest, SignInResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    return auth_controller.register(db, payload)


@router.post("/sign-in", response_model=SignInResponse)
def sign_in(payload: SignInRequest, db: Session = Depends(get_db)):
    return auth_controller.sign_in(db, payload)


@router.get("/me", response_model=UserResponse)
def read_current_user(user: User = Depends(require_current_user)):
    return auth_controller.current_user_response(user)
