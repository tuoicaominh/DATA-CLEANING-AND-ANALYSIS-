from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories import user_repository as repository
from app.utils.security import create_access_token, hash_password, verify_password
from app.validators.auth import SignInResponse, UserResponse


class EmailAlreadyRegistered(Exception):
    pass


def register_user(db: Session, *, email: str, full_name: str, password: str) -> User:
    normalized_email = email.strip().lower()
    if repository.get_user_by_email(db, normalized_email) is not None:
        raise EmailAlreadyRegistered
    try:
        return repository.create_user(
            db,
            email=normalized_email,
            full_name=full_name.strip(),
            hashed_password=hash_password(password),
        )
    except IntegrityError as exc:
        db.rollback()
        if getattr(exc.orig, "sqlstate", None) == "23505":
            raise EmailAlreadyRegistered from exc
        raise


def sign_in(db: Session, email: str, password: str) -> SignInResponse | None:
    user = repository.get_user_by_email(db, email)
    if user is None or not user.is_active or not verify_password(password, user.hashed_password):
        return None
    return SignInResponse(
        access_token=create_access_token(str(user.id)),
        user=UserResponse(id=user.id, email=user.email, full_name=user.full_name),
    )


def get_current_user(db: Session, user_id: int) -> User | None:
    user = repository.get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        return None
    return user
