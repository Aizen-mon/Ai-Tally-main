import json
from typing import Any, Dict, Iterable, List, Optional
from uuid import uuid4

from db import get_db, now_iso


def fetch_all(query: str, params: Iterable[Any] = ()) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


def fetch_one(query: str, params: Iterable[Any] = ()) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        row = conn.execute(query, params).fetchone()
    return dict(row) if row else None


def list_inventory() -> List[Dict[str, Any]]:
    return fetch_all("SELECT * FROM inventory_items ORDER BY name")


def get_inventory_item(item_id: str) -> Optional[Dict[str, Any]]:
    return fetch_one("SELECT * FROM inventory_items WHERE id = ?", (item_id,))


def find_inventory_by_name(name: str) -> Optional[Dict[str, Any]]:
    if not name:
        return None
    like = f"%{name.lower()}%"
    return fetch_one(
        "SELECT * FROM inventory_items WHERE lower(name) LIKE ? OR lower(sku) LIKE ?",
        (like, like),
    )


def update_inventory_stock(item_id: str, stock: int) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        conn.execute(
            "UPDATE inventory_items SET stock = ?, updated_at = ? WHERE id = ?",
            (stock, now_iso(), item_id),
        )
    return get_inventory_item(item_id)


def list_low_stock() -> List[Dict[str, Any]]:
    return fetch_all("SELECT * FROM inventory_items WHERE stock <= reorder_level ORDER BY name")


def list_customers() -> List[Dict[str, Any]]:
    return fetch_all("SELECT * FROM customers ORDER BY company")


def get_customer(cid: str) -> Optional[Dict[str, Any]]:
    return fetch_one("SELECT * FROM customers WHERE id = ?", (cid,))


def find_customer_by_name(name: str) -> Optional[Dict[str, Any]]:
    if not name:
        return None
    like = f"%{name.lower()}%"
    return fetch_one(
        "SELECT * FROM customers WHERE lower(company) LIKE ? OR lower(name) LIKE ?",
        (like, like),
    )


def create_customer(data: Dict[str, Any]) -> Dict[str, Any]:
    customer = {
        "id": data.get("id") or f"c{uuid4().hex[:8]}",
        "name": data.get("name") or "New Customer",
        "company": data.get("company") or "New Company",
        "email": data.get("email") or "",
        "phone": data.get("phone") or "",
        "balance": float(data.get("balance") or 0),
        "status": data.get("status") or "new",
        "last_invoice": data.get("last_invoice") or data.get("lastInvoice"),
    }
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO customers (id, name, company, email, phone, balance, status, last_invoice)
            VALUES (:id, :name, :company, :email, :phone, :balance, :status, :last_invoice)
            """,
            customer,
        )
        conn.execute(
            "INSERT INTO activity (id, type, message, created_at) VALUES (?, ?, ?, ?)",
            (f"a{uuid4().hex[:8]}", "customer", f"Customer created: {customer['company']}", now_iso()),
        )
    return customer


def list_invoices() -> List[Dict[str, Any]]:
    return fetch_all(
        """
        SELECT invoices.*, customers.company
        FROM invoices
        JOIN customers ON customers.id = invoices.customer_id
        ORDER BY date DESC
        """
    )


def get_invoice(invoice_id: str) -> Optional[Dict[str, Any]]:
    return fetch_one(
        """
        SELECT invoices.*, customers.company
        FROM invoices
        JOIN customers ON customers.id = invoices.customer_id
        WHERE invoices.id = ?
        """,
        (invoice_id,),
    )


def create_invoice(data: Dict[str, Any]) -> Dict[str, Any]:
    customer_id = data.get("customer_id") or data.get("customerId")
    if not customer_id and data.get("customer"):
        found = find_customer_by_name(data.get("customer"))
        if found:
            customer_id = found["id"]
    if not customer_id:
        raise ValueError("customer_id is required")

    amount = float(data.get("amount") or 0)
    line_items = data.get("line_items") or data.get("lineItems") or []
    if line_items:
        amount = sum(float(li.get("qty") or 0) * float(li.get("price") or 0) for li in line_items)

    invoice = {
        "id": data.get("id") or f"inv{uuid4().hex[:8]}",
        "number": data.get("number") or f"INV-{now_iso()[:4]}-{uuid4().hex[:4].upper()}",
        "customer_id": customer_id,
        "date": data.get("date") or now_iso()[:10],
        "amount": amount,
        "status": data.get("status") or "pending",
        "created_at": now_iso(),
    }

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO invoices (id, number, customer_id, date, amount, status, created_at)
            VALUES (:id, :number, :customer_id, :date, :amount, :status, :created_at)
            """,
            invoice,
        )
        for li in line_items:
            line = {
                "id": f"il{uuid4().hex[:8]}",
                "invoice_id": invoice["id"],
                "item_id": li.get("item_id") or li.get("itemId"),
                "description": li.get("description"),
                "qty": float(li.get("qty") or 0),
                "price": float(li.get("price") or 0),
            }
            conn.execute(
                """
                INSERT INTO invoice_lines (id, invoice_id, item_id, description, qty, price)
                VALUES (:id, :invoice_id, :item_id, :description, :qty, :price)
                """,
                line,
            )
        if invoice["status"] != "paid":
            conn.execute(
                "UPDATE customers SET balance = balance + ?, last_invoice = ? WHERE id = ?",
                (invoice["amount"], invoice["date"], customer_id),
            )
        conn.execute(
            "INSERT INTO activity (id, type, message, created_at) VALUES (?, ?, ?, ?)",
            (f"a{uuid4().hex[:8]}", "invoice", f"Invoice {invoice['number']} created", now_iso()),
        )

    return invoice


