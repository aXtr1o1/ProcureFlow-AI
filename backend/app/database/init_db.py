from app.database.database import Base, engine
from app.database import models
from app.database.database import SessionLocal
from app.services.business_need_service import seed_business_need_types
from app.database.migrations import run_schema_migrations


def init_db():
    """
    Create all database tables.
    """
    Base.metadata.create_all(bind=engine)
    run_schema_migrations(engine)
    db = SessionLocal()
    try:
        seed_business_need_types(db)
    finally:
        db.close()
    print("✅ SQLite database initialized successfully.")
    print("✅ All tables have been created.")


if __name__ == "__main__":
    init_db()
