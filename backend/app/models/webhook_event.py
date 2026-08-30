from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String

from app.database import Base


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    event_id = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    event_type = Column(
        String,
        nullable=False,
    )

    payload = Column(
        JSON,
        nullable=False,
    )

    processed = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )