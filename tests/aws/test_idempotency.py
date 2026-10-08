"""
Unit tests for reward idempotency (Section 13).
Ensures duplicate requests for the same trip never credit duplicate funds.
"""

from unittest.mock import MagicMock
from backend.repository.dynamodb import DynamoDBRepository
from botocore.exceptions import ClientError


def test_duplicate_reward_prevention():
    mock_resource = MagicMock()
    mock_table = MagicMock()
    mock_resource.Table.return_value = mock_table

    repo = DynamoDBRepository(dynamodb_resource=mock_resource)

    # First attempt: succeeds
    mock_table.put_item.return_value = {}
    ok1, status1 = repo.credit_reward_idempotent("worker_100", "trip_999", amount_inr=3)
    assert ok1 is True
    assert status1 == "CREDITED"

    # Second attempt: conditional check fails
    error_response = {"Error": {"Code": "ConditionalCheckFailedException", "Message": "Conditional check failed"}}
    mock_table.put_item.side_effect = ClientError(error_response, "PutItem")

    ok2, status2 = repo.credit_reward_idempotent("worker_100", "trip_999", amount_inr=3)
    assert ok2 is True
    assert status2 == "ALREADY_PROCESSED"
