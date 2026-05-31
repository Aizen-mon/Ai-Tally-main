import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus, Search, AlertTriangle, Pencil, Download, RefreshCw,
} from "lucide-react";
import { inventory as seed, formatINR, type InventoryItem } from "@/lib/mock-data";
import { Endpoints } from "@/lib/api";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Tally AI" }] }),
  component: Inventory,
});

function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>(seed);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [stockDraft, setStockDraft] = useState(0);

  useEffect(() => {
    Endpoints.inventory()
      .then((data) => { if (Array.isArray(data) && data.length) setItems(data); })
      .catch((e) => {
        console.warn("Backend unreachable, using mock data:", e);
        toast.warning("Backend offline — showing demo data");
      });
  }, []);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (cat !== "All" && i.category !== cat) return false;
      if (lowOnly && i.stock > i.reorderLevel) return false;
      if (query && !`${i.name} ${i.sku} ${i.category}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [items, query, cat, lowOnly]);

  const totalValue = items.reduce((s, i) => s + i.price * i.stock, 0);
  const lowStock = items.filter((i) => i.stock <= i.reorderLevel);

  const exportCsv = () => {
    const rows = [["SKU", "Name", "Category", "Price", "Stock", "Unit"]];
    items.forEach((i) => rows.push([i.sku, i.name, i.category, String(i.price), String(i.stock), i.unit]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "inventory.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Inventory exported");
  };

  const saveStock = () => {
    if (!editing) return;
    setItems((xs) => xs.map((x) => (x.id === editing.id ? { ...x, stock: stockDraft } : x)));
    toast.success(`${editing.name} stock updated to ${stockDraft}`);
    setEditing(null);
  };

  return (
    <AppShell
      title="Inventory"
      subtitle={`${items.length} SKUs · Stock value ${formatINR(totalValue)}`}
      actions={
        <>
          <Button variant="outline" className="rounded-full" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" /> Export / Sync
          </Button>
          <Button className="rounded-full bg-primary shadow-elegant" onClick={() => toast.info("Add Item dialog")}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Item
          </Button>
        </>
      }
    >
      {lowStock.length > 0 && (
        <Card className="reveal mb-6 border-warning/40 bg-warning/10 shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/30">
              <AlertTriangle className="h-4 w-4 text-warning-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{lowStock.length} item{lowStock.length > 1 ? "s" : ""} below reorder level</p>
              <p className="text-xs text-muted-foreground">{lowStock.map((l) => l.name).join(" · ")}</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-full border-warning/60" onClick={() => toast.success("Reorder draft created")}>
              Reorder all
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="reveal reveal-1 mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SKU, name, category…"
            className="h-11 rounded-full border-border/70 bg-card pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["All", "Stationery", "Hardware", "Paper"].map((t) => (
            <Button key={t} variant={cat === t ? "default" : "outline"} className="rounded-full" onClick={() => setCat(t)}>
              {t}
            </Button>
          ))}
          <Button
            variant={lowOnly ? "default" : "outline"}
            className={`rounded-full ${lowOnly ? "bg-destructive hover:bg-destructive/90" : ""}`}
            onClick={() => setLowOnly((v) => !v)}
          >
            <AlertTriangle className="mr-1.5 h-4 w-4" /> Low stock
          </Button>
        </div>
      </div>

      <Card className="reveal reveal-2 border-border/60 shadow-soft">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 text-left font-medium">SKU</th>
                  <th className="px-5 py-3.5 text-left font-medium">Item</th>
                  <th className="px-5 py-3.5 text-left font-medium">Category</th>
                  <th className="px-5 py-3.5 text-right font-medium">Price</th>
                  <th className="px-5 py-3.5 text-right font-medium">Stock</th>
                  <th className="px-5 py-3.5 text-left font-medium">Status</th>
                  <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((it) => {
                  const low = it.stock <= it.reorderLevel;
                  return (
                    <tr key={it.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{it.sku}</td>
                      <td className="px-5 py-3.5 font-medium text-foreground">{it.name}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{it.category}</td>
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums">{formatINR(it.price)}</td>
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums">
                        {it.stock} <span className="text-xs text-muted-foreground">{it.unit}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge className={`rounded-full border-0 ${low ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
                          {low ? "Low stock" : "In stock"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Dialog open={editing?.id === it.id} onOpenChange={(o) => { if (!o) setEditing(null); }}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full"
                              onClick={() => { setEditing(it); setStockDraft(it.stock); }}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Update Stock
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Update Stock · {it.name}</DialogTitle></DialogHeader>
                            <div className="space-y-2">
                              <Label>New stock ({it.unit})</Label>
                              <Input
                                type="number"
                                value={stockDraft}
                                onChange={(e) => setStockDraft(+e.target.value)}
                                className="h-11 rounded-lg font-mono"
                              />
                              <p className="text-xs text-muted-foreground">Reorder level: {it.reorderLevel}</p>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" className="rounded-full" onClick={() => setEditing(null)}>Cancel</Button>
                              <Button className="rounded-full bg-primary" onClick={saveStock}>
                                <RefreshCw className="mr-1.5 h-4 w-4" /> Save
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">No items match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
