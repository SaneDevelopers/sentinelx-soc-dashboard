import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSoc } from "@/mock/store";
import { Activity, AlertTriangle, ShieldCheck, Cpu, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeverityBadge, StatusDot } from "@/components/soc/SeverityBadge";
import { PageHeader } from "@/components/soc/PageHeader";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

function Kpi({ icon: Icon, label, value, sub, tone = "muted" }: { icon: any; label: string; value: string; sub: string; tone?: "good" | "warn" | "bad" | "muted" }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <StatusDot tone={tone} /> {sub}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { alerts, anomalies, logs, eventActivity } = useSoc();
  const open = alerts.filter((a) => a.status !== "resolved").length;
  const last24h = logs.length;
  const topAnoms = [...anomalies].sort((a, b) => b.score - a.score).slice(0, 5);
  const recentAlerts = alerts.slice(0, 5);

  return (
    <>
      <PageHeader
        title="Security Operations Center"
        description="Live posture, detections, and anomalies across your environment."
        actions={<Badge variant="outline" className="gap-1.5 border-severity-low/40 text-severity-low"><StatusDot tone="good" /> All systems operational</Badge>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={ShieldCheck} label="System status" value="Operational" sub="Engine healthy" tone="good" />
        <Kpi icon={Activity} label="Events / 24h" value={last24h.toLocaleString()} sub="+12% vs prev day" tone="good" />
        <Kpi icon={AlertTriangle} label="Active alerts" value={String(open)} sub={`${alerts.filter(a=>a.severity==='critical').length} critical`} tone="bad" />
        <Kpi icon={Cpu} label="ML model" value="Offline" sub="Training disabled" tone="warn" />
      </div>

      <div className="grid gap-4 mt-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Event activity (24h)</CardTitle>
            <span className="text-xs text-muted-foreground">events vs alerts</span>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={eventActivity}>
                <defs>
                  <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="alGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--sev-crit))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--sev-crit))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="events" stroke="hsl(var(--primary))" fill="url(#evGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="alerts" stroke="hsl(var(--sev-crit))" fill="url(#alGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Key insights</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { t: "Top source IP", v: "185.220.101.4", s: "32 events" },
              { t: "Most-hit asset", v: "web-prod-01", s: "9 alerts" },
              { t: "Trending rule", v: "Brute force authentication", s: "+45%" },
              { t: "Mean time to triage", v: "4m 12s", s: "vs 6m baseline" },
            ].map((i) => (
              <div key={i.t} className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="text-xs text-muted-foreground">{i.t}</div>
                  <div className="font-mono text-sm mt-0.5">{i.v}</div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />{i.s}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 mt-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Top anomalies</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Source</TableHead><TableHead>Event</TableHead><TableHead className="text-right">Score</TableHead><TableHead>When</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {topAnoms.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.source_ip}</TableCell>
                    <TableCell className="text-xs">{a.event_type}</TableCell>
                    <TableCell className="text-right font-mono text-severity-high">{a.score.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.ts), { addSuffix: true })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Recent alerts</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Title</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>When</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {recentAlerts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs max-w-[260px] truncate">{a.title}</TableCell>
                    <TableCell><SeverityBadge severity={a.severity} /></TableCell>
                    <TableCell className="text-xs capitalize text-muted-foreground">{a.status}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.ts), { addSuffix: true })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
