from fastapi import APIRouter, HTTPException

from app.services.benchmark import run_benchmark
from app.services.evaluation_dataset import (
    DATASET_DESCRIPTION,
    DATASET_VERSION,
    EVALUATION_DATASET,
    dataset_summary,
)


router = APIRouter()


@router.get("/dataset")
def get_evaluation_dataset():
    return {
        "version": DATASET_VERSION,
        "description": DATASET_DESCRIPTION,
        "synthetic": True,
        "summary": dataset_summary(),
        "records": EVALUATION_DATASET,
    }


@router.get("/dataset/{case_id}")
def get_evaluation_case(case_id: str):
    row = next((item for item in EVALUATION_DATASET if item["id"] == case_id), None)
    if not row:
        raise HTTPException(status_code=404, detail="Evaluation case not found")
    return {
        "version": DATASET_VERSION,
        "synthetic": True,
        "record": row,
    }


@router.post("/benchmark")
def run_live_benchmark():
    """Evaluate RecoverFlow against a blind-retry baseline on rf-synth-v1.

    This is a synthetic benchmark. The Gemini batch request receives only payment
    context; expected labels and rationales are withheld from the model.
    """
    try:
        return run_benchmark()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Benchmark failed: {exc}") from exc