def list_customer_payments(customer_id: str) -> List[Dict[str, Any]]:
    return fetch_all(
        "SELECT id, amount, date, method, reference FROM payments WHERE customer_id = ? ORDER BY date DESC",
        (customer_id,),
    )


def create_payment(data: Dict[str, Any]) -> Dict[str, Any]:
    customer_id = data.get("customer_id") or data.get("customerId")
    if not customer_id and data.get("customer"):
        found = find_customer_by_name(data.get("customer"))
        if found:
            customer_id = found["id"]
    if not customer_id:
        raise ValueError("customer_id is required")

    payment = {
        "id": data.get("id") or f"p{uuid4().hex[:8]}",
        "customer_id": customer_id,
        "amount": float(data.get("amount") or 0),
        "date": data.get("date") or now_iso()[:10],
        "method": data.get("method"),
        "reference": data.get("reference"),
    }

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO payments (id, customer_id, amount, date, method, reference)
            VALUES (:id, :customer_id, :amount, :date, :method, :reference)
            """,
            payment,
        )
        conn.execute(
            "UPDATE customers SET balance = balance - ? WHERE id = ?",
            (payment["amount"], customer_id),
        )
        conn.execute(
            "INSERT INTO activity (id, type, message, created_at) VALUES (?, ?, ?, ?)",
            (f"a{uuid4().hex[:8]}", "payment", "Payment recorded", now_iso()),
        )
    return payment


def list_recent_activity() -> List[Dict[str, Any]]:
    return fetch_all(
        "SELECT type, message, created_at FROM activity ORDER BY created_at DESC LIMIT 10"
    )


def dashboard_summary() -> Dict[str, Any]:
    with get_db() as conn:
        total_customers = conn.execute("SELECT COUNT(*) AS c FROM customers").fetchone()["c"]
        revenue = conn.execute("SELECT COALESCE(SUM(amount), 0) AS s FROM invoices WHERE status = 'paid'").fetchone()["s"]
        outstanding = conn.execute("SELECT COALESCE(SUM(amount), 0) AS s FROM invoices WHERE status != 'paid'").fetchone()["s"]
        low_stock = conn.execute("SELECT COUNT(*) AS c FROM inventory_items WHERE stock <= reorder_level").fetchone()["c"]
    return {
        "customers": total_customers,
        "revenue": revenue,
        "outstanding": outstanding,
        "lowStockItems": low_stock,
    }


def top_overdue_customers(limit: int = 5) -> List[Dict[str, Any]]:
    return fetch_all(
        """
        SELECT id, company, name, balance, status
        FROM customers
        WHERE status = 'overdue'
        ORDER BY balance DESC
        LIMIT ?
        """,
        (limit,),
    )


def customers_summary() -> Dict[str, Any]:
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) AS c FROM customers").fetchone()["c"]
        overdue = conn.execute("SELECT COUNT(*) AS c FROM customers WHERE status = 'overdue'").fetchone()["c"]
        balance = conn.execute("SELECT COALESCE(SUM(balance), 0) AS s FROM customers").fetchone()["s"]
    return {"total": total, "overdue": overdue, "balance": balance}


def invoices_summary() -> Dict[str, Any]:
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) AS c FROM invoices").fetchone()["c"]
        paid = conn.execute("SELECT COUNT(*) AS c FROM invoices WHERE status = 'paid'").fetchone()["c"]
        pending = conn.execute("SELECT COUNT(*) AS c FROM invoices WHERE status = 'pending'").fetchone()["c"]
        overdue = conn.execute("SELECT COUNT(*) AS c FROM invoices WHERE status = 'overdue'").fetchone()["c"]
        amount = conn.execute("SELECT COALESCE(SUM(amount), 0) AS s FROM invoices").fetchone()["s"]
    return {"total": total, "paid": paid, "pending": pending, "overdue": overdue, "amount": amount}


def payments_summary() -> Dict[str, Any]:
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) AS c FROM payments").fetchone()["c"]
        amount = conn.execute("SELECT COALESCE(SUM(amount), 0) AS s FROM payments").fetchone()["s"]
        last = conn.execute("SELECT amount, date, method FROM payments ORDER BY date DESC LIMIT 1").fetchone()
    return {
        "total": total,
        "amount": amount,
        "last": dict(last) if last else None,
    }


def sync_summary() -> Dict[str, Any]:
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) AS c FROM sync_queue").fetchone()["c"]
        pending = conn.execute("SELECT COUNT(*) AS c FROM sync_queue WHERE status = 'pending'").fetchone()["c"]
        failed = conn.execute("SELECT COUNT(*) AS c FROM sync_queue WHERE status = 'failed'").fetchone()["c"]
        done = conn.execute("SELECT COUNT(*) AS c FROM sync_queue WHERE status = 'done'").fetchone()["c"]
    return {"total": total, "pending": pending, "failed": failed, "done": done}


def insert_sync_queue(item_type: str, payload: Dict[str, Any], status: str = "pending") -> Dict[str, Any]:
    item = {
        "id": f"q{uuid4().hex[:8]}",
        "type": item_type,
        "payload_json": json.dumps(payload),
        "status": status,
        "attempts": 0,
        "last_error": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO sync_queue (id, type, payload_json, status, attempts, last_error, created_at, updated_at)
            VALUES (:id, :type, :payload_json, :status, :attempts, :last_error, :created_at, :updated_at)
            """,
            item,
        )
    return item


def list_sync_queue(status: Optional[str] = None) -> List[Dict[str, Any]]:
    if status:
        return fetch_all(
            "SELECT * FROM sync_queue WHERE status = ? ORDER BY created_at DESC",
            (status,),
        )
    return fetch_all("SELECT * FROM sync_queue ORDER BY created_at DESC")


def update_sync_status(queue_id: str, status: str, error: Optional[str] = None) -> None:
    with get_db() as conn:
        conn.execute(
            """
            UPDATE sync_queue
            SET status = ?, attempts = attempts + 1, last_error = ?, updated_at = ?
            WHERE id = ?
            """,
            (status, error, now_iso(), queue_id),
        )


def get_sync_item(queue_id: str) -> Optional[Dict[str, Any]]:
    return fetch_one("SELECT * FROM sync_queue WHERE id = ?", (queue_id,))
