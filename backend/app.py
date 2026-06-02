from datetime import date
import sqlite3
from uuid import uuid4

from flask import Flask, jsonify, request
from flask_cors import CORS

from db import get_db, init_db, now_iso
import repositories
from routes import api as api_bp
from services.tally_service import enqueue_invoice

app = Flask(__name__)
CORS(app)
app.register_blueprint(api_bp, url_prefix="/api")


def to_customer(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "company": row["company"],
        "email": row["email"],
        "phone": row["phone"],
        "balance": row["balance"],
        "status": row["status"],
        "lastInvoice": row["last_invoice"],
    }


def to_inventory(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "sku": row["sku"],
        "name": row["name"],
        "category": row["category"],
        "stock": row["stock"],
        "reorderLevel": row["reorder_level"],
        "price": row["price"],
        "unit": row["unit"],
    }


def to_invoice(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "number": row["number"],
        "customer": row["company"],
        "date": row["date"],
        "amount": row["amount"],
        "status": row["status"],
    }


@app.errorhandler(404)
def not_found(_):
    return jsonify({"error": "not found"}), 404


@app.errorhandler(Exception)
def on_error(err):
    return jsonify({"error": str(err)}), 500


@app.get("/api/inventory")
def list_inventory():
    rows = repositories.list_inventory()
    return jsonify([to_inventory(r) for r in rows])


@app.get("/api/products")
def list_products():
    return list_inventory()


@app.post("/api/products")
def create_product():
    data = request.get_json(silent=True) or {}
    item = {
        "id": data.get("id") or f"i{uuid4().hex[:8]}",
        "sku": data.get("sku") or f"SKU-{uuid4().hex[:4].upper()}",
        "name": data.get("name") or "New Item",
        "category": data.get("category") or "Misc",
        "stock": int(data.get("stock") or 0),
        "reorder_level": int(data.get("reorderLevel") or data.get("reorder_level") or 0),
        "price": float(data.get("price") or 0),
        "unit": data.get("unit") or "pcs",
        "updated_at": now_iso(),
    }
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO inventory_items (id, sku, name, category, stock, reorder_level, price, unit, updated_at)
            VALUES (:id, :sku, :name, :category, :stock, :reorder_level, :price, :unit, :updated_at)
            """,
            item,
        )
        conn.execute(
            "INSERT INTO activity (id, type, message, created_at) VALUES (?, ?, ?, ?)",
            (f"a{uuid4().hex[:8]}", "inventory", f"Item created: {item['name']}", now_iso()),
        )
    return jsonify(to_inventory(item)), 201


@app.get("/api/customers")
def list_customers():
    rows = repositories.list_customers()
    return jsonify([to_customer(r) for r in rows])


@app.get("/api/customers/<cid>")
def get_customer(cid: str):
    row = repositories.get_customer(cid)
    if not row:
        return jsonify({"error": "customer not found"}), 404
    return jsonify(to_customer(row))


@app.post("/api/customers")
def create_customer():
    data = request.get_json(silent=True) or {}
    customer = repositories.create_customer(data)
    return jsonify(to_customer(customer)), 201


@app.get("/api/customers/<cid>/payments")
def customer_payments(cid: str):
    rows = repositories.list_customer_payments(cid)
    return jsonify(rows)


@app.get("/api/invoices")
def list_invoices():
    rows = repositories.list_invoices()
    return jsonify([to_invoice(r) for r in rows])


@app.get("/api/invoices/<iid>")
def get_invoice(iid: str):
    row = repositories.get_invoice(iid)
    if not row:
        return jsonify({"error": "invoice not found"}), 404
    return jsonify(to_invoice(row))


@app.post("/api/invoices")
def create_invoice():
    data = request.get_json(silent=True) or {}
    try:
        invoice = repositories.create_invoice(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    enqueue_invoice(invoice)
    return jsonify({"id": invoice["id"], "number": invoice["number"], "amount": invoice["amount"], "status": invoice["status"]}), 201


@app.post("/api/send_invoice")
def send_invoice():
    data = request.get_json(silent=True) or {}
    number = data.get("number") or "(unspecified)"
    repositories.insert_sync_queue("invoice_send", {"number": number, "queued_at": now_iso()})
    with get_db() as conn:
        conn.execute(
            "INSERT INTO activity (id, type, message, created_at) VALUES (?, ?, ?, ?)",
            (f"a{uuid4().hex[:8]}", "invoice", f"Invoice {number} sent to Tally", now_iso()),
        )
    return jsonify({"ok": True})


@app.get("/api/dashboard_summary")
def dashboard_summary():
    with get_db() as conn:
        total_customers = conn.execute("SELECT COUNT(*) AS c FROM customers").fetchone()["c"]
        revenue = conn.execute("SELECT COALESCE(SUM(amount), 0) AS s FROM invoices WHERE status = 'paid'").fetchone()["s"]
        outstanding = conn.execute("SELECT COALESCE(SUM(amount), 0) AS s FROM invoices WHERE status != 'paid'").fetchone()["s"]
        low_stock = conn.execute("SELECT COUNT(*) AS c FROM inventory_items WHERE stock <= reorder_level").fetchone()["c"]

    return jsonify(
        {
            "customers": total_customers,
            "revenue": revenue,
            "outstanding": outstanding,
            "lowStockItems": low_stock,
        }
    )


@app.get("/api/recent_activity")
def recent_activity():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT type, message, created_at FROM activity ORDER BY created_at DESC LIMIT 10"
        ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.get("/api/tally_snapshot")
def tally_snapshot():
    with get_db() as conn:
        pending = conn.execute("SELECT COUNT(*) AS c FROM invoices WHERE status = 'pending'").fetchone()["c"]
    return jsonify({"status": "ok", "lastSync": now_iso(), "pendingInvoices": pending})


@app.get("/api/suggested_prompts")
def suggested_prompts():
    return jsonify([
        "Summarise May P&L",
        "Top 5 overdue customers",
        "What needs reordering?",
        "Forecast next quarter",
    ])


@app.get("/api/assistant/status")
def assistant_status():
    return jsonify({"status": "online", "latencyMs": 120})


@app.get("/api/assistant/summary")
def assistant_summary():
    return jsonify({"summary": "Assistant demo mode: connect to your ledger to enable insights."})


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
