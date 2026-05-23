from pydantic import BaseModel, EmailStr, Field
from uuid import UUID


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserRead(BaseModel):
    id: UUID
    email: str

    class Config:
        from_attributes = True
