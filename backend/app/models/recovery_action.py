from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, JSON, String

from app.database import Base


class RecoveryAction(Base):
    __tablename__ = "recovery_actions"

    id = Column(Integer, primary_key=True, index=True)
    recovery_case_id = Column(Integer, nullable=False, index=True)
    action_type = Column(String, nullable=False, index=True)
    status = Column(String, default="PENDING", nullable=False, index=True)

    external_id = Column(String, nullable=True, unique=True, index=True)
    external_url = Column(String, nullable=True)
    recovery_payment_id = Column(String, nullable=True, index=True)

    details = Column(JSON, nullable=True)
    error_message = Column(String, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
