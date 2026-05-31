from dataclasses import dataclass
from typing import Optional


@dataclass
class Customer:
    id: str
    name: str
    company: str
    email: str
    phone: str
    balance: float
    status: str
    last_invoice: Optional[str]


@dataclass
class InventoryItem:
    id: str
    sku: str
    name: str
    category: str
    stock: int
    reorder_level: int
    price: float
    unit: str


@dataclass
class Invoice:
    id: str
    number: str
    customer_id: str
    date: str
    amount: float
    status: str


@dataclass
class Payment:
    id: str
    customer_id: str
    amount: float
    date: str
    method: Optional[str]
    reference: Optional[str]


@dataclass
class SyncQueueItem:
    id: str
    type: str
    payload: str
    status: str
    attempts: int
    last_error: Optional[str]
    created_at: str
    updated_at: str
