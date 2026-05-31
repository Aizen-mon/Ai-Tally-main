import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Mail, Phone, Plus, Search, IndianRupee, BellRing, History,
  Copy, Send, AlertTriangle, Clock, MessageSquare, Wallet,
} from "lucide-react";
import { customers as seed, invoices as invSeed, formatINR, type Customer, type Invoice } from "@/lib/mock-data";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — Tally AI" }] }),
  component: Customers,
});

const initials = (n: string) => n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
const statusStyle: Record<string, string> = {
  active: "bg-success/15 text-success",
  overdue: "bg-destructive/15 text-destructive",
  new: "bg-accent/15 text-accent",
};

const daysSince = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));

const buildReminder = (c: Customer) => {
  const days = daysSince(c.lastInvoice);
  const tone = days > 45 ? "URGENT" : days > 30 ? "Friendly follow-up" : "Gentle reminder";
  return `Subject: ${tone} — Outstanding ${formatINR(c.balance)} (Inv ${c.lastInvoice})

Dear ${c.name},

This is a reminder that ${formatINR(c.balance)} remains outstanding on your account with ${c.company}, due since ${c.lastInvoice} (${days} days ago).

Kindly arrange payment at your earliest convenience. If already paid, please share the transaction reference so we can reconcile.

Thank you,
Tally AI Accounts`;
};

type Channel = "Email" | "SMS" | "WhatsApp";

