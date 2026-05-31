import re
from typing import Dict, Any


AMOUNT_WORD_RE = re.compile(r"(?:amount|total|value)\s*([0-9][0-9,]*\.?[0-9]*)", re.IGNORECASE)
AMOUNT_RE = re.compile(r"(?:rs\.?|inr|rupees)\s*([0-9][0-9,]*\.?[0-9]*)", re.IGNORECASE)
NUM_RE = re.compile(r"([0-9][0-9,]*\.?[0-9]*)")
QTY_RE = re.compile(r"([0-9]+)\s*(pcs|pieces|box|boxes|ream|kg|units?|nos?)", re.IGNORECASE)
QTY_ITEM_RE = re.compile(
    r"([0-9]+)\s*(pcs|pieces|box|boxes|ream|kg|units?|nos?)\s*(?:of\s+)?(.+)",
    re.IGNORECASE,
)


def _first_amount(text: str) -> float:
    match = AMOUNT_WORD_RE.search(text) or AMOUNT_RE.search(text) or NUM_RE.search(text)
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
        r"for\s+(.+?)(?:\s+(?:amount|total|value|rs\.?|inr|rupees|dated|on|with|of|item|qty|quantity)\b|$)",
        r"customer\s+(.+?)(?:\s+(?:amount|total|value|rs\.?|inr|rupees|dated|on|with|of|item|qty|quantity)\b|$)",
        r"to\s+(.+?)(?:\s+(?:amount|total|value|rs\.?|inr|rupees|dated|on|with|of|item|qty|quantity)\b|$)",
        r"from\s+(.+?)(?:\s+(?:amount|total|value|rs\.?|inr|rupees|dated|on|with|of|item|qty|quantity)\b|$)",
    ]
    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            return match.group(1).strip(" .,")
    return ""


def _extract_item(text: str) -> str:
    qty_match = QTY_ITEM_RE.search(text)
    if qty_match:
        return qty_match.group(3).strip(" .,")

    patterns = [
        r"item\s+(.+?)(?:\s+(?:amount|total|value|rs\.?|inr|rupees|for|qty|quantity)\b|$)",
        r"of\s+(.+?)(?:\s+(?:amount|total|value|rs\.?|inr|rupees|for|qty|quantity)\b|$)",
    ]
    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            return match.group(1).strip(" .,")
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
    elif any(k in lowered for k in ["low stock", "reorder", "running low", "needs reordering"]):
        intent = "low_stock"
    elif "balance" in lowered:
        intent = "customer_balance"
    elif any(k in lowered for k in ["revenue", "p&l", "profit", "income"]):
        intent = "revenue_summary"
    elif "overdue" in lowered and "customer" in lowered:
        intent = "top_overdue_customers"
    elif any(k in lowered for k in ["customers", "customer list", "all customers"]):
        intent = "customers_summary"
    elif any(k in lowered for k in ["invoices", "invoice list", "all invoices"]):
        intent = "invoices_summary"
    elif any(k in lowered for k in ["payments", "payment list", "all payments"]):
        intent = "payments_summary"
    elif any(k in lowered for k in ["activity", "recent", "latest"]):
        intent = "recent_activity"
    elif any(k in lowered for k in ["sync", "synced", "queue"]):
        intent = "sync_summary"
    elif any(k in lowered for k in ["stock", "inventory"]):
        intent = "low_stock"

    qty = _quantity(raw)
    item = _extract_item(raw)
    customer = _extract_customer(raw)
    amount = _first_amount(raw)

    entities = {
        "amount": amount,
        "qty": qty,
        "customer": customer,
        "item": item,
    }

    return {"intent": intent, "entities": entities, "raw": raw}
