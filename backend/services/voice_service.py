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
    if result.get("action") == "revenue_summary":
        summary = result.get("data", {}).get("summary", {})
        revenue = summary.get("revenue", 0)
        outstanding = summary.get("outstanding", 0)
        return f"Revenue {revenue}. Outstanding {outstanding}."
    if result.get("action") == "top_overdue_customers":
        customers = result.get("data", {}).get("customers", [])
        if not customers:
            return "No overdue customers found."
        names = ", ".join(c.get("company", "") for c in customers[:3])
        return f"Top overdue customers: {names}."
    if result.get("action") == "customers_summary":
        summary = result.get("data", {}).get("summary", {})
        return f"Customers {summary.get('total', 0)}. Overdue {summary.get('overdue', 0)}."
    if result.get("action") == "invoices_summary":
        summary = result.get("data", {}).get("summary", {})
        return (
            f"Invoices {summary.get('total', 0)}. Paid {summary.get('paid', 0)}, "
            f"pending {summary.get('pending', 0)}, overdue {summary.get('overdue', 0)}."
        )
    if result.get("action") == "payments_summary":
        summary = result.get("data", {}).get("summary", {})
        return f"Payments {summary.get('total', 0)} totaling {summary.get('amount', 0)}."
    if result.get("action") == "recent_activity":
        activity = result.get("data", {}).get("activity", [])
        if not activity:
            return "No recent activity."
        return f"Recent activity: {activity[0].get('message', '')}."
    if result.get("action") == "sync_summary":
        summary = result.get("data", {}).get("summary", {})
        return (
            f"Sync queue total {summary.get('total', 0)}. "
            f"Pending {summary.get('pending', 0)}, failed {summary.get('failed', 0)}."
        )
    return result.get("message", "Done.")
