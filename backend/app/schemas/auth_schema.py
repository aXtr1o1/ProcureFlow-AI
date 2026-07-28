from pydantic import BaseModel, EmailStr


# ==========================================================
# Register
# ==========================================================

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


# ==========================================================
# Login
# ==========================================================

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    access_token: str
    token_type: str = "bearer"
    message: str


# ==========================================================
# User Response
# ==========================================================

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr

    class Config:
        from_attributes = True