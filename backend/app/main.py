from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.api.webhooks import router as webhook_router
from app.database import Base, engine
from app.models.payment import Payment
from app.models.webhook_event import WebhookEvent


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="RecoverFlow API",
    description="AI-powered revenue recovery agent for Razorpay merchants",
    version="0.1.0",
    lifespan=lifespan,
)


app.include_router(
    webhook_router,
    prefix="/webhooks",
    tags=["Razorpay Webhooks"],
)


@app.get("/")
def root():
    return {
        "service": "RecoverFlow",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


@app.get("/health/db")
def database_health():
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT 1")
        ).scalar()

    return {
        "database": "connected",
        "result": result,
    }