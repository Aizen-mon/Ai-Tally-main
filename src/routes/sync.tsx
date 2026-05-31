import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, RotateCw, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

export const Route = createFileRoute("/sync")({
  head: () => ({ meta: [{ title: "Sync Queue — Tally AI" }] }),
  component: SyncPage,
});

type QItem = { id: string; label: string; type: string; status: "pending" | "failed" | "done" };

const initial: QItem[] = [
  { id: "q1", label: "INV-2026-0185 → Tally", type: "Invoice", status: "pending" },
  { id: "q2", label: "Payment ₹42,500 · Iyer Textiles", type: "Payment", status: "pending" },
  { id: "q3", label: "Stock update · TLY-004", type: "Inventory", status: "failed" },
  { id: "q4", label: "INV-2026-0184 → Tally", type: "Invoice", status: "done" },
];

function SyncPage() {
  const [items, setItems] = useState<QItem[]>(initial);
  const pending = items.filter((i) => i.status === "pending").length;
  const failed = items.filter((i) => i.status === "failed").length;

  const retryAll = () => {
    toast.info("Retrying failed syncs…");
    setTimeout(() => {
      setItems((xs) => xs.map((x) => (x.status === "failed" ? { ...x, status: "done" } : x)));
      toast.success("All failed items resynced");
    }, 1000);
  };

  const retryOne = (id: string) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: "done" } : x)));
    toast.success("Item synced");
  };

  return (
    <AppShell
      title="Sync Queue"
      subtitle={`${pending} pending · ${failed} failed`}
      actions={
        <>
          <Button variant="outline" className="rounded-full" onClick={() => toast.info("Queue refreshed")}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
          <Button className="rounded-full bg-primary shadow-elegant" onClick={retryAll}>
            <RotateCw className="mr-1.5 h-4 w-4" /> Retry Failed Syncs
          </Button>
        </>
      }
    >
      <Card className="reveal border-border/60 shadow-soft">
        <CardContent className="p-0">
          <ul className="divide-y divide-border/60">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  {it.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : it.status === "failed" ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.label}</p>
                  <p className="text-xs text-muted-foreground">{it.type}</p>
                </div>
                <Badge
                  className={`rounded-full border-0 capitalize ${
                    it.status === "done"
                      ? "bg-success/15 text-success"
                      : it.status === "failed"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-warning/20 text-warning-foreground"
                  }`}
                >
                  {it.status}
                </Badge>
                {it.status === "failed" && (
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => retryOne(it.id)}>
                    <RotateCw className="mr-1.5 h-3.5 w-3.5" /> Retry
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </AppShell>
  );
}
