export type Customer = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  balance: number;
  status: "active" | "overdue" | "new";
  lastInvoice: string;
};

export type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  reorderLevel: number;
  price: number;
  unit: string;
};

export type Invoice = {
  id: string;
  number: string;
  customer: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
};

export const customers: Customer[] = [
  { id: "c1", name: "Rohan Mehta", company: "Mehta Traders", email: "rohan@mehta.in", phone: "+91 98200 11111", balance: 84500, status: "active", lastInvoice: "2026-05-12" },
  { id: "c2", name: "Aisha Khan", company: "Crescent Foods", email: "aisha@crescent.co", phone: "+91 99877 22222", balance: 215000, status: "overdue", lastInvoice: "2026-04-02" },
  { id: "c3", name: "David Park", company: "Northwind Tools", email: "david@northwind.com", phone: "+1 415 555 0144", balance: 0, status: "active", lastInvoice: "2026-05-21" },
  { id: "c4", name: "Sara Iyer", company: "Iyer Textiles", email: "sara@iyertextiles.in", phone: "+91 90000 33333", balance: 42500, status: "new", lastInvoice: "2026-05-25" },
  { id: "c5", name: "Marco Bianchi", company: "Bianchi & Co.", email: "marco@bianchi.it", phone: "+39 333 444 5555", balance: 67890, status: "active", lastInvoice: "2026-05-18" },
  { id: "c6", name: "Liu Wei", company: "Pacific Imports", email: "liu@pacific.cn", phone: "+86 138 0013 8000", balance: 198400, status: "overdue", lastInvoice: "2026-03-30" },
];

export const inventory: InventoryItem[] = [
  { id: "i1", sku: "TLY-001", name: "Premium Ledger Book", category: "Stationery", stock: 142, reorderLevel: 25, price: 450, unit: "pcs" },
  { id: "i2", sku: "TLY-002", name: "Carbon Receipt Pad", category: "Stationery", stock: 18, reorderLevel: 20, price: 120, unit: "pcs" },
  { id: "i3", sku: "TLY-003", name: "Steel Cash Box", category: "Hardware", stock: 34, reorderLevel: 10, price: 1850, unit: "pcs" },
  { id: "i4", sku: "TLY-004", name: "Invoice Printer Ribbon", category: "Hardware", stock: 6, reorderLevel: 12, price: 320, unit: "pcs" },
  { id: "i5", sku: "TLY-005", name: "Gel Pens (Box of 12)", category: "Stationery", stock: 88, reorderLevel: 30, price: 240, unit: "box" },
  { id: "i6", sku: "TLY-006", name: "Bonded Paper A4", category: "Paper", stock: 240, reorderLevel: 50, price: 380, unit: "ream" },
];

export const invoices: Invoice[] = [
  { id: "inv1", number: "INV-2026-0184", customer: "Mehta Traders", date: "2026-05-12", amount: 84500, status: "paid" },
  { id: "inv2", number: "INV-2026-0183", customer: "Crescent Foods", date: "2026-04-02", amount: 215000, status: "overdue" },
  { id: "inv3", number: "INV-2026-0182", customer: "Northwind Tools", date: "2026-05-21", amount: 32400, status: "paid" },
  { id: "inv4", number: "INV-2026-0181", customer: "Iyer Textiles", date: "2026-05-25", amount: 42500, status: "pending" },
  { id: "inv5", number: "INV-2026-0180", customer: "Bianchi & Co.", date: "2026-05-18", amount: 67890, status: "pending" },
];

export const revenueSeries = [
  { month: "Dec", revenue: 412000, expense: 286000 },
  { month: "Jan", revenue: 468000, expense: 301000 },
  { month: "Feb", revenue: 521000, expense: 318000 },
  { month: "Mar", revenue: 489000, expense: 295000 },
  { month: "Apr", revenue: 612000, expense: 342000 },
  { month: "May", revenue: 684000, expense: 358000 },
];

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
