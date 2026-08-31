import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.evaluation import router as evaluation_router
from app.api.policy import router as policy_router
from app.api.recovery import router as recovery_router
from app.api.webhooks import router as webhook_router
from app.database import Base, SessionLocal, engine
from app.models.ai_plan import AIPlan
from app.models.audit_log import AuditLog
from app.models.benchmark_run import BenchmarkRun
from app.models.merchant_policy import MerchantPolicy
from app.models.payment import Payment
from app.models.recovery_action import RecoveryAction
from app.models.recovery_case import RecoveryCase
from app.models.webhook_event import WebhookEvent
from app.services.merchant_policy import get_or_create_policy
from app.services.policy_runtime import apply_policy_to_runtime


def _cors_origins() -> list[str]:
    configured = [
        origin.strip().rstrip("/")
        for origin in (os.getenv("FRONTEND_ORIGINS") or "").split(",")
        if origin.strip()
    ]
    defaults = ["http://localhost:3000", "http://127.0.0.1:3000"]
    return list(dict.fromkeys([*defaults, *configured]))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        policy = get_or_create_policy(db)
        apply_policy_to_runtime(policy)
    finally:
        db.close()

    yield


app = FastAPI(
    title="RecoverFlow API",
    description="AI-powered revenue recovery agent for Razorpay merchants",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    webhook_router,
    prefix="/webhooks",
    tags=["Razorpay Webhooks"],
)

app.include_router(
    recovery_router,
    prefix="/recovery",
    tags=["Recovery"],
)

app.include_router(
    evaluation_router,
    prefix="/recovery/evaluation",
    tags=["Evaluation"],
)

app.include_router(
    policy_router,
    prefix="/recovery/policy",
    tags=["Merchant Safety Policy"],
)


@app.get("/")
def root():
    return {
        "service": "RecoverFlow",
        "status": "running",
        "version": "1.0.0",
        "environment": os.getenv("APP_ENV", "development"),
    }


@app.get("/health")
def health():
    return {"status": "healthy", "service": "recoverflow-api"}


@app.get("/health/db")
def database_health():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1")).scalar()

    return {
        "database": "connected",
        "result": result,
    }
