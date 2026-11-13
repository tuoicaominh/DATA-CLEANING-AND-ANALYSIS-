from pydantic import BaseModel, EmailStr, Field, model_validator


class SignInRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=12, max_length=128)
    confirm_password: str = Field(min_length=12, max_length=128)

    @model_validator(mode="after")
    def passwords_must_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Mật khẩu xác nhận không khớp.")
        self.full_name = self.full_name.strip()
        if len(self.full_name) < 2:
            raise ValueError("Tên hiển thị cần ít nhất 2 ký tự.")
        return self


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str


class SignInResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
