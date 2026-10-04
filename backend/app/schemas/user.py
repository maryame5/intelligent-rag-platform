import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: UserRole
    display_name: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    display_name: str | None = None


class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str


class AdminRoleUpdate(BaseModel):
    role: UserRole


class AdminUserListItem(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: UserRole
    display_name: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
