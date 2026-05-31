// Tiny REST client for the Flask backend.
// Set VITE_API_BASE_URL to your ngrok https URL (no trailing slash), e.g.
//   VITE_API_BASE_URL=https://abcd-1234.ngrok-free.app/api
// Locally you can also use http://127.0.0.1:5000/api when running `bun dev`
// directly on your machine.

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text || `Request failed: ${res.status}`);
  }
  // Some endpoints (e.g. send_invoice) may return empty bodies
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json") ? ((await res.json()) as T) : (undefined as T);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Typed endpoint helpers — extend as you wire more screens.
import type { InventoryItem, Customer, Invoice } from "./mock-data";

export const Endpoints = {
  // Dashboard
  dashboardSummary: () => api.get<unknown>("/dashboard_summary"),
  recentActivity: () => api.get<unknown[]>("/recent_activity"),
  tallySnapshot: () => api.get<unknown>("/tally_snapshot"),

  // Inventory
  inventory: () => api.get<InventoryItem[]>("/inventory"),
  products: () => api.get<InventoryItem[]>("/products"),
  createProduct: (item: Partial<InventoryItem>) => api.post<InventoryItem>("/products", item),

  // Customers
  customers: () => api.get<Customer[]>("/customers"),
  customer: (id: string) => api.get<Customer>(`/customers/${id}`),
  customerPayments: (id: string) => api.get<unknown[]>(`/customers/${id}/payments`),
  createCustomer: (c: Partial<Customer>) => api.post<Customer>("/customers", c),

  // Invoices
  invoices: () => api.get<Invoice[]>("/invoices"),
  invoice: (id: string) => api.get<Invoice>(`/invoices/${id}`),
  createInvoice: (inv: Partial<Invoice>) => api.post<Invoice>("/invoices", inv),
  sendInvoice: (payload: unknown) => api.post<{ ok: boolean }>("/send_invoice", payload),

  // Assistant
  parse: (text: string) => api.post<unknown>("/parse", { text }),
  suggestedPrompts: () => api.get<string[]>("/suggested_prompts"),
  assistantStatus: () => api.get<unknown>("/assistant/status"),
  assistantSummary: () => api.get<unknown>("/assistant/summary"),

  // OCR / Voice
  ocrProcess: (form: FormData) =>
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000/api"}/ocr/process`, {
      method: "POST",
      body: form,
    }).then((r) => r.json()),
  voiceTranscribe: (form: FormData) =>
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000/api"}/voice/transcribe`, {
      method: "POST",
      body: form,
    }).then((r) => r.json()),
  voiceProcess: (payload: unknown) => api.post<unknown>("/voice/process", payload),
};
