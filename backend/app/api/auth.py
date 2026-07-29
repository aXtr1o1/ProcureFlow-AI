from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.models import User

from app.database.database import get_db
from app.services.auth_service import AuthService
from app.schemas.auth_schema import (
    RegisterRequest,
    LoginRequest,
    LoginResponse,
    UserResponse
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/register", response_model=UserResponse)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):

    try:

        return AuthService.register(
            db=db,
            username=request.username,
            email=request.email,
            password=request.password
        )

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

@router.post("/login", response_model=LoginResponse)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):

    try:

        token = AuthService.login(
            db=db,
            username=request.username,
            password=request.password
        )

        return {
            "success": True,
            "access_token": token["access_token"],
            "token_type": "bearer",
            "message": "Login successful."
        }

    except Exception as e:

        raise HTTPException(
            status_code=401,
            detail=str(e)
        )

@router.get("/me", response_model=UserResponse)
def me(
    current_user: User = Depends(get_current_user)
):

    return current_user

@router.post("/logout")
def logout():

    return {
        "message": "Logout successful."
    }