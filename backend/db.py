import os
import sqlite3
from datetime import datetime

from config import DB_PATH, DATA_DIR


def now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_dirs() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)


def apply_migrations() -> None:
    ensure_dirs()
    with get_db() as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
        )
        applied = {
            row["id"]
            for row in conn.execute("SELECT id FROM _migrations").fetchall()
        }

        migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
        if not os.path.isdir(migrations_dir):
            return

        files = sorted(f for f in os.listdir(migrations_dir) if f.endswith(".sql"))
        for fname in files:
            if fname in applied:
                continue
            path = os.path.join(migrations_dir, fname)
            with open(path, "r", encoding="utf-8") as handle:
                script = handle.read()
            conn.executescript(script)
            conn.execute(
                "INSERT INTO _migrations (id, applied_at) VALUES (?, ?)",
                (fname, now_iso()),
            )


def seed_if_empty(conn: sqlite3.Connection) -> None:
    cur = conn.execute("SELECT COUNT(*) AS c FROM customers")
    if cur.fetchone()["c"] > 0:
        return

    customers = [
        {"id": "c1", "name": "Rohan Mehta", "company": "Mehta Traders", "email": "rohan@mehta.in", "phone": "+91 98200 11111", "balance": 84500, "status": "active", "last_invoice": "2026-05-12"},
        {"id": "c2", "name": "Aisha Khan", "company": "Crescent Foods", "email": "aisha@crescent.co", "phone": "+91 99877 22222", "balance": 215000, "status": "overdue", "last_invoice": "2026-04-02"},
        {"id": "c3", "name": "David Park", "company": "Northwind Tools", "email": "david@northwind.com", "phone": "+1 415 555 0144", "balance": 0, "status": "active", "last_invoice": "2026-05-21"},
        {"id": "c4", "name": "Sara Iyer", "company": "Iyer Textiles", "email": "sara@iyertextiles.in", "phone": "+91 90000 33333", "balance": 42500, "status": "new", "last_invoice": "2026-05-25"},
        {"id": "c5", "name": "Marco Bianchi", "company": "Bianchi & Co.", "email": "marco@bianchi.it", "phone": "+39 333 444 5555", "balance": 67890, "status": "active", "last_invoice": "2026-05-18"},
        {"id": "c6", "name": "Liu Wei", "company": "Pacific Imports", "email": "liu@pacific.cn", "phone": "+86 138 0013 8000", "balance": 198400, "status": "overdue", "last_invoice": "2026-03-30"},
    ]

    inventory = [
        {"id": "i1", "sku": "TLY-001", "name": "Premium Ledger Book", "category": "Stationery", "stock": 142, "reorder_level": 25, "price": 450, "unit": "pcs"},
        {"id": "i2", "sku": "TLY-002", "name": "Carbon Receipt Pad", "category": "Stationery", "stock": 18, "reorder_level": 20, "price": 120, "unit": "pcs"},
        {"id": "i3", "sku": "TLY-003", "name": "Steel Cash Box", "category": "Hardware", "stock": 34, "reorder_level": 10, "price": 1850, "unit": "pcs"},
        {"id": "i4", "sku": "TLY-004", "name": "Invoice Printer Ribbon", "category": "Hardware", "stock": 6, "reorder_level": 12, "price": 320, "unit": "pcs"},
        {"id": "i5", "sku": "TLY-005", "name": "Gel Pens (Box of 12)", "category": "Stationery", "stock": 88, "reorder_level": 30, "price": 240, "unit": "box"},
        {"id": "i6", "sku": "TLY-006", "name": "Bonded Paper A4", "category": "Paper", "stock": 240, "reorder_level": 50, "price": 380, "unit": "ream"},
    ]

    invoices = [
        {"id": "inv1", "number": "INV-2026-0184", "customer_id": "c1", "date": "2026-05-12", "amount": 84500, "status": "paid"},
        {"id": "inv2", "number": "INV-2026-0183", "customer_id": "c2", "date": "2026-04-02", "amount": 215000, "status": "overdue"},
        {"id": "inv3", "number": "INV-2026-0182", "customer_id": "c3", "date": "2026-05-21", "amount": 32400, "status": "paid"},
        {"id": "inv4", "number": "INV-2026-0181", "customer_id": "c4", "date": "2026-05-25", "amount": 42500, "status": "pending"},
        {"id": "inv5", "number": "INV-2026-0180", "customer_id": "c5", "date": "2026-05-18", "amount": 67890, "status": "pending"},
    ]

    conn.executemany(
        """
        INSERT INTO customers (id, name, company, email, phone, balance, status, last_invoice)
        VALUES (:id, :name, :company, :email, :phone, :balance, :status, :last_invoice)
        """,
        customers,
    )
    conn.executemany(
        """
        INSERT INTO inventory_items (id, sku, name, category, stock, reorder_level, price, unit, updated_at)
        VALUES (:id, :sku, :name, :category, :stock, :reorder_level, :price, :unit, :updated_at)
        """,
        [{**i, "updated_at": now_iso()} for i in inventory],
    )
    conn.executemany(
        """
        INSERT INTO invoices (id, number, customer_id, date, amount, status, created_at)
        VALUES (:id, :number, :customer_id, :date, :amount, :status, :created_at)
        """,
        [{**inv, "created_at": now_iso()} for inv in invoices],
    )
    conn.executemany(
        """
        INSERT INTO activity (id, type, message, created_at)
        VALUES (:id, :type, :message, :created_at)
        """,
        [
            {"id": "a1", "type": "invoice", "message": "Invoice INV-2026-0184 paid", "created_at": now_iso()},
            {"id": "a2", "type": "inventory", "message": "Low stock alert: Invoice Printer Ribbon", "created_at": now_iso()},
            {"id": "a3", "type": "payment", "message": "Payment received from Iyer Textiles", "created_at": now_iso()},
        ],
    )


def init_db() -> None:
    apply_migrations()
    with get_db() as conn:
        seed_if_empty(conn)
