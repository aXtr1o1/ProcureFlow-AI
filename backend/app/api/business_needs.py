from fastapi import APIRouter, Depends, status

from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.database import get_db
from app.database.models import User
from app.schemas.business_need_schema import (
    BusinessNeedCreate,
    BusinessNeedResponse,
    BusinessNeedTypeResponse,
)
from app.services.business_need_service import BusinessNeedService


router = APIRouter(
    prefix="/business-needs",
    tags=["Business Needs"]
)


@router.get(
    "/types",
    response_model=list[BusinessNeedTypeResponse]
)
def list_business_need_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return BusinessNeedService(db).list_types()


@router.post(
    "/",
    response_model=BusinessNeedResponse,
    status_code=status.HTTP_201_CREATED
)
def create_business_need(
    request: BusinessNeedCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return BusinessNeedService(db).create(
        request,
        current_user.id
    )


@router.get(
    "/",
    response_model=list[BusinessNeedResponse]
)
def list_business_needs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return BusinessNeedService(db).list(
        current_user.id
    )


@router.get(
    "/{business_need_id}",
    response_model=BusinessNeedResponse
)
def get_business_need(
    business_need_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return BusinessNeedService(db).get_by_id(
        business_need_id,
        current_user.id,
    )


@router.put(
    "/{business_need_id}",
    response_model=BusinessNeedResponse
)
def update_business_need(
    business_need_id: int,
    request: BusinessNeedCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return BusinessNeedService(db).update(
        business_need_id,
        request,
        current_user.id,
    )


@router.post(
    "/{business_need_id}/submit",
    response_model=BusinessNeedResponse
)
def submit_business_need(
    business_need_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return BusinessNeedService(db).submit(
        business_need_id,
        current_user.id,
    )