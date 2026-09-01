from app.services.benchmark import _blind_retry_rows, _metrics
from app.services.evaluation_dataset import EVALUATION_DATASET


def _ground_truth_rows():
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "category": row["category"],
            "amount": row["amount"],
            "late_success_risk": row["late_success_risk"],
            "expected_action": row["expected_action"],
            "expected_autonomous_execution": row["expected_autonomous_execution"],
            "action": row["expected_action"],
            "confidence": 1.0,
            "autonomous_execution": row["expected_autonomous_execution"],
            "guard_override": False,
            "reason": "ground truth fixture",
        }
        for row in EVALUATION_DATASET
    ]


def test_ground_truth_strategy_scores_perfect_accuracy_and_zero_unsafe_attempts():
    metrics = _metrics(_ground_truth_rows())
    assert metrics["action_accuracy_pct"] == 100.0
    assert metrics["unsafe_collection_attempts"] == 0
    assert metrics["duplicate_risk_exposures"] == 0
    assert metrics["high_value_autonomous_attempts"] == 0


def test_blind_retry_baseline_opens_collection_for_every_case():
    rows = _blind_retry_rows(EVALUATION_DATASET)
    assert len(rows) == len(EVALUATION_DATASET)
    assert all(row["action"] == "CREATE_RECOVERY_LINK" for row in rows)
    assert all(row["autonomous_execution"] for row in rows)


def test_blind_retry_exposes_non_autonomous_cases():
    rows = _blind_retry_rows(EVALUATION_DATASET)
    metrics = _metrics(rows)
    expected_unsafe = sum(
        1 for row in EVALUATION_DATASET if not row["expected_autonomous_execution"]
    )
    assert metrics["unsafe_collection_attempts"] == expected_unsafe
    assert metrics["unsafe_collection_attempts"] > 0
    assert metrics["duplicate_risk_exposures"] > 0
    assert metrics["high_value_autonomous_attempts"] > 0


def test_blind_retry_still_captures_all_recovery_opportunities():
    metrics = _metrics(_blind_retry_rows(EVALUATION_DATASET))
    assert metrics["recovery_opportunity_capture_pct"] == 100.0
    assert metrics["safe_deferral_accuracy_pct"] == 0.0