function Customers() {
  const [list, setList] = useState<Customer[]>(seed);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");

  const [payOpen, setPayOpen] = useState<Customer | null>(null);
  const [payAmt, setPayAmt] = useState(0);

  const [remindOpen, setRemindOpen] = useState<Customer | null>(null);
  const [remindMsg, setRemindMsg] = useState("");
  const [channel, setChannel] = useState<Channel>("Email");

  const [history, setHistory] = useState<Customer | null>(null);
  const [histFilter, setHistFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");

  const filtered = list.filter((c) => {
    if (filter !== "All" && c.status !== filter.toLowerCase()) return false;
    if (query && !`${c.name} ${c.company} ${c.email}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const receivables = useMemo(
    () =>
      list
        .filter((c) => c.balance > 0)
        .map((c) => ({ ...c, days: daysSince(c.lastInvoice) }))
        .sort((a, b) => b.days - a.days),
    [list],
  );
  const totalDue = receivables.reduce((s, c) => s + c.balance, 0);
  const overdueDue = receivables.filter((c) => c.days > 30).reduce((s, c) => s + c.balance, 0);

  const recordPayment = () => {
    if (!payOpen) return;
    setList((xs) => xs.map((x) => (x.id === payOpen.id ? { ...x, balance: Math.max(0, x.balance - payAmt) } : x)));
    toast.success(`Payment ${formatINR(payAmt)} recorded for ${payOpen.company}`);
    setPayOpen(null);
    setPayAmt(0);
  };

  const openReminder = (c: Customer) => {
    setRemindOpen(c);
    setRemindMsg(buildReminder(c));
    setChannel("Email");
  };
  const sendReminder = () => {
    if (!remindOpen) return;
    toast.success(`${channel} reminder sent to ${remindOpen.name} · ${formatINR(remindOpen.balance)} due`);
    setRemindOpen(null);
  };
  const copyReminder = async () => {
    try {
      await navigator.clipboard.writeText(remindMsg);
      toast.success("Reminder copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  const customerInvoices = (c: Customer | null): Invoice[] =>
    c ? invSeed.filter((i) => i.customer === c.company) : [];
  const histList = customerInvoices(history).filter((i) => histFilter === "all" || i.status === histFilter);

  return (
    <AppShell
      title="Customers"
      subtitle={`${list.length} customers · ${formatINR(totalDue)} outstanding`}
      actions={
        <Button className="rounded-full bg-primary shadow-elegant" onClick={() => toast.info("Add Customer form")}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Customer
        </Button>
      }
    >
      {/* Payments to receive panel */}
      <Card className="reveal mb-6 border-border/60 shadow-soft">
        <CardContent className="p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-accent" />
                <p className="font-display text-base font-bold">Payments to receive</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {receivables.length} customers · {formatINR(overdueDue)} overdue (&gt;30d)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm" variant="outline" className="rounded-full"
                onClick={() => {
                  receivables.filter((c) => c.days > 30).forEach((c) => toast.success(`Reminder queued: ${c.company}`));
                }}
                disabled={!receivables.some((c) => c.days > 30)}
              >
                <BellRing className="mr-1 h-3.5 w-3.5" /> Remind all overdue
              </Button>
            </div>
          </div>

          {receivables.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No outstanding receivables 🎉</p>
          ) : (
            <div className="divide-y divide-border/60">
              {receivables.slice(0, 6).map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-navy text-xs text-primary-foreground">
                      {initials(c.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.company}</p>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {c.days}d overdue · {c.lastInvoice}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-sm font-bold tabular-nums ${c.days > 45 ? "text-destructive" : "text-foreground"}`}>
                      {formatINR(c.balance)}
                    </p>
                    {c.days > 30 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-destructive">
                        <AlertTriangle className="h-3 w-3" /> overdue
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-8 rounded-full px-2" onClick={() => openReminder(c)}>
                      <BellRing className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" className="h-8 rounded-full bg-primary px-2" onClick={() => { setPayOpen(c); setPayAmt(c.balance); }}>
                      <IndianRupee className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="reveal mb-6 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, company, email…"
            className="h-11 rounded-full border-border/70 bg-card pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["All", "Active", "Overdue", "New"].map((t) => (
            <Button key={t} variant={filter === t ? "default" : "outline"} className="rounded-full" onClick={() => setFilter(t)}>
              {t}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c, i) => (
          <Card
            key={c.id}
            className={`reveal reveal-${(i % 6) + 1} group border-border/60 shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-elegant`}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-border">
                  <AvatarFallback className="bg-gradient-navy font-display text-primary-foreground">
                    {initials(c.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-bold text-foreground">{c.company}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.name}</p>
                    </div>
                    <Badge className={`shrink-0 rounded-full border-0 capitalize ${statusStyle[c.status]}`}>{c.status}</Badge>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5" /> {c.email}</div>
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {c.phone}</div>
              </div>

              <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Balance</p>
                  <p className={`font-mono text-lg font-bold tabular-nums ${c.balance > 100000 ? "text-destructive" : "text-foreground"}`}>
                    {formatINR(c.balance)}
                  </p>
                </div>
                {c.balance > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    {daysSince(c.lastInvoice)}d since invoice
                  </p>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5">
                <Button
                  size="sm" variant="outline" className="rounded-full"
                  onClick={() => { setPayOpen(c); setPayAmt(c.balance); }}
                  disabled={c.balance <= 0}
                >
                  <IndianRupee className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Pay</span>
                </Button>
                <Button
                  size="sm" variant="outline" className="rounded-full"
                  onClick={() => openReminder(c)}
                  disabled={c.balance <= 0}
                >
                  <BellRing className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Remind</span>
                </Button>
                <Button
                  size="sm" variant="outline" className="rounded-full"
                  onClick={() => { setHistory(c); setHistFilter("all"); }}
                >
                  <History className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">History</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Record payment */}
      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment · {payOpen?.company}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              value={payAmt}
              onChange={(e) => setPayAmt(+e.target.value)}
              className="h-11 rounded-lg font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Current balance: {payOpen ? formatINR(payOpen.balance) : ""}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setPayOpen(null)}>Cancel</Button>
            <Button className="rounded-full bg-primary" onClick={recordPayment}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send reminder */}
      <Dialog open={!!remindOpen} onOpenChange={(o) => !o && setRemindOpen(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Send Due Reminder · {remindOpen?.company}
            </DialogTitle>
            <DialogDescription>
              {remindOpen && (
                <>Outstanding <span className="font-mono font-semibold text-foreground">{formatINR(remindOpen.balance)}</span> · {daysSince(remindOpen.lastInvoice)} days since {remindOpen.lastInvoice}</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {(["Email", "SMS", "WhatsApp"] as Channel[]).map((ch) => (
              <Button
                key={ch} size="sm"
                variant={channel === ch ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setChannel(ch)}
              >
                {ch}
              </Button>
            ))}
          </div>

          <Textarea
            value={remindMsg}
            onChange={(e) => setRemindMsg(e.target.value)}
            rows={10}
            className="rounded-lg font-mono text-xs"
          />

          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={copyReminder}>
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy
            </Button>
            <Button className="rounded-full bg-primary" onClick={sendReminder}>
              <Send className="mr-1 h-3.5 w-3.5" /> Send via {channel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History */}
      <Dialog open={!!history} onOpenChange={(o) => !o && setHistory(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer History · {history?.company}</DialogTitle>
            <DialogDescription>
              Outstanding {history ? formatINR(history.balance) : ""} · {history?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {(["all", "paid", "pending", "overdue"] as const).map((s) => (
              <Button
                key={s} size="sm"
                variant={histFilter === s ? "default" : "outline"}
                className="rounded-full capitalize"
                onClick={() => setHistFilter(s)}
              >
                {s} {s !== "all" && `(${customerInvoices(history).filter((i) => i.status === s).length})`}
              </Button>
            ))}
          </div>

          <div className="max-h-80 overflow-auto rounded-lg border border-border/60">
            {histList.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No invoices for this filter.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Invoice</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {histList.map((i) => (
                    <tr key={i.id} className="border-t border-border/60">
                      <td className="p-2 font-mono text-xs">{i.number}</td>
                      <td className="p-2">{i.date}</td>
                      <td className="p-2 text-right font-mono tabular-nums">{formatINR(i.amount)}</td>
                      <td className="p-2">
                        <Badge className={`rounded-full border-0 capitalize ${statusStyle[i.status === "paid" ? "active" : i.status === "overdue" ? "overdue" : "new"]}`}>
                          {i.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <DialogFooter>
            {history && history.balance > 0 && (
              <Button variant="outline" className="rounded-full" onClick={() => { const c = history; setHistory(null); openReminder(c); }}>
                <BellRing className="mr-1 h-3.5 w-3.5" /> Send reminder
              </Button>
            )}
            <Button className="rounded-full" onClick={() => setHistory(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
