from fastapi import APIRouter, HTTPException

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
