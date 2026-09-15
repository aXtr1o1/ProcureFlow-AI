"""
Operational assistant intents answered from the live DB
(not Azure invoice document search).
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.database.models import (
    BusinessNeed,
    Invoice,
    ProcurementPurchaseOrder,
    PurchaseRequisition,
)
from app.services.currency_service import to_usd


PENDING_INVOICE_STATUSES = {
    "Pending Validation",
    "Approval Pending",
    "Validation Completed",
}


def detect_intent(message: str) -> Optional[str]:
    text = (message or "").strip().lower()
    if not text:
        return None

    if (
        "pending approval" in text
        or "pending approvals" in text
        or "awaiting approval" in text
        or re.search(r"\bapprovals?\b", text)
        and "pending" in text
    ):
        return "pending_approvals"

    if "duplicate" in text:
        return "duplicates"

    if (
        "this month" in text
        or "summarize invoice" in text
        or "invoice summary" in text
        or "summarise invoice" in text
    ):
        return "month_summary"

    if (
        "deadline" in text
        or "due date" in text
        or "upcoming due" in text
        or "overdue" in text
    ):
        return "deadlines"

    return None


def _usd(amount: Any, currency: Any) -> float:
    try:
        return float(to_usd(amount, currency))
    except Exception:
        try:
            return round(float(amount or 0), 2)
        except (TypeError, ValueError):
            return 0.0


def _fmt_usd(amount: float) -> str:
    return f"${amount:,.2f}"


def _line(prefix: str, items: List[str], empty: str) -> str:
    if not items:
        return f"- {prefix}: {empty}"
    body = "\n".join(f"  - {item}" for item in items)
    return f"- {prefix} ({len(items)}):\n{body}"


class AssistantOpsService:
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id

    def answer(self, intent: str) -> Tuple[str, str]:
        """
        Returns (answer_text, search_query_label).
        """
        if intent == "pending_approvals":
            return self.pending_approvals(), "pending approvals (database)"
        if intent == "duplicates":
            return self.duplicates(), "duplicate invoices (database)"
        if intent == "month_summary":
            return self.month_summary(), "invoices this month (database)"
        if intent == "deadlines":
            return self.deadlines(), "upcoming deadlines (database)"
        return (
            "I could not handle that operational request.",
            intent,
        )

    def pending_approvals(self) -> str:
        bns = (
            self.db.query(BusinessNeed)
            .filter(
                BusinessNeed.requester_id == self.user_id,
                BusinessNeed.status == "Submitted",
            )
            .order_by(BusinessNeed.id.desc())
            .limit(20)
            .all()
        )

        prs = (
            self.db.query(PurchaseRequisition)
            .filter(
                PurchaseRequisition.requester_id == self.user_id,
                PurchaseRequisition.status == "Submitted",
            )
            .order_by(PurchaseRequisition.id.desc())
            .limit(20)
            .all()
        )

        pos = (
            self.db.query(ProcurementPurchaseOrder)
            .join(
                PurchaseRequisition,
                ProcurementPurchaseOrder.purchase_requisition_id
                == PurchaseRequisition.id,
            )
            .filter(
                PurchaseRequisition.requester_id == self.user_id,
                ProcurementPurchaseOrder.status == "Pending Approval",
            )
            .order_by(ProcurementPurchaseOrder.id.desc())
            .limit(20)
            .all()
        )

        invoices = (
            self.db.query(Invoice)
            .filter(
                Invoice.user_id == self.user_id,
                Invoice.processing_status.in_(
                    list(PENDING_INVOICE_STATUSES)
                ),
            )
            .order_by(Invoice.id.desc())
            .limit(20)
            .all()
        )

        bn_lines = [
            (
                f"{bn.title or 'Business Need'} "
                f"(status {bn.status}, "
                f"{_fmt_usd(_usd(bn.estimated_value, bn.currency))} USD)"
            )
            for bn in bns
        ]
        pr_lines = [
            (
                f"{pr.pr_number} — {pr.title or 'PR'} "
                f"(status {pr.status}, "
                f"{_fmt_usd(_usd(pr.total_amount, pr.currency))} USD)"
            )
            for pr in prs
        ]
        po_lines = [
            (
                f"{po.po_number} — {po.vendor_name or 'Vendor'} "
                f"(status {po.status}, "
                f"{_fmt_usd(float(po.total_amount or 0))} USD)"
            )
            for po in pos
        ]
        inv_lines = [
            (
                f"{inv.invoice_number or f'Invoice #{inv.id}'} — "
                f"{inv.vendor_name or 'Vendor'} "
                f"(status {inv.processing_status}, "
                f"{_fmt_usd(_usd(inv.total_amount, inv.currency))} USD)"
            )
            for inv in invoices
        ]

        total = len(bns) + len(prs) + len(pos) + len(invoices)
        if total == 0:
            return (
                "There are **no pending approvals** in your queue right now.\n\n"
                "- Business Needs awaiting approval: none\n"
                "- Purchase Requisitions awaiting approval: none\n"
                "- Purchase Orders awaiting approval: none\n"
                "- Invoices awaiting approval/validation: none"
            )

        return "\n".join(
            [
                f"Here are **{total} pending approval item(s)** from your live records:",
                "",
                _line("Business Needs (Submitted)", bn_lines, "none"),
                _line(
                    "Purchase Requisitions (Submitted)",
                    pr_lines,
                    "none",
                ),
                _line(
                    "Purchase Orders (Pending Approval)",
                    po_lines,
                    "none",
                ),
                _line(
                    "Invoices (pending validation/approval)",
                    inv_lines,
                    "none",
                ),
                "",
                "Amounts are shown in **USD**.",
            ]
        )

    def duplicates(self) -> str:
        invoices = (
            self.db.query(Invoice)
            .filter(Invoice.user_id == self.user_id)
            .order_by(Invoice.id.desc())
            .limit(200)
            .all()
        )

        buckets: Dict[Tuple[str, float], List[Invoice]] = {}
        for inv in invoices:
            vendor = (inv.vendor_name or "").strip().lower()
            amount = round(_usd(inv.total_amount, inv.currency), 2)
            if not vendor:
                continue
            key = (vendor, amount)
            buckets.setdefault(key, []).append(inv)

        groups = [
            items for items in buckets.values() if len(items) >= 2
        ]

        if not groups:
            return (
                "No likely **duplicate invoices** found in your records "
                "(same vendor + same USD amount)."
            )

        lines = [
            f"Found **{len(groups)}** possible duplicate group(s):",
            "",
        ]
        for idx, group in enumerate(groups[:10], start=1):
            sample = group[0]
            vendor = sample.vendor_name or "Vendor"
            amount = _fmt_usd(
                _usd(sample.total_amount, sample.currency)
            )
            refs = ", ".join(
                (i.invoice_number or f"#{i.id}") for i in group[:6]
            )
            lines.append(
                f"{idx}. **{vendor}** @ {amount} USD — "
                f"{len(group)} invoices ({refs})"
            )

        return "\n".join(lines)

    def month_summary(self) -> str:
        now = datetime.utcnow()
        start = datetime(now.year, now.month, 1)

        invoices = (
            self.db.query(Invoice)
            .filter(
                Invoice.user_id == self.user_id,
                Invoice.created_at >= start,
            )
            .order_by(Invoice.id.desc())
            .all()
        )

        if not invoices:
            return (
                f"No invoices were created in "
                f"**{now.strftime('%B %Y')}** for your account."
            )

        total = sum(
            _usd(inv.total_amount, inv.currency) for inv in invoices
        )
        by_status: Dict[str, int] = {}
        for inv in invoices:
            status = inv.processing_status or "Unknown"
            by_status[status] = by_status.get(status, 0) + 1

        status_lines = "\n".join(
            f"- {status}: {count}"
            for status, count in sorted(
                by_status.items(),
                key=lambda x: (-x[1], x[0]),
            )
        )

        top = invoices[:5]
        top_lines = "\n".join(
            (
                f"- {inv.invoice_number or f'#{inv.id}'} — "
                f"{inv.vendor_name or 'Vendor'} — "
                f"{_fmt_usd(_usd(inv.total_amount, inv.currency))} USD"
            )
            for inv in top
        )

        return "\n".join(
            [
                f"### Invoice summary — {now.strftime('%B %Y')}",
                "",
                f"- Count: **{len(invoices)}**",
                f"- Total value: **{_fmt_usd(total)} USD**",
                "",
                "By status:",
                status_lines,
                "",
                "Latest invoices:",
                top_lines,
            ]
        )

    def deadlines(self) -> str:
        today = datetime.utcnow().date()
        horizon = today + timedelta(days=14)

        invoices = (
            self.db.query(Invoice)
            .filter(Invoice.user_id == self.user_id)
            .order_by(Invoice.id.desc())
            .limit(200)
            .all()
        )

        bn_rows = (
            self.db.query(BusinessNeed)
            .filter(
                BusinessNeed.requester_id == self.user_id,
                BusinessNeed.required_by_date.isnot(None),
                BusinessNeed.required_by_date != "",
                BusinessNeed.status.in_(
                    ["Draft", "Submitted", "Approved"]
                ),
            )
            .order_by(BusinessNeed.id.desc())
            .limit(50)
            .all()
        )

        inv_lines: List[str] = []
        for inv in invoices:
            due = self._parse_date(inv.due_date)
            if due is None:
                continue
            if due < today:
                label = "OVERDUE"
            elif due <= horizon:
                label = "due soon"
            else:
                continue
            inv_lines.append(
                f"{inv.invoice_number or f'#{inv.id}'} — "
                f"{inv.vendor_name or 'Vendor'} — "
                f"{due.isoformat()} ({label}) — "
                f"{_fmt_usd(_usd(inv.total_amount, inv.currency))} USD"
            )

        bn_lines: List[str] = []
        for bn in bn_rows:
            due = self._parse_date(bn.required_by_date)
            if due is None:
                continue
            if due < today:
                label = "OVERDUE"
            elif due <= horizon:
                label = "due soon"
            else:
                continue
            bn_lines.append(
                f"{bn.title or 'Business Need'} — "
                f"{due.isoformat()} ({label}) — "
                f"{_fmt_usd(_usd(bn.estimated_value, bn.currency))} USD"
            )

        if not inv_lines and not bn_lines:
            return (
                "No **upcoming or overdue deadlines** in the next 14 days "
                "for your invoices or business needs."
            )

        parts = [
            "Upcoming / overdue deadlines (next **14 days**):",
            "",
            _line("Invoices", inv_lines[:15], "none"),
            _line("Business Needs", bn_lines[:15], "none"),
        ]
        return "\n".join(parts)

    @staticmethod
    def _parse_date(value: Any):
        if value is None:
            return None
        text = str(value).strip()
        if not text:
            return None
        for fmt in (
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%Y/%m/%d",
            "%d-%m-%Y",
        ):
            try:
                return datetime.strptime(text[:10], fmt).date()
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(text.replace("Z", "")).date()
        except ValueError:
            return None
