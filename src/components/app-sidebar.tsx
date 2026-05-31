import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Package,
  FileText,
  Settings,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const main = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Assistant", url: "/assistant", icon: MessageSquare },
];
const ops = [
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "New Invoice", url: "/invoice", icon: FileText },
  { title: "Sync Queue", url: "/sync", icon: RefreshCw },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => path === p;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-navy shadow-elegant">
            <span className="font-display text-base font-bold text-primary-foreground">T</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base font-bold text-sidebar-foreground">Tally</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">AI Suite</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ops.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed ? (
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
            <div className="flex items-center gap-2 text-sidebar-foreground">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              <span className="text-xs font-medium">AI Insights</span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-sidebar-foreground/70">
              3 customers risk overdue this week. Open Assistant to draft reminders.
            </p>
          </div>
        ) : (
          <SidebarMenuButton tooltip="Settings">
            <Settings className="h-4 w-4" />
          </SidebarMenuButton>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
