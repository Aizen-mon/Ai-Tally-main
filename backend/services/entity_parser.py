import re
from typing import Dict, Any


AMOUNT_RE = re.compile(r"(?:rs\.?|inr|rupees)\s*([0-9][0-9,]*\.?[0-9]*)", re.IGNORECASE)
NUM_RE = re.compile(r"([0-9][0-9,]*\.?[0-9]*)")
QTY_RE = re.compile(r"([0-9]+)\s*(pcs|pieces|box|boxes|ream|kg|units?|nos?)", re.IGNORECASE)


def _first_amount(text: str) -> float:
    match = AMOUNT_RE.search(text) or NUM_RE.search(text)
    if not match:
        return 0.0
    raw = match.group(1).replace(",", "")
    try:
        return float(raw)
    except ValueError:
        return 0.0


def _quantity(text: str) -> int:
    match = QTY_RE.search(text)
    if not match:
        return 0
    return int(match.group(1))


def _extract_customer(text: str) -> str:
    patterns = [
        r"for\s+([a-zA-Z0-9 &.]+)",
        r"from\s+([a-zA-Z0-9 &.]+)",
        r"customer\s+([a-zA-Z0-9 &.]+)",
        r"to\s+([a-zA-Z0-9 &.]+)",
    ]
    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return ""


def _extract_item(text: str) -> str:
    patterns = [r"item\s+([a-zA-Z0-9 &.]+)", r"of\s+([a-zA-Z0-9 &.]+)"]
    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return ""


def parse_text(text: str) -> Dict[str, Any]:
    raw = text or ""
    lowered = raw.lower()

    intent = "unknown"
    if "invoice" in lowered and any(k in lowered for k in ["create", "raise", "make", "send", "new"]):
        intent = "create_invoice"
    elif "payment" in lowered and any(k in lowered for k in ["record", "received", "got", "paid"]):
        intent = "record_payment"
    elif any(k in lowered for k in ["stock", "inventory"]) and any(k in lowered for k in ["update", "add", "reduce", "set"]):
        intent = "update_stock"
    elif any(k in lowered for k in ["low stock", "reorder", "running low"]):
        intent = "low_stock"
    elif "balance" in lowered:
        intent = "customer_balance"

    entities = {
        "amount": _first_amount(raw),
        "qty": _quantity(raw),
        "customer": _extract_customer(raw),
        "item": _extract_item(raw),
    }

    return {"intent": intent, "entities": entities, "raw": raw}
