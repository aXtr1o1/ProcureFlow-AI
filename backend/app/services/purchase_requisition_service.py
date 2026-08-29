from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database.models import (
    BusinessNeed,
    PurchaseRequisition,
    PurchaseRequisitionApproval,
    PurchaseRequisitionLine,
)
from app.services.audit_service import AuditService

class PurchaseRequisitionService:
    def __init__(self, db: Session):
        self.db = db

    def _with_details(self):
        return self.db.query(PurchaseRequisition).options(
            joinedload(PurchaseRequisition.line_items),
            joinedload(PurchaseRequisition.approvals),
        )

    def create(self, data, requester_id: int) -> PurchaseRequisition:
        business_need = self.db.query(BusinessNeed).filter(BusinessNeed.id == data.business_need_id).first()
        if business_need is None:
            raise HTTPException(status_code=404, detail="Business Need not found.")
        if business_need.status in {"Rejected", "Cancelled", "Closed"}:
            raise HTTPException(status_code=409, detail="A PR cannot be created for this Business Need.")

        pr = PurchaseRequisition(
            pr_number="PENDING",
            business_need_id=business_need.id,
            requester_id=requester_id,
            title=data.title,
            justification=data.justification,
            department=business_need.department,
            business_unit=business_need.business_unit,
            project=business_need.project,
            location=business_need.location,
            cost_center=business_need.cost_center,
            currency=business_need.currency,
            status="Draft",
        )
        self.db.add(pr)
        self.db.flush()
        pr.pr_number = f"PR-{datetime.utcnow():%Y}-{pr.id:05d}"

        total = 0.0
        for item in data.line_items:
            amount = round(item.quantity * item.unit_price, 2)
            total += amount
            self.db.add(PurchaseRequisitionLine(
                purchase_requisition_id=pr.id,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                amount=amount,
            ))
        pr.total_amount = round(total, 2)
        self.db.commit()

        AuditService(self.db).log(
            user_id=requester_id,
            action="CREATE",
            module="Purchase Requisition",
            status="SUCCESS",
            message=f"Purchase Requisition {pr.pr_number} created.",
        )

        return self.get_by_id(pr.id)

    def list(self):
        return self._with_details().order_by(PurchaseRequisition.id.desc()).all()

    def get_by_id(self, pr_id: int) -> PurchaseRequisition:
        pr = self._with_details().filter(PurchaseRequisition.id == pr_id).first()
        if pr is None:
            raise HTTPException(status_code=404, detail="Purchase Requisition not found.")
        return pr

    def submit(
        self,
        pr_id: int,
        user_id: int,
    ) -> PurchaseRequisition:

        pr = self.get_by_id(pr_id)

        if pr.status != "Draft":
            raise HTTPException(
                status_code=409,
                detail="Only draft PRs can be submitted."
            )

        pr.status = "Submitted"

        self.db.commit()

        AuditService(self.db).log(
            user_id=user_id,
            action="SUBMIT",
            module="Purchase Requisition",
            status="SUCCESS",
            message=f"Purchase Requisition {pr.pr_number} submitted.",
        )

        return self.get_by_id(pr.id)

    def decide(
        self,
        pr_id: int,
        reviewer_id: int,
        decision: str,
        remarks: str | None
    ) -> PurchaseRequisition:

        if decision not in {"Approved", "Rejected"}:
            raise HTTPException(
                status_code=422,
                detail="Decision must be Approved or Rejected."
            )

        pr = self.get_by_id(pr_id)

        if pr.status != "Submitted":
            raise HTTPException(
                status_code=409,
                detail="Only submitted PRs can be approved or rejected."
            )

        pr.status = decision

        self.db.add(
            PurchaseRequisitionApproval(
                purchase_requisition_id=pr.id,
                reviewer_id=reviewer_id,
                decision=decision,
                remarks=remarks,
            )
        )

        self.db.commit()

        AuditService(self.db).log(
            user_id=reviewer_id,
            action=decision.upper(),
            module="Purchase Requisition",
            status="SUCCESS",
            message=f"Purchase Requisition {pr.pr_number} {decision.lower()}.",
        )

        return self.get_by_id(pr.id)

    def select_vendor(
        self,
        pr_id: int,
        vendor_name: str,
        user_id: int,
    ) -> PurchaseRequisition:

        pr = self.get_by_id(pr_id)

        if pr.status != "Approved":
            raise HTTPException(
                status_code=409,
                detail="Approve the PR before selecting a vendor."
            )

        if pr.purchase_orders:
            raise HTTPException(
                status_code=409,
                detail="A vendor cannot be changed after PO creation."
            )

        if pr.negotiated_amount is not None:
            raise HTTPException(
                status_code=409,
                detail="Vendor cannot be changed after negotiation has been recorded."
            )

        vendor_name = vendor_name.strip()

        if not vendor_name:
            raise HTTPException(
                status_code=422,
                detail="Vendor name cannot be empty."
            )

        pr.selected_vendor_name = vendor_name

        self.db.commit()

        AuditService(self.db).log(
            user_id=user_id,
            action="VENDOR_SELECTION",
            module="Purchase Requisition",
            status="SUCCESS",
            message=(
                f"Vendor '{vendor_name}' selected for "
                f"Purchase Requisition {pr.pr_number}."
            ),
        )

        return self.get_by_id(pr.id)

    def record_negotiation(
        self,
        pr_id: int,
        negotiated_amount: float,
        remarks: str | None,
        user_id: int,
    ) -> PurchaseRequisition:

        pr = self.get_by_id(pr_id)

        # ======================================================
        # Validate PR workflow state
        # ======================================================

        if pr.status != "Approved":
            raise HTTPException(
                status_code=409,
                detail=(
                    "Negotiation can only be recorded for an "
                    "approved Purchase Requisition."
                ),
            )

        # ======================================================
        # Validate vendor selection
        # ======================================================

        if not pr.selected_vendor_name:
            raise HTTPException(
                status_code=409,
                detail="Select a vendor before recording negotiation.",
            )

        # ======================================================
        # Validate negotiated amount
        # ======================================================

        if negotiated_amount <= 0:
            raise HTTPException(
                status_code=422,
                detail="Negotiated amount must be greater than zero.",
            )

        original_amount = pr.total_amount or 0

        if original_amount <= 0:
            raise HTTPException(
                status_code=409,
                detail="PR total amount must be greater than zero.",
            )

        if negotiated_amount > original_amount:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Negotiated amount cannot exceed "
                    "the original PR amount."
                ),
            )

        # ======================================================
        # Calculate price variance
        # ======================================================

        price_variance = round(
            original_amount - negotiated_amount,
            2,
        )

        price_variance_percentage = round(
            (price_variance / original_amount) * 100,
            2,
        )

        # ======================================================
        # Record negotiation
        # ======================================================

        pr.negotiated_amount = negotiated_amount
        pr.price_variance = price_variance
        pr.price_variance_percentage = price_variance_percentage
        pr.negotiation_remarks = remarks
        pr.negotiated_at = datetime.utcnow()
        pr.negotiated_by_id = user_id

        self.db.commit()

        AuditService(self.db).log(
            user_id=user_id,
            action="NEGOTIATION",
            module="Purchase Requisition",
            status="SUCCESS",
            message=(
                f"Negotiation recorded for Purchase Requisition "
                f"{pr.pr_number}. Negotiated amount: "
                f"{negotiated_amount} {pr.currency}."
            ),
        )

        return self.get_by_id(pr.id)