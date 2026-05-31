from typing import Dict, Any, List, Optional

import repositories
from services.tally_service import attempt_sync


def enqueue(item_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    return repositories.insert_sync_queue(item_type, payload)


def list_queue(status: Optional[str] = None) -> List[Dict[str, Any]]:
    return repositories.list_sync_queue(status)


def retry_failed() -> Dict[str, Any]:
    failed = repositories.list_sync_queue("failed")
    results = []
    for item in failed:
        results.append(attempt_sync(item))
    return {"count": len(failed), "results": results}
