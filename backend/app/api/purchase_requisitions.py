from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.database import get_db
from app.database.models import User
from app.schemas.purchase_requisition_schema import (
    PurchaseRequisitionCreate,
    PurchaseRequisitionDecisionRequest,
    PurchaseRequisitionResponse,
    VendorSelectionRequest,
    NegotiationOutcomeRequest,
)
from app.services.purchase_requisition_service import PurchaseRequisitionService


router = APIRouter(
    prefix="/purchase-requisitions",
    tags=["Purchase Requisitions"],
)


# ==========================================================
# Create Purchase Requisition
# ==========================================================

@router.post(
    "/",
    response_model=PurchaseRequisitionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_purchase_requisition(
    request: PurchaseRequisitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PurchaseRequisitionService(db).create(
        request,
        current_user.id,
    )


# ==========================================================
# List Purchase Requisitions
# ==========================================================

@router.get(
    "/",
    response_model=list[PurchaseRequisitionResponse],
)
def list_purchase_requisitions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PurchaseRequisitionService(db).list()


# ==========================================================
# Get Purchase Requisition
# ==========================================================

@router.get(
    "/{pr_id}",
    response_model=PurchaseRequisitionResponse,
)
def get_purchase_requisition(
    pr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PurchaseRequisitionService(db).get_by_id(pr_id)


# ==========================================================
# Submit Purchase Requisition
# ==========================================================

@router.post(
    "/{pr_id}/submit",
    response_model=PurchaseRequisitionResponse,
)
def submit_purchase_requisition(
    pr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PurchaseRequisitionService(db).submit(
        pr_id,
        current_user.id,
    )


# ==========================================================
# Approve Purchase Requisition
# ==========================================================

@router.post(
    "/{pr_id}/approve",
    response_model=PurchaseRequisitionResponse,
)
def approve_purchase_requisition(
    pr_id: int,
    request: PurchaseRequisitionDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PurchaseRequisitionService(db).decide(
        pr_id,
        current_user.id,
        "Approved",
        request.remarks,
    )


# ==========================================================
# Reject Purchase Requisition
# ==========================================================

@router.post(
    "/{pr_id}/reject",
    response_model=PurchaseRequisitionResponse,
)
def reject_purchase_requisition(
    pr_id: int,
    request: PurchaseRequisitionDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PurchaseRequisitionService(db).decide(
        pr_id,
        current_user.id,
        "Rejected",
        request.remarks,
    )


# ==========================================================
# Select Vendor
# ==========================================================

@router.post(
    "/{pr_id}/select-vendor",
    response_model=PurchaseRequisitionResponse,
)
def select_vendor(
    pr_id: int,
    request: VendorSelectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PurchaseRequisitionService(db).select_vendor(
        pr_id=pr_id,
        vendor_name=request.vendor_name,
        user_id=current_user.id,
    )


# ==========================================================
# Record Negotiation
# ==========================================================

@router.post(
    "/{pr_id}/negotiation",
    response_model=PurchaseRequisitionResponse,
)
def record_negotiation(
    pr_id: int,
    request: NegotiationOutcomeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PurchaseRequisitionService(db).record_negotiation(
        pr_id=pr_id,
        negotiated_amount=request.negotiated_amount,
        remarks=request.remarks,
        user_id=current_user.id,
    )