from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    razorpay_payment_id = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    amount = Column(
        Integer,
        nullable=False,
    )

    currency = Column(
        String,
        default="INR",
        nullable=False,
    )

    status = Column(
        String,
        nullable=False,
    )

    method = Column(
        String,
        nullable=True,
    )

    error_code = Column(
        String,
        nullable=True,
    )

    error_source = Column(
        String,
        nullable=True,
    )

    error_step = Column(
        String,
        nullable=True,
    )

    error_reason = Column(
        String,
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )