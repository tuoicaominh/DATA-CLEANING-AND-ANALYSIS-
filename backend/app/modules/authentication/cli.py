from getpass import getpass

from pydantic import ValidationError

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.modules.authentication.service import EmailAlreadyRegistered, register_user
from app.validators.auth import RegisterRequest


def main():
    Base.metadata.create_all(bind=engine)
    email = input("Email: ").strip().lower()
    full_name = input("Tên hiển thị: ").strip()
    password = getpass("Mật khẩu (ít nhất 12 ký tự): ")
    confirmation = getpass("Nhập lại mật khẩu: ")
    try:
        payload = RegisterRequest(
            email=email,
            full_name=full_name,
            password=password,
            confirm_password=confirmation,
        )
    except ValidationError as exc:
        raise SystemExit(exc.errors()[0]["msg"]) from exc

    with SessionLocal() as db:
        try:
            user = register_user(
                db,
                email=str(payload.email),
                full_name=payload.full_name,
                password=payload.password,
            )
        except EmailAlreadyRegistered as exc:
            raise SystemExit("Email này đã có tài khoản.") from exc
    print(f"Đã tạo tài khoản cho {user.email}.")


if __name__ == "__main__":
    main()
