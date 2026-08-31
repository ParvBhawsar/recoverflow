from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Integer

from app.database import Base


class MerchantPolicy(Base):
    __tablename__ = "merchant_policies"

    # RecoverFlow currently models a single demo merchant. Keeping a stable primary
    # key makes this easy to extend to merchant-scoped policies later.
    id = Column(Integer, primary_key=True, default=1)

    max_autonomous_amount = Column(Integer, default=2_500_000, nullable=False)
    min_autonomous_confidence = Column(Float, default=0.75, nullable=False)
    max_recovery_attempts = Column(Integer, default=2, nullable=False)

    allow_create_recovery_link = Column(Boolean, default=True, nullable=False)
    allow_wait_and_verify = Column(Boolean, default=True, nullable=False)
    allow_escalate = Column(Boolean, default=True, nullable=False)

    # Core safety invariant: this remains mandatory and is intentionally not
    # exposed as an editable control.
    duplicate_charge_protection_enabled = Column(Boolean, default=True, nullable=False)

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
