import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, FileText, Users, Package, IndianRupee, Plus, TrendingUp } from "lucide-react";
import { invoices, customers, inventory, revenueSeries, formatINR } from "@/lib/mock-data";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Tally AI" },
      { name: "description", content: "Real-time view of revenue, invoices, customers and inventory." },
    ],
  }),
  component: Dashboard,
});

const kpis = [
  { label: "Revenue (May)", value: formatINR(684000), delta: "+11.7%", trend: "up", icon: IndianRupee },
  { label: "Open Invoices", value: "23", delta: "+4", trend: "up", icon: FileText },
  { label: "Active Customers", value: "184", delta: "+12", trend: "up", icon: Users },
  { label: "Low Stock Items", value: "6", delta: "-2", trend: "down", icon: Package },
];

function Dashboard() {
  const invoiceStatusData = (["paid", "pending", "overdue"] as const).map((status) => ({
    name: status[0].toUpperCase() + status.slice(1),
    value: invoices.filter((i) => i.status === status).reduce((s, i) => s + i.amount, 0),
    color:
      status === "paid"
        ? "oklch(0.68 0.16 155)"
        : status === "pending"
        ? "oklch(0.78 0.13 85)"
        : "oklch(0.62 0.21 25)",
  }));

  const inventoryChart = inventory.map((i) => ({ sku: i.sku, stock: i.stock, reorder: i.reorderLevel }));
  const lowStockCount = inventory.filter((i) => i.stock <= i.reorderLevel).length;

  const today = new Date("2026-05-28");
  const daysSince = (d: string) => Math.floor((today.getTime() - new Date(d).getTime()) / 86400000);
  const buckets = { "0–30 days": 0, "31–60 days": 0, "60+ days": 0 };
  customers.forEach((c) => {
    if (c.balance <= 0) return;
    const d = daysSince(c.lastInvoice);
    if (d <= 30) buckets["0–30 days"] += c.balance;
    else if (d <= 60) buckets["31–60 days"] += c.balance;
    else buckets["60+ days"] += c.balance;
  });
  const arAging = [
    { label: "0–30 days", value: buckets["0–30 days"], color: "oklch(0.68 0.16 155)" },
    { label: "31–60 days", value: buckets["31–60 days"], color: "oklch(0.78 0.13 85)" },
    { label: "60+ days", value: buckets["60+ days"], color: "oklch(0.62 0.21 25)" },
  ];
  const arTotal = arAging.reduce((s, b) => s + b.value, 0);

  const cashFlow = revenueSeries.map((r) => ({ month: r.month, net: r.revenue - r.expense }));

  return (
    <AppShell
      title="Dashboard"
      subtitle="Welcome back. Here's how your books are looking today."
      actions={
        <>
          <Button variant="outline" className="rounded-full">Export</Button>
          <Button asChild className="rounded-full bg-primary shadow-elegant">
            <Link to="/invoice"><Plus className="mr-1.5 h-4 w-4" /> New Invoice</Link>
          </Button>
        </>
      }
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Card key={k.label} className={`reveal reveal-${i + 1} overflow-hidden border-border/60 shadow-soft`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                  <k.icon className="h-4 w-4" />
                </div>
                <Badge
                  variant="secondary"
                  className={`gap-1 rounded-full border-0 ${
                    k.trend === "up" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {k.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {k.delta}
                </Badge>
              </div>
              <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">{k.label}</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="reveal reveal-3 col-span-1 border-border/60 shadow-soft lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-xl">Revenue vs. Expenses</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Last 6 months · INR</p>
            </div>
            <Badge variant="secondary" className="gap-1 rounded-full bg-success/15 text-success">
              <TrendingUp className="h-3 w-3" /> Margin 47%
            </Badge>
          </CardHeader>
          <CardContent className="h-[300px] pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries} margin={{ left: -10, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.55 0.11 250)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="oklch(0.55 0.11 250)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.13 85)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.78 0.13 85)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 250)" />
                <XAxis dataKey="month" stroke="oklch(0.5 0.025 258)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.5 0.025 258)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "white", borderRadius: 10, border: "1px solid oklch(0.92 0.012 250)", fontSize: 12 }}
                  formatter={(v: number) => formatINR(v)}
                />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.55 0.11 250)" strokeWidth={2.5} fill="url(#rev)" />
                <Area type="monotone" dataKey="expense" stroke="oklch(0.78 0.13 85)" strokeWidth={2.5} fill="url(#exp)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="reveal reveal-4 col-span-1 border-border/60 shadow-soft lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-display text-xl">Top Customers</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">By outstanding balance</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {customers.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{c.company}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.name}</p>
                </div>
                <span className="ml-3 font-mono text-sm font-semibold tabular-nums text-foreground">
                  {formatINR(c.balance)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="reveal reveal-5 col-span-1 border-border/60 shadow-soft lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-display text-xl">Invoice Status</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Breakdown by value</p>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={invoiceStatusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                  {invoiceStatusData.map((s) => (<Cell key={s.name} fill={s.color} />))}
                </Pie>
                <Tooltip contentStyle={{ background: "white", borderRadius: 10, border: "1px solid oklch(0.92 0.012 250)", fontSize: 12 }} formatter={(v: number) => formatINR(v)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="reveal reveal-6 col-span-1 border-border/60 shadow-soft lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-xl">Inventory Stock Levels</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Stock vs. reorder threshold</p>
            </div>
            <Badge variant="secondary" className="gap-1 rounded-full bg-warning/20 text-warning-foreground">
              {lowStockCount} low
            </Badge>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryChart} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 250)" vertical={false} />
                <XAxis dataKey="sku" stroke="oklch(0.5 0.025 258)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.5 0.025 258)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "white", borderRadius: 10, border: "1px solid oklch(0.92 0.012 250)", fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="stock" name="Stock" fill="oklch(0.55 0.11 250)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="reorder" name="Reorder level" fill="oklch(0.78 0.13 85)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="reveal reveal-6 col-span-1 border-border/60 shadow-soft lg:col-span-5">
          <CardHeader>
            <CardTitle className="font-display text-xl">Accounts Receivable</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Aging buckets</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {arAging.map((b) => {
              const pct = arTotal ? Math.round((b.value / arTotal) * 100) : 0;
              return (
                <div key={b.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-foreground">{b.label}</span>
                    <span className="font-mono font-semibold tabular-nums text-foreground">{formatINR(b.value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: b.color }} />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Outstanding</span>
              <span className="font-display text-lg font-bold tabular-nums text-foreground">{formatINR(arTotal)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="reveal reveal-7 col-span-1 border-border/60 shadow-soft lg:col-span-7">
          <CardHeader>
            <CardTitle className="font-display text-xl">Net Cash Flow</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Revenue minus expenses by month</p>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlow} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 250)" vertical={false} />
                <XAxis dataKey="month" stroke="oklch(0.5 0.025 258)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.5 0.025 258)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "white", borderRadius: 10, border: "1px solid oklch(0.92 0.012 250)", fontSize: 12 }} formatter={(v: number) => formatINR(v)} />
                <Bar dataKey="net" name="Net cash" fill="oklch(0.55 0.11 250)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>



      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="reveal reveal-5 col-span-1 border-border/60 shadow-soft lg:col-span-12">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-xl">Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" className="rounded-full text-accent hover:bg-accent/10 hover:text-accent">
              View all
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Invoice</th>
                    <th className="px-4 py-3 text-left font-medium">Customer</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {invoices.map((i) => (
                    <tr key={i.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{i.number}</td>
                      <td className="px-4 py-3 text-foreground">{i.customer}</td>
                      <td className="px-4 py-3 text-muted-foreground">{i.date}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">{formatINR(i.amount)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={`rounded-full border-0 capitalize ${
                            i.status === "paid"
                              ? "bg-success/15 text-success"
                              : i.status === "pending"
                              ? "bg-warning/20 text-warning-foreground"
                              : "bg-destructive/15 text-destructive"
                          }`}
                        >
                          {i.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
