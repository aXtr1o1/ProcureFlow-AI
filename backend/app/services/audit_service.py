from sqlalchemy.orm import Session

from app.database.models import AuditLog


class AuditService:

    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        user_id: int,
        action: str,
        module: str,
        status: str,
        message: str,
    ):

        audit = AuditLog(
            user_id=user_id,
            action=action,
            module=module,
            status=status,
            message=message,
        )

        self.db.add(audit)
        self.db.commit()
        self.db.refresh(audit)

        return audit