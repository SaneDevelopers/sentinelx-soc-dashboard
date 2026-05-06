import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Bell, FileText, BarChart3, Activity,
  ShieldAlert, Server, Filter, Plug, Settings as Cog, ShieldCheck,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const items = [
  { title: "Dashboard",     url: "/",              icon: LayoutDashboard },
  { title: "Alerts",        url: "/alerts",        icon: Bell },
  { title: "Logs",          url: "/logs",          icon: FileText },
  { title: "Analytics",     url: "/analytics",     icon: BarChart3 },
  { title: "Anomalies",     url: "/anomalies",     icon: Activity },
  { title: "Threat Intel",  url: "/threat-intel",  icon: ShieldAlert },
  { title: "Assets",        url: "/assets",        icon: Server },
  { title: "Rules",         url: "/rules",         icon: Filter },
  { title: "Integrations",  url: "/integrations",  icon: Plug },
  { title: "Settings",      url: "/settings",      icon: Cog },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 ring-1 ring-primary/30">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-semibold tracking-tight">SentinelX</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">SOC v1</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={item.url} className={cn("flex items-center gap-2")}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
