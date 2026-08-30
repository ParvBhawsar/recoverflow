from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, JSON, String

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    recovery_case_id = Column(Integer, nullable=True, index=True)
    event_type = Column(String, nullable=False, index=True)
    message = Column(String, nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
