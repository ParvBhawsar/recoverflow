from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, Integer, JSON, String, Text

from app.database import Base


class AIPlan(Base):
    __tablename__ = "ai_plans"

    id = Column(Integer, primary_key=True, index=True)
    recovery_case_id = Column(Integer, nullable=False, unique=True, index=True)

    diagnosis = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    recommended_action = Column(String, nullable=False)
    delay_minutes = Column(Integer, default=0, nullable=False)
    reason = Column(Text, nullable=False)
    customer_tone = Column(String, default="supportive", nullable=False)

    planner_source = Column(String, nullable=False, index=True)
    planner_model = Column(String, nullable=True)
    provider_error = Column(Text, nullable=True)
    raw_response = Column(JSON, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
