from typing import Dict, Any

from services.entity_parser import parse_text
from services.workflow_engine import WorkflowEngine


def process_text(text: str) -> Dict[str, Any]:
    parsed = parse_text(text)
    engine = WorkflowEngine()
    result = engine.run(parsed["intent"], parsed["entities"])
    response_text = _build_response(parsed, result)
    return {
        "input": parsed["raw"],
        "intent": parsed["intent"],
        "entities": parsed["entities"],
        "result": result,
        "response": response_text,
    }


def _build_response(parsed: Dict[str, Any], result: Dict[str, Any]) -> str:
    if result.get("status") == "error":
        return result.get("message", "Sorry, I need more details.")
    if result.get("action") == "invoice_created":
        inv = result["data"]["invoice"]
        return f"Invoice {inv['number']} created for {parsed['entities'].get('customer', '')}."
    if result.get("action") == "payment_recorded":
        return "Payment recorded."
    if result.get("action") == "low_stock":
        items = result.get("data", {}).get("items", [])
        if not items:
            return "All items are above reorder level."
        names = ", ".join(i["name"] for i in items[:3])
        return f"Low stock: {names}."
    if result.get("action") == "customer_balance":
        cust = result.get("data", {}).get("customer", {})
        return f"{cust.get('company', 'Customer')} balance is {cust.get('balance', 0)}."
    return result.get("message", "Done.")
