import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, FileText, Send, X, Save, BadgePercent, Camera, Upload, ScanLine, RotateCw, CheckCircle2,
} from "lucide-react";
import { customers, inventory, formatINR } from "@/lib/mock-data";
import { Endpoints } from "@/lib/api";

export const Route = createFileRoute("/invoice")({
  head: () => ({ meta: [{ title: "New Invoice — Tally AI" }] }),
  component: InvoiceForm,
});

type LineItem = { id: string; itemId: string; qty: number; price: number };
type OcrItem = { description: string; qty: number; price: number };

function InvoiceForm() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lines, setLines] = useState<LineItem[]>([
    { id: "1", itemId: inventory[0].id, qty: 2, price: inventory[0].price },
  ]);
  const [customerId, setCustomerId] = useState(customers[0].id);
  const [discountPct, setDiscountPct] = useState(0);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrState, setOcrState] = useState<"idle" | "scanning" | "done">("idle");
  const [ocrText, setOcrText] = useState("");
  const [ocrItems, setOcrItems] = useState<OcrItem[]>([]);

  const addLine = () =>
    setLines((l) => [...l, { id: Math.random().toString(36).slice(2), itemId: inventory[0].id, qty: 1, price: inventory[0].price }]);
  const removeLine = (id: string) => setLines((l) => l.filter((x) => x.id !== id));

  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const discount = Math.round((subtotal * discountPct) / 100);
  const taxable = subtotal - discount;
  const tax = Math.round(taxable * 0.18);
  const total = taxable + tax;

  const sendToTally = async () => {
    try {
      const lineItems = lines.map((l) => ({ itemId: l.itemId, qty: l.qty, price: l.price }));
      const payload = { amount: total, lineItems, status: "pending", customerId };
      const created = await Endpoints.createInvoice(payload as any);
      await Endpoints.sendInvoice({ number: created?.number ?? "" });
      toast.success("Invoice posted to Tally", { description: `Total ${formatINR(total)}` });
      setTimeout(() => navigate({ to: "/" }), 700);
    } catch (err) {
      console.warn("Invoice send failed:", err);
      toast.error("Invoice send failed. Check the backend.");
    }
  };
  const savePending = () => {
    toast.info("Saved as pending (offline) — will sync when online", { description: "Visible in Sync Queue" });
  };
  const cancel = () => navigate({ to: "/" });

  const startOcr = async (source: "camera" | "file", file?: File) => {
    setOcrOpen(true);
    setOcrState("scanning");
    setOcrText("");
    setOcrItems([]);
    toast.info(source === "camera" ? "Capturing bill..." : "Uploading bill...");
    if (!file) {
      setOcrState("done");
      setOcrText("No file selected.");
      return;
    }
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await Endpoints.ocrProcess(form);
      if (res?.error) {
        setOcrText(`OCR error: ${res.error}`);
      } else {
        setOcrText(res?.text || "No text detected.");
        const items = Array.isArray(res?.items) ? (res.items as OcrItem[]) : [];
        setOcrItems(items);
        if (items.length) {
          const nextLines = items.map((item) => {
            const match = inventory.find((inv) => inv.name.toLowerCase().includes(item.description.toLowerCase()));
            return {
              id: Math.random().toString(36).slice(2),
              itemId: match?.id ?? inventory[0].id,
              qty: item.qty,
              price: item.price,
            };
          });
          setLines(nextLines);
          toast.success("Invoice preview updated from scan");
        }
      }
      setOcrState("done");
    } catch (err) {
      console.warn("OCR failed:", err);
      setOcrText("OCR failed. Check the backend and try again.");
      setOcrState("done");
      toast.error("OCR failed");
    }
  };

  const useExtracted = () => {
    if (!ocrItems.length) {
      toast.error("No extracted items available");
      return;
    }
    const nextLines = ocrItems.map((item) => {
      const match = inventory.find((inv) => inv.name.toLowerCase().includes(item.description.toLowerCase()));
      return {
        id: Math.random().toString(36).slice(2),
        itemId: match?.id ?? inventory[0].id,
        qty: item.qty,
        price: item.price,
      };
    });
    setLines(nextLines);
    toast.success("Extracted items added to invoice");
    setOcrOpen(false);
    setOcrState("idle");
  };

  return (
    <AppShell
      title="New Invoice"
      subtitle="Draft a GST-ready invoice in seconds."
      actions={
        <>
          <Button variant="ghost" className="rounded-full" onClick={cancel}>
            <X className="mr-1.5 h-4 w-4" /> Cancel
          </Button>
          <Button variant="outline" className="rounded-full" onClick={savePending}>
            <Save className="mr-1.5 h-4 w-4" /> Save as Pending
          </Button>
          <Button className="rounded-full bg-primary shadow-elegant" onClick={sendToTally}>
            <Send className="mr-1.5 h-4 w-4" /> Send to Tally
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="col-span-1 space-y-6 lg:col-span-8">
          {/* OCR / Bill scan */}
          <Card className="reveal border-border/60 bg-gradient-to-br from-accent/5 to-transparent shadow-soft">
            <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
                <ScanLine className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-display text-base font-bold">Scan a bill to auto-fill</p>
                <p className="text-xs text-muted-foreground">Use camera or upload — Tally AI extracts line items.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => fileRef.current?.click()}>
                  <Camera className="mr-1.5 h-4 w-4" /> Scan Bill
                </Button>
                <Button variant="outline" className="rounded-full" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-1.5 h-4 w-4" /> Upload Bill
                </Button>
                <input
                  ref={fileRef} type="file" accept="image/*,application/pdf" hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) startOcr("file", f);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="reveal reveal-1 border-border/60 shadow-soft">
            <CardContent className="space-y-5 p-6">
              <h2 className="font-display text-lg font-bold">Bill To</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Customer</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.company} — {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Invoice Date</Label>
                  <Input type="date" defaultValue="2026-05-28" className="h-11 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label>Invoice #</Label>
                  <Input defaultValue="INV-2026-0185" className="h-11 rounded-lg font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input type="date" defaultValue="2026-06-27" className="h-11 rounded-lg" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="reveal reveal-2 border-border/60 shadow-soft">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Line items</h2>
                <Button onClick={addLine} size="sm" variant="outline" className="rounded-full">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {lines.map((line, idx) => {
                  const item = inventory.find((i) => i.id === line.itemId)!;
                  return (
                    <div
                      key={line.id}
                      className={`reveal reveal-${(idx % 5) + 1} grid grid-cols-12 items-end gap-3 rounded-lg border border-border/60 bg-muted/30 p-3`}
                    >
                      <div className="col-span-12 space-y-1.5 md:col-span-5">
                        <Label className="text-[11px]">Item</Label>
                        <Select
                          value={line.itemId}
                          onValueChange={(v) => {
                            const it = inventory.find((i) => i.id === v)!;
                            setLines((ls) => ls.map((l) => l.id === line.id ? { ...l, itemId: v, price: it.price } : l));
                          }}
                        >
                          <SelectTrigger className="h-10 rounded-md bg-card"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {inventory.map((it) => (
                              <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4 space-y-1.5 md:col-span-2">
                        <Label className="text-[11px]">Qty</Label>
                        <Input
                          type="number"
                          value={line.qty}
                          onChange={(e) => setLines((ls) => ls.map((l) => l.id === line.id ? { ...l, qty: +e.target.value } : l))}
                          className="h-10 rounded-md bg-card text-right font-mono"
                        />
                      </div>
                      <div className="col-span-4 space-y-1.5 md:col-span-2">
                        <Label className="text-[11px]">Price</Label>
                        <Input
                          type="number"
                          value={line.price}
                          onChange={(e) => setLines((ls) => ls.map((l) => l.id === line.id ? { ...l, price: +e.target.value } : l))}
                          className="h-10 rounded-md bg-card text-right font-mono"
                        />
                      </div>
                      <div className="col-span-3 space-y-1.5 md:col-span-2">
                        <Label className="text-[11px]">Total</Label>
                        <div className="flex h-10 items-center justify-end rounded-md bg-card px-3 font-mono text-sm font-semibold tabular-nums">
                          {formatINR(line.qty * line.price)}
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost" size="icon"
                          aria-label="Remove item"
                          onClick={() => removeLine(line.id)}
                          className="h-10 w-10 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="col-span-12 -mt-1 text-[11px] text-muted-foreground">
                        SKU {item.sku} · {item.stock} {item.unit} in stock
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="reveal reveal-3 border-border/60 shadow-soft">
            <CardContent className="p-6">
              <Label>Notes for customer</Label>
              <Textarea
                placeholder="Thank you for your business. Payment due within 30 days."
                className="mt-1.5 min-h-[100px] rounded-lg"
              />
            </CardContent>
          </Card>
        </div>

        <div className="col-span-1 lg:col-span-4">
          <Card className="reveal reveal-2 sticky top-24 border-border/60 shadow-elegant">
            <CardContent className="p-6">
              <h3 className="font-display text-base font-bold">Summary</h3>
              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono tabular-nums">{formatINR(subtotal)}</span></div>
                <div className="flex items-center justify-between">
                  <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
                    <DialogTrigger asChild>
                      <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-accent">
                        <BadgePercent className="h-3.5 w-3.5" /> Discount ({discountPct}%)
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Apply Discount</DialogTitle></DialogHeader>
                      <div className="space-y-2">
                        <Label>Discount %</Label>
                        <Input
                          type="number" min={0} max={100}
                          value={discountPct}
                          onChange={(e) => setDiscountPct(Math.max(0, Math.min(100, +e.target.value)))}
                          className="h-11 rounded-lg font-mono"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" className="rounded-full" onClick={() => { setDiscountPct(0); setDiscountOpen(false); }}>Remove</Button>
                        <Button className="rounded-full bg-primary" onClick={() => { setDiscountOpen(false); toast.success(`${discountPct}% discount applied`); }}>Apply</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <span className="font-mono tabular-nums text-destructive">−{formatINR(discount)}</span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">GST (18%)</span><span className="font-mono tabular-nums">{formatINR(tax)}</span></div>
                <div className="my-3 h-px bg-border" />
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">Total due</span>
                  <span className="font-display text-2xl font-bold tabular-nums text-primary">{formatINR(total)}</span>
                </div>
              </div>
              <Button className="mt-5 w-full rounded-full bg-primary shadow-elegant" onClick={sendToTally}>
                <Send className="mr-1.5 h-4 w-4" /> Create & Send to Tally
              </Button>
              <Button variant="outline" className="mt-2 w-full rounded-full" onClick={savePending}>
                <Save className="mr-1.5 h-4 w-4" /> Save as Pending
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Sent via Tally AI · auto-records to your ledger
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* OCR dialog */}
      <Dialog open={ocrOpen} onOpenChange={(o) => { setOcrOpen(o); if (!o) setOcrState("idle"); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-4 w-4" /> Bill Scan
            </DialogTitle>
          </DialogHeader>
          {ocrState === "scanning" && (
            <div className="flex flex-col items-center gap-3 py-6 text-sm text-muted-foreground">
              <RotateCw className="h-6 w-6 animate-spin text-accent" />
              Extracting text…
            </div>
          )}
          {ocrState === "done" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> Text extracted
              </div>
              <Textarea readOnly value={ocrText} className="min-h-[180px] rounded-lg font-mono text-xs" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => fileRef.current?.click()}>
              <RotateCw className="mr-1.5 h-4 w-4" /> Retry
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={() => setOcrOpen(false)}>
              <X className="mr-1.5 h-4 w-4" /> Close
            </Button>
            <Button className="rounded-full bg-primary" disabled={ocrState !== "done" || !ocrItems.length} onClick={useExtracted}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Use Extracted Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
