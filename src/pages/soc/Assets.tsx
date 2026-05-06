import { useState } from "react";
import { useSoc } from "@/mock/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/soc/PageHeader";
import { StatusDot, SeverityBadge } from "@/components/soc/SeverityBadge";
import { format, formatDistanceToNow } from "date-fns";
import { Server } from "lucide-react";

const riskCls: Record<string,string> = {
  low: "border-severity-low/40 text-severity-low",
  medium: "border-severity-med/40 text-severity-med",
  high: "border-severity-high/40 text-severity-high",
  critical: "border-severity-crit/40 text-severity-crit",
};

export default function Assets() {
  const { assets, alerts, logs } = useSoc();
  const [openId, setOpenId] = useState<string|null>(null);
  const sel = assets.find((a)=>a.id===openId);
  const openAlerts = sel ? alerts.filter((a)=>a.asset_id===sel.id && a.status!=="resolved") : [];
  const recentLogs = sel ? logs.filter((l)=>l.source_ip===sel.ip || l.dest_ip===sel.ip).slice(0,8) : [];

  return (
    <>
      <PageHeader title="Assets" description={`${assets.length} monitored hosts`} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {assets.map((a)=>(
          <Card key={a.id} className="bg-card border-border cursor-pointer hover:border-primary/40 transition-colors" onClick={()=>setOpenId(a.id)}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-secondary"><Server className="h-4 w-4" /></div>
                <div>
                  <CardTitle className="text-sm">{a.hostname}</CardTitle>
                  <div className="font-mono text-xs text-muted-foreground">{a.ip}</div>
                </div>
              </div>
              <Badge variant="outline" className={`text-xs capitalize ${riskCls[a.risk_level]}`}>{a.risk_level}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center gap-2"><StatusDot tone={a.status==='online'?'good':a.status==='degraded'?'warn':'muted'} /><span className="capitalize">{a.status}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">OS</span><span>{a.os}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span>{a.owner}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last activity</span><span>{formatDistanceToNow(new Date(a.last_activity),{addSuffix:true})}</span></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={!!openId} onOpenChange={(o)=>!o&&setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card">
          {sel && (
            <>
              <SheetHeader>
                <SheetTitle>{sel.hostname}</SheetTitle>
                <SheetDescription className="font-mono">{sel.ip} • {sel.os}</SheetDescription>
              </SheetHeader>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Status</div><div className="capitalize">{sel.status}</div></div>
                <div><div className="text-xs text-muted-foreground">Exposure</div><Badge variant="outline" className={`text-xs capitalize ${riskCls[sel.risk_level]}`}>{sel.risk_level}</Badge></div>
                <div><div className="text-xs text-muted-foreground">Owner</div><div>{sel.owner}</div></div>
                <div><div className="text-xs text-muted-foreground">Last activity</div><div className="text-xs">{format(new Date(sel.last_activity),"PP HH:mm:ss")}</div></div>
              </div>
              <div className="mt-6">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Open alerts ({openAlerts.length})</div>
                <div className="space-y-2">
                  {openAlerts.length===0 && <div className="text-xs text-muted-foreground">No open alerts.</div>}
                  {openAlerts.map((a)=>(
                    <div key={a.id} className="flex items-center justify-between border border-border rounded-md p-2">
                      <div className="text-sm">{a.title}</div>
                      <SeverityBadge severity={a.severity} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recent logs</div>
                <div className="space-y-1 text-xs font-mono">
                  {recentLogs.map((l)=>(
                    <div key={l.id} className="flex justify-between border-b border-border/60 py-1">
                      <span>{format(new Date(l.ts),"HH:mm:ss")} {l.event_type}</span>
                      <span className="text-muted-foreground">{l.source_ip}→{l.dest_ip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
