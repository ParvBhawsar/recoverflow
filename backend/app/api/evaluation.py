from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.benchmark_run import BenchmarkRun
from app.services.benchmark import run_benchmark
from app.services.evaluation_dataset import (
    DATASET_DESCRIPTION,
    DATASET_VERSION,
    EVALUATION_DATASET,
    dataset_summary,
)


router = APIRouter()


def _benchmark_payload(run: BenchmarkRun, include_rows: bool = True) -> dict:
    payload = {
        "run_id": run.id,
        "dataset_version": run.dataset_version,
        "benchmark_type": run.benchmark_type,
        "planner_source": run.planner_source,
        "planner_model": run.planner_model,
        "synthetic": run.synthetic,
        "ground_truth_hidden_from_model": run.ground_truth_hidden_from_model,
        "recoverflow": {"metrics": run.recoverflow_metrics},
        "blind_retry": {"metrics": run.blind_retry_metrics},
        "comparison": run.comparison,
        "created_at": run.created_at,
    }
    if include_rows:
        payload["recoverflow"]["rows"] = run.recoverflow_rows
        payload["blind_retry"]["rows"] = run.blind_retry_rows
    return payload


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
def run_live_benchmark(db: Session = Depends(get_db)):
    """Evaluate RecoverFlow against blind retry and persist the synthetic run."""
    try:
        result = run_benchmark()

        benchmark_run = BenchmarkRun(
            dataset_version=result["dataset_version"],
            benchmark_type=result["benchmark_type"],
            planner_source=result["planner_source"],
            planner_model=result.get("planner_model"),
            synthetic=result["synthetic"],
            ground_truth_hidden_from_model=result["ground_truth_hidden_from_model"],
            recoverflow_metrics=result["recoverflow"]["metrics"],
            blind_retry_metrics=result["blind_retry"]["metrics"],
            comparison=result["comparison"],
            recoverflow_rows=result["recoverflow"]["rows"],
            blind_retry_rows=result["blind_retry"]["rows"],
        )
        db.add(benchmark_run)
        db.commit()
        db.refresh(benchmark_run)
        return _benchmark_payload(benchmark_run, include_rows=True)
    except RuntimeError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Benchmark failed: {exc}") from exc


@router.get("/benchmark/latest")
def get_latest_benchmark(db: Session = Depends(get_db)):
    run = db.query(BenchmarkRun).order_by(BenchmarkRun.created_at.desc()).first()
    if not run:
        raise HTTPException(status_code=404, detail="No benchmark runs recorded yet")
    return _benchmark_payload(run, include_rows=True)


@router.get("/benchmark/history")
def get_benchmark_history(db: Session = Depends(get_db)):
    runs = (
        db.query(BenchmarkRun)
        .order_by(BenchmarkRun.created_at.desc())
        .limit(20)
        .all()
    )
    return {
        "synthetic": True,
        "dataset_version": DATASET_VERSION,
        "runs": [_benchmark_payload(run, include_rows=False) for run in runs],
    }
