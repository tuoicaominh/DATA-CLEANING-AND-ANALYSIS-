from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.authentication import service
from app.models.user import User
from app.validators.auth import RegisterRequest, SignInRequest, SignInResponse, UserResponse


def register(db: Session, payload: RegisterRequest) -> UserResponse:
    try:
        user = service.register_user(
            db,
            email=str(payload.email),
            full_name=payload.full_name,
            password=payload.password,
        )
    except service.EmailAlreadyRegistered:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email này đã được sử dụng.",
        ) from None
    return UserResponse(id=user.id, email=user.email, full_name=user.full_name)


def sign_in(db: Session, payload: SignInRequest) -> SignInResponse:
    result = service.sign_in(db, str(payload.email), payload.password)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return result


def current_user_response(user: User) -> UserResponse:
    return UserResponse(id=user.id, email=user.email, full_name=user.full_name)
