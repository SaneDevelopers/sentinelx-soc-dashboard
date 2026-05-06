import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSoc } from "@/mock/store";
import { Badge } from "@/components/ui/badge";

export default function SocLayout() {
  const { alerts } = useSoc();
  const open = alerts.filter((a) => a.status === "open" || a.status === "investigating").length;
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border px-3 sticky top-0 z-30 bg-background/80 backdrop-blur">
            <SidebarTrigger />
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search alerts, logs, IPs…" className="pl-8 h-9 bg-secondary/50 border-border" />
            </div>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {open > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-severity-crit text-white border-0 text-[10px]">{open}</Badge>
              )}
            </Button>
            <Avatar className="h-8 w-8 ring-1 ring-border">
              <AvatarFallback className="bg-secondary text-xs">SX</AvatarFallback>
            </Avatar>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
