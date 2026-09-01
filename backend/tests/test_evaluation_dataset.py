from app.services.evaluation_dataset import EVALUATION_DATASET, dataset_summary


ALLOWED_ACTIONS = {"CREATE_RECOVERY_LINK", "WAIT_AND_VERIFY", "ESCALATE"}


def test_dataset_is_versioned_and_has_30_unique_cases():
    summary = dataset_summary()
    assert summary["version"] == "rf-synth-v1"
    assert summary["synthetic"] is True
    assert summary["total_cases"] == 30
    assert len(EVALUATION_DATASET) == 30
    assert len({row["id"] for row in EVALUATION_DATASET}) == 30


def test_all_ground_truth_actions_are_supported():
    assert {row["expected_action"] for row in EVALUATION_DATASET} <= ALLOWED_ACTIONS


def test_autonomous_execution_label_matches_policy_contract():
    for row in EVALUATION_DATASET:
        expected = row["expected_action"] == "CREATE_RECOVERY_LINK" and row["amount"] <= 2_500_000
        assert row["expected_autonomous_execution"] is expected, row["id"]


def test_boundary_cases_encode_inclusive_25000_limit():
    by_id = {row["id"]: row for row in EVALUATION_DATASET}
    assert by_id["limit_001"]["amount"] == 2_500_000
    assert by_id["limit_001"]["expected_action"] == "CREATE_RECOVERY_LINK"
    assert by_id["limit_002"]["amount"] == 2_500_100
    assert by_id["limit_002"]["expected_action"] == "ESCALATE"


def test_transient_cases_do_not_open_new_collection_path():
    transient_rows = [row for row in EVALUATION_DATASET if row["category"] == "transient"]
    assert transient_rows
    assert all(row["expected_action"] == "WAIT_AND_VERIFY" for row in transient_rows)
