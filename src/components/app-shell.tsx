import { ReactNode, useState } from "react";
import { Bell, Search, RefreshCw, Cloud, CloudOff } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);

  const refresh = () => {
    setSyncing(true);
    toast.info("Refreshing data…");
    setTimeout(() => {
      setSyncing(false);
      toast.success("Data up to date");
    }, 900);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-md md:px-8">
            <SidebarTrigger className="-ml-1" />
            <div className="hidden flex-1 items-center gap-2 md:flex">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search invoices, customers, items…"
                  className="h-10 rounded-full border-border/70 bg-muted/50 pl-9 focus-visible:ring-ring/40"
                />
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Link to="/sync">
                <Badge
                  onClick={() => setOnline((o) => !o)}
                  className={`hidden cursor-pointer gap-1.5 rounded-full border-0 px-2.5 py-1 sm:inline-flex ${
                    online ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground"
                  }`}
                >
                  {online ? <Cloud className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
                  {online ? "Synced" : "Queued"}
                </Badge>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={refresh}
                aria-label="Refresh data"
                className="rounded-full"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <Avatar className="ml-1 h-9 w-9 ring-2 ring-border">
                <AvatarFallback className="bg-gradient-navy text-primary-foreground">RM</AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-8">
              <div className="reveal mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
                  )}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
              </div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
