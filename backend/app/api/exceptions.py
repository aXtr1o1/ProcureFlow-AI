from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.database import get_db
from app.database.models import User
from app.schemas.exception_schema import (
    ExceptionAssignmentRequest,
    ExceptionResolutionRequest,
    InvoiceExceptionResponse,
)
from app.services.exception_service import ExceptionService

router = APIRouter(prefix="/exceptions", tags=["Invoice Exceptions"])

@router.get(
        "/", 
        response_model=list[InvoiceExceptionResponse]
    )
def list_exceptions(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExceptionService(db).list(status)


@router.get(
        "/{exception_id}", 
        response_model=InvoiceExceptionResponse
    )
def get_exception(
    exception_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExceptionService(db).get_by_id(exception_id)


@router.post(
        "/{exception_id}/assign", 
        response_model=InvoiceExceptionResponse
    )
def assign_exception(
    exception_id: int,
    request: ExceptionAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExceptionService(db).assign(exception_id, request.assigned_to_id)


@router.post(
        "/{exception_id}/resolve", 
        response_model=InvoiceExceptionResponse
    )
def resolve_exception(
    exception_id: int,
    request: ExceptionResolutionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExceptionService(db).resolve(exception_id, current_user.id, request.remarks)


@router.post(
        "/{exception_id}/approve-override", 
        response_model=InvoiceExceptionResponse
    )
def approve_exception_override(
    exception_id: int,
    request: ExceptionResolutionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExceptionService(db).approve_override(exception_id, current_user.id, request.remarks)
