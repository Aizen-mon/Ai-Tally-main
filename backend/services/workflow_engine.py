from typing import Dict, Any

import repositories


class WorkflowEngine:
    def run(self, intent: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        if intent == "create_invoice":
            return self._create_invoice(entities)
        if intent == "record_payment":
            return self._record_payment(entities)
        if intent == "update_stock":
            return self._update_stock(entities)
        if intent == "low_stock":
            return self._low_stock()
        if intent == "customer_balance":
            return self._customer_balance(entities)
        return {"status": "ignored", "message": "Intent not recognized"}

    def _create_invoice(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        if not entities.get("customer"):
            return {"status": "error", "message": "Customer name is required"}

        item = entities.get("item") or "Misc Item"
        qty = entities.get("qty") or 1
        amount = entities.get("amount") or 0
        price = amount / qty if qty else amount

        invoice = repositories.create_invoice(
            {
                "customer": entities.get("customer"),
                "amount": amount,
                "line_items": [
                    {"description": item, "qty": qty, "price": price},
                ],
            }
        )

        return {
            "status": "ok",
            "action": "invoice_created",
            "data": {"invoice": invoice},
            "message": f"Invoice {invoice['number']} created",
        }

    def _record_payment(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        if not entities.get("customer"):
            return {"status": "error", "message": "Customer name is required"}
        payment = repositories.create_payment(
            {
                "customer": entities.get("customer"),
                "amount": entities.get("amount") or 0,
                "method": "cash",
            }
        )
        return {
            "status": "ok",
            "action": "payment_recorded",
            "data": {"payment": payment},
            "message": "Payment recorded",
        }

    def _update_stock(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        if not entities.get("item"):
            return {"status": "error", "message": "Item name is required"}
        item = repositories.find_inventory_by_name(entities.get("item"))
        if not item:
            return {"status": "error", "message": "Item not found"}
        qty = entities.get("qty") or item["stock"]
        updated = repositories.update_inventory_stock(item["id"], qty)
        return {
            "status": "ok",
            "action": "stock_updated",
            "data": {"item": updated},
            "message": f"Stock updated for {updated['name']}",
        }

    def _low_stock(self) -> Dict[str, Any]:
        items = repositories.list_low_stock()
        return {
            "status": "ok",
            "action": "low_stock",
            "data": {"items": items},
            "message": "Low stock items fetched",
        }

    def _customer_balance(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        if not entities.get("customer"):
            return {"status": "error", "message": "Customer name is required"}
        customer = repositories.find_customer_by_name(entities.get("customer"))
        if not customer:
            return {"status": "error", "message": "Customer not found"}
        return {
            "status": "ok",
            "action": "customer_balance",
            "data": {"customer": customer},
            "message": f"{customer['company']} balance is {customer['balance']}",
        }
