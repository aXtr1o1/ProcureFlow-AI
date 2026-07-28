from typing import Optional, List
from sqlalchemy.orm import Session

from app.database.models import PORecord


class PurchaseOrderService:
    """
    Service responsible for Purchase Order operations.
    """

    def __init__(self, db: Session):
        self.db = db

    # --------------------------------------------------
    # Get PO by PO Number
    # --------------------------------------------------
    def get_purchase_order_by_number(
        self,
        po_number: str
    ) -> Optional[PORecord]:

        if not po_number:
            return None

        return (
            self.db.query(PORecord)
            .filter(PORecord.po_number == po_number)
            .first()
        )

    def get_purchase_order_by_invoice(
        self,
        invoice_id: int
    ) -> Optional[PORecord]:

        return (
            self.db.query(PORecord)
            .filter(PORecord.invoice_id == invoice_id)
            .first()
        )

    # --------------------------------------------------
    # Get PO by Customer Name
    # (Fallback when invoice doesn't contain PO Number)
    # --------------------------------------------------
    def get_purchase_order_by_customer(
        self,
        customer_name: str
    ) -> Optional[PORecord]:

        if not customer_name:
            return None

        return (
            self.db.query(PORecord)
            .filter(PORecord.customer_name == customer_name)
            .first()
        )

    # --------------------------------------------------
    # Get PO by Vendor Name
    # --------------------------------------------------
    def get_purchase_order_by_vendor(
        self,
        vendor_name: str
    ) -> List[PORecord]:

        return (
            self.db.query(PORecord)
            .filter(PORecord.vendor_name == vendor_name)
            .all()
        )

    # --------------------------------------------------
    # Get All Purchase Orders
    # --------------------------------------------------
    def get_all_purchase_orders(self) -> List[PORecord]:

        return (
            self.db.query(PORecord)
            .order_by(PORecord.id.desc())
            .all()
        )

    def purchase_order_exists(
        self,
        po_number: str
    ) -> bool:

        return (
            self.db.query(PORecord)
            .filter(PORecord.po_number == po_number)
            .first()
            is not None
        )

    # --------------------------------------------------
    # Create Purchase Order
    # --------------------------------------------------
    def create_purchase_order(
        self,
        po_data: dict
    ) -> PORecord:

        if self.purchase_order_exists(po_data.get("po_number")):
            raise ValueError("Purchase Order already exists.")

        purchase_order = PORecord(
            invoice_id=po_data.get("invoice_id"),
            po_number=po_data.get("po_number"),
            vendor_name=po_data.get("vendor_name"),
            customer_name=po_data.get("customer_name"),
            currency=po_data.get("currency"),
            subtotal=po_data.get("subtotal"),
            tax=po_data.get("tax"),
            total_amount=po_data.get("total_amount"),
            blob_name=po_data.get("blob_name"),
            blob_url=po_data.get("blob_url"),
            status=po_data.get("status", "Approved")
        )

        try:
            self.db.add(purchase_order)
            self.db.commit()
            self.db.refresh(purchase_order)

        except Exception:
            self.db.rollback()
            raise

        return purchase_order

    # --------------------------------------------------
    # Update Purchase Order Status
    # --------------------------------------------------
    def update_status(
        self,
        po_id: int,
        status: str
    ) -> Optional[PORecord]:

        purchase_order = (
            self.db.query(PORecord)
            .filter(PORecord.id == po_id)
            .first()
        )

        if purchase_order is None:
            return None

        purchase_order.status = status

        self.db.commit()
        self.db.refresh(purchase_order)

        return purchase_order

    # --------------------------------------------------
    # Delete Purchase Order
    # --------------------------------------------------
    def delete_purchase_order(
        self,
        po_id: int
    ) -> bool:

        purchase_order = (
            self.db.query(PORecord)
            .filter(PORecord.id == po_id)
            .first()
        )

        if purchase_order is None:
            return False

        self.db.delete(purchase_order)
        self.db.commit()

        return True