from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, Integer, String

from app.database import Base


class RecoveryCase(Base):
    __tablename__ = "recovery_cases"

    id = Column(Integer, primary_key=True, index=True)
    razorpay_payment_id = Column(String, unique=True, index=True, nullable=False)
    amount = Column(Integer, nullable=False)
    currency = Column(String, default="INR", nullable=False)

    status = Column(String, default="PENDING_ANALYSIS", nullable=False, index=True)
    diagnosis = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    recommended_action = Column(String, nullable=True)
    reason = Column(String, nullable=True)

    attempt_count = Column(Integer, default=0, nullable=False)
    recovered_amount = Column(Integer, default=0, nullable=False)

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
