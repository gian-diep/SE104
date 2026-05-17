from pydantic import BaseModel
from pydantic import EmailStr


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    university: str | None = None


class RegisterResponse(BaseModel):
    id: int
    username: str
    email: str
    university: str | None = None
    role: str

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    id: int
    username: str
    email: str
    university: str | None = None
    role: str

    class Config:
        from_attributes = True