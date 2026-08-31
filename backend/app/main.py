from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.recovery import router as recovery_router
from app.api.webhooks import router as webhook_router
from app.database import Base, engine
from app.models.ai_plan import AIPlan
from app.models.audit_log import AuditLog
from app.models.payment import Payment
from app.models.recovery_action import RecoveryAction
from app.models.recovery_case import RecoveryCase
from app.models.webhook_event import WebhookEvent


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="RecoverFlow API",
    description="AI-powered revenue recovery agent for Razorpay merchants",
    version="0.7.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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


@app.get("/")
def root():
    return {
        "service": "RecoverFlow",
        "status": "running",
        "version": "0.7.0",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/health/db")
def database_health():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1")).scalar()

    return {
        "database": "connected",
        "result": result,
    }
