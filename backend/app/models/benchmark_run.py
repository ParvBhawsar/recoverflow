from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String

from app.database import Base


class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_version = Column(String, nullable=False, index=True)
    benchmark_type = Column(String, nullable=False)
    planner_source = Column(String, nullable=False)
    planner_model = Column(String, nullable=True)
    synthetic = Column(Boolean, default=True, nullable=False)
    ground_truth_hidden_from_model = Column(Boolean, default=True, nullable=False)

    recoverflow_metrics = Column(JSON, nullable=False)
    blind_retry_metrics = Column(JSON, nullable=False)
    comparison = Column(JSON, nullable=False)
    recoverflow_rows = Column(JSON, nullable=False)
    blind_retry_rows = Column(JSON, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
