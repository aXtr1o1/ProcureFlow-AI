from app.database.database import Base, engine
from app.database import models


def init_db():
    """
    Create all database tables.
    """
    Base.metadata.create_all(bind=engine)
    print("✅ SQLite database initialized successfully.")
    print("✅ All tables have been created.")


if __name__ == "__main__":
    init_db()