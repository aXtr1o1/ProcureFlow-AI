from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database.models import BusinessNeed, BusinessNeedType


BUSINESS_NEED_TYPES = (
    ("LEASE_FACILITATION_ONBOARDING", "Lease Facilitation & Onboarding"),
    ("UNIT_FIT_OUT_INSPECTION_HANDOVER", "Unit Fit-Out Inspection & Handover"),
    ("PROPERTY_MANAGEMENT_SETUP", "Property Management Setup"),
    ("ACCESS_CARDS_PARKING_PERMITS", "Access Cards & Parking Permits"),
)


def seed_business_need_types(db: Session) -> None:
    """Create the approved master values without changing existing values."""
    changed = False

    for sort_order, (code, name) in enumerate(
        BUSINESS_NEED_TYPES,
        start=1
    ):
        existing = (
            db.query(BusinessNeedType)
            .filter(BusinessNeedType.code == code)
            .first()
        )

        if existing is None:
            db.add(
                BusinessNeedType(
                    code=code,
                    name=name,
                    sort_order=sort_order
                )
            )
            changed = True

    if changed:
        db.commit()


class BusinessNeedService:

    def __init__(self, db: Session):
        self.db = db

    def list_types(self):
        seed_business_need_types(self.db)

        return (
            self.db.query(BusinessNeedType)
            .filter(BusinessNeedType.is_active.is_(True))
            .order_by(BusinessNeedType.sort_order.asc())
            .all()
        )

    def create(
        self,
        data,
        requester_id: int
    ) -> BusinessNeed:

        need_type = (
            self.db.query(BusinessNeedType)
            .filter(
                BusinessNeedType.id == data.business_need_type_id,
                BusinessNeedType.is_active.is_(True),
            )
            .first()
        )

        if need_type is None:
            raise HTTPException(
                status_code=422,
                detail="Select an active Business Need type."
            )

        business_need = BusinessNeed(
            business_need_type_id=need_type.id,
            requester_id=requester_id,
            title=data.title,
            description=data.description,
            department=data.department,
            business_unit=data.business_unit,
            project=data.project,
            location=data.location,
            cost_center=data.cost_center,
            required_by_date=data.required_by_date,
            estimated_value=data.estimated_value,
            currency=data.currency.upper(),
            status="Draft",
            need_number="PENDING",
        )

        self.db.add(business_need)
        self.db.flush()

        business_need.need_number = (
            f"BN-{datetime.utcnow():%Y}-{business_need.id:05d}"
        )

        self.db.commit()

        return self.get_by_id(business_need.id)

    def list(self):
        return (
            self.db.query(BusinessNeed)
            .options(
                joinedload(BusinessNeed.business_need_type)
            )
            .order_by(BusinessNeed.id.desc())
            .all()
        )

    def get_by_id(
        self,
        business_need_id: int
    ) -> BusinessNeed:

        business_need = (
            self.db.query(BusinessNeed)
            .options(
                joinedload(BusinessNeed.business_need_type)
            )
            .filter(
                BusinessNeed.id == business_need_id
            )
            .first()
        )

        if business_need is None:
            raise HTTPException(
                status_code=404,
                detail="Business Need not found."
            )

        return business_need

    # ======================================================
    # Update Business Need
    # ======================================================
    def update(
        self,
        business_need_id: int,
        data
    ) -> BusinessNeed:

        business_need = self.get_by_id(
            business_need_id
        )

        if business_need.status != "Draft":
            raise HTTPException(
                status_code=409,
                detail="Only draft Business Needs can be updated."
            )

        need_type = (
            self.db.query(BusinessNeedType)
            .filter(
                BusinessNeedType.id == data.business_need_type_id,
                BusinessNeedType.is_active.is_(True),
            )
            .first()
        )

        if need_type is None:
            raise HTTPException(
                status_code=422,
                detail="Select an active Business Need type."
            )

        business_need.business_need_type_id = (
            data.business_need_type_id
        )
        business_need.title = data.title
        business_need.description = data.description
        business_need.department = data.department
        business_need.business_unit = data.business_unit
        business_need.project = data.project
        business_need.location = data.location
        business_need.cost_center = data.cost_center
        business_need.required_by_date = data.required_by_date
        business_need.estimated_value = data.estimated_value
        business_need.currency = data.currency.upper()

        self.db.commit()

        return self.get_by_id(
            business_need.id
        )

    # ======================================================
    # Submit Business Need
    # ======================================================
    def submit(
        self,
        business_need_id: int
    ) -> BusinessNeed:

        business_need = self.get_by_id(
            business_need_id
        )

        if business_need.status != "Draft":
            raise HTTPException(
                status_code=409,
                detail="Only draft Business Needs can be submitted."
            )

        business_need.status = "Submitted"

        self.db.commit()

        return self.get_by_id(
            business_need.id
        )