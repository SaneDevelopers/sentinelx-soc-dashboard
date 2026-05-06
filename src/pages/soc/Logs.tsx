import { useMemo, useState } from "react";
import { useSoc } from "@/mock/store";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown } from "lucide-react";
import { SeverityBadge } from "@/components/soc/SeverityBadge";
import { PageHeader } from "@/components/soc/PageHeader";
import { format } from "date-fns";

export default function Logs() {
  const { logs } = useSoc();
  const [q, setQ] = useState("");
  const [evt, setEvt] = useState("all");
  const [sev, setSev] = useState("all");
  const [time, setTime] = useState("24h");
  const [openRow, setOpenRow] = useState<string | null>(null);

  const eventTypes = useMemo(() => Array.from(new Set(logs.map((l) => l.event_type))), [logs]);

  const filtered = useMemo(() => {
    const cutoff = time === "1h" ? 3600_000 : time === "6h" ? 6 * 3600_000 : 24 * 3600_000;
    const since = Date.now() - cutoff;
    return logs.filter((l) => {
      if (+new Date(l.ts) < since) return false;
      if (evt !== "all" && l.event_type !== evt) return false;
      if (sev !== "all" && l.severity !== sev) return false;
      if (q && !`${l.source_ip} ${l.dest_ip} ${l.user_name} ${l.event_type}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }).slice(0, 200);
  }, [logs, q, evt, sev, time]);

  return (
    <>
      <PageHeader title="Logs" description={`${filtered.length} of ${logs.length} events shown`} />
      <Card className="bg-card border-border mb-4">
        <CardContent className="p-3 flex flex-wrap gap-2">
          <Input className="max-w-xs h-9" placeholder="Search IP, user, event…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={time} onValueChange={setTime}><SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="1h">Last 1h</SelectItem><SelectItem value="6h">Last 6h</SelectItem><SelectItem value="24h">Last 24h</SelectItem></SelectContent>
          </Select>
          <Select value={evt} onValueChange={setEvt}><SelectTrigger className="h-9 w-44"><SelectValue placeholder="Event type" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All events</SelectItem>{eventTypes.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={sev} onValueChange={setSev}><SelectTrigger className="h-9 w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All severities</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
          </Select>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => { setQ(""); setEvt("all"); setSev("all"); setTime("24h"); }}>Reset</Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Source → Dest</TableHead>
              <TableHead>Proto</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Severity</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((l) => {
                const open = openRow === l.id;
                return (
                  <>
                    <TableRow key={l.id} onClick={() => setOpenRow(open ? null : l.id)} className="cursor-pointer">
                      <TableCell>{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</TableCell>
                      <TableCell className="font-mono text-xs">{format(new Date(l.ts), "HH:mm:ss")}</TableCell>
                      <TableCell className="text-xs">{l.event_type}</TableCell>
                      <TableCell className="font-mono text-xs">{l.source_ip} → {l.dest_ip}:{l.port}</TableCell>
                      <TableCell className="text-xs uppercase">{l.protocol}</TableCell>
                      <TableCell className="text-xs">{l.user_name}</TableCell>
                      <TableCell className="text-xs capitalize">{l.result}</TableCell>
                      <TableCell><SeverityBadge severity={l.severity} /></TableCell>
                    </TableRow>
                    {open && (
                      <TableRow key={l.id + "-d"} className="hover:bg-transparent">
                        <TableCell></TableCell>
                        <TableCell colSpan={7} className="bg-muted/20">
                          <pre className="text-[11px] font-mono p-2 overflow-x-auto">{JSON.stringify(l, null, 2)}</pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
