"""
Database schema migrations for the SQLite POC database.

These migrations are idempotent:
- Safe to run multiple times.
- Existing invoice data is preserved.
- Missing columns are added only when required.

Note:
For a completely new database, SQLAlchemy's
Base.metadata.create_all() creates the columns automatically.
These migrations are only required when upgrading an existing DB.
"""

from sqlalchemy import text


def run_schema_migrations(engine) -> None:
    """
    Run all required SQLite schema migrations.

    Currently:
    - Adds procurement_purchase_order_id to the existing invoices table
      when the column does not already exist.
    """

    # Migrations are currently required only for SQLite.
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as connection:

        # --------------------------------------------------
        # Check existing invoices table columns
        # --------------------------------------------------
        columns = {
            row[1]
            for row in connection.execute(
                text("PRAGMA table_info(invoices)")
            )
        }

        # --------------------------------------------------
        # Add procurement PO relationship to invoices
        # --------------------------------------------------
        if "procurement_purchase_order_id" not in columns:
            connection.execute(
                text(
                    """
                    ALTER TABLE invoices
                    ADD COLUMN procurement_purchase_order_id INTEGER
                    """
                )
            )