import json
import urllib.request
from typing import Dict, Any, Optional

from config import TALLY_ENDPOINT, OFFLINE_ONLY
from db import now_iso
import repositories


def build_invoice_xml(invoice: Dict[str, Any]) -> str:
    return (
        "<TALLYMESSAGE>"
        "<VOUCHER>"
        f"<VOUCHERNUMBER>{invoice['number']}</VOUCHERNUMBER>"
        f"<DATE>{invoice['date']}</DATE>"
        f"<AMOUNT>{invoice['amount']}</AMOUNT>"
        "</VOUCHER>"
        "</TALLYMESSAGE>"
    )


def send_to_tally(payload: str) -> Optional[str]:
    if OFFLINE_ONLY or not TALLY_ENDPOINT:
        return None
    req = urllib.request.Request(
        TALLY_ENDPOINT,
        data=payload.encode("utf-8"),
        headers={"Content-Type": "application/xml"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.read().decode("utf-8")


def enqueue_invoice(invoice: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "type": "invoice",
        "invoice": invoice,
        "xml": build_invoice_xml(invoice),
        "queued_at": now_iso(),
    }
    return repositories.insert_sync_queue("invoice", payload)


def enqueue_payment(payment: Dict[str, Any]) -> Dict[str, Any]:
    payload = {"type": "payment", "payment": payment, "queued_at": now_iso()}
    return repositories.insert_sync_queue("payment", payload)


def attempt_sync(item: Dict[str, Any]) -> Dict[str, Any]:
    payload = json.loads(item["payload_json"])
    try:
        xml = payload.get("xml") or ""
        if xml:
            send_to_tally(xml)
        repositories.update_sync_status(item["id"], "done")
        return {"status": "done"}
    except Exception as exc:
        repositories.update_sync_status(item["id"], "failed", str(exc))
        return {"status": "failed", "error": str(exc)}
