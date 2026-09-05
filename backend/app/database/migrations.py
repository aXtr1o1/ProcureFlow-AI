"""
Database schema migrations for the SQLite POC database.

These migrations are idempotent:
- Safe to run multiple times.
- Existing data is preserved.
- Missing columns are added only when required.

For a completely new database, SQLAlchemy's
Base.metadata.create_all() creates the columns automatically.
These migrations are required when upgrading an existing DB.
"""

from sqlalchemy import text


def run_schema_migrations(engine) -> None:
    """
    Run all required SQLite schema migrations.
    """

    # Migrations are currently required only for SQLite.
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as connection:

        # ==================================================
        # Invoice table migrations
        # ==================================================

        invoice_columns = {
            row[1]
            for row in connection.execute(
                text("PRAGMA table_info(invoices)")
            )
        }

        # Add procurement PO relationship to invoices
        if "procurement_purchase_order_id" not in invoice_columns:
            connection.execute(
                text(
                    """
                    ALTER TABLE invoices
                    ADD COLUMN procurement_purchase_order_id INTEGER
                    """
                )
            )

        # Add issue_date to invoices
        if "issue_date" not in invoice_columns:
            connection.execute(
                text(
                    """
                    ALTER TABLE invoices
                    ADD COLUMN issue_date DATE
                    """
                )
            )

        # ==================================================
        # Purchase Requisition table migrations
        # ==================================================

        requisition_columns = {
            row[1]
            for row in connection.execute(
                text("PRAGMA table_info(purchase_requisitions)")
            )
        }

        # Add category field for spend analytics
        if "category" not in requisition_columns:
            connection.execute(
                text(
                    """
                    ALTER TABLE purchase_requisitions
                    ADD COLUMN category VARCHAR(255)
                    """
                )
            )

        # ==================================================
        # Goods Receipt table migrations
        # ==================================================

        goods_receipt_columns = {
            row[1]
            for row in connection.execute(
                text("PRAGMA table_info(goods_receipts)")
            )
        }

        # Expected delivery date
        if "expected_delivery_date" not in goods_receipt_columns:
            connection.execute(
                text(
                    """
                    ALTER TABLE goods_receipts
                    ADD COLUMN expected_delivery_date DATETIME
                    """
                )
            )

        # Actual received date
        if "received_date" not in goods_receipt_columns:
            connection.execute(
                text(
                    """
                    ALTER TABLE goods_receipts
                    ADD COLUMN received_date DATETIME
                    """
                )
            )