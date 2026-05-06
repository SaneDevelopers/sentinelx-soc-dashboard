import { useState } from "react";
import { useSoc } from "@/mock/store";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/soc/PageHeader";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function Anomalies() {
  const { anomalies, logs, reviewAnomaly, promoteAnomaly } = useSoc();
  const [openId, setOpenId] = useState<string | null>(null);
  const sel = anomalies.find((a) => a.id === openId);
  const log = sel ? logs.find((l) => l.id === sel.log_id) : undefined;

  return (
    <>
      <PageHeader title="Anomalies" description={`${anomalies.length} entries • ${anomalies.filter(a=>a.status==='new').length} new`} />
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Score</TableHead><TableHead>Source</TableHead><TableHead>Event</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead>When</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {anomalies.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => setOpenId(a.id)}>
                  <TableCell className="font-mono text-severity-high">{a.score.toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-xs">{a.source_ip}</TableCell>
                  <TableCell className="text-xs">{a.event_type}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.reason}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize text-xs">{a.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.ts),{addSuffix:true})}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!openId} onOpenChange={(o)=>!o&&setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card">
          {sel && (
            <>
              <SheetHeader>
                <SheetTitle>Anomaly {sel.id}</SheetTitle>
                <SheetDescription>{sel.reason}</SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5"><span className="text-xs uppercase tracking-wider text-muted-foreground">Anomaly score</span><span className="font-mono text-lg text-severity-high">{sel.score.toFixed(2)}</span></div>
                  <Progress value={sel.score * 100} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Source IP</div><div className="font-mono">{sel.source_ip}</div></div>
                  <div><div className="text-xs text-muted-foreground">Event</div><div>{sel.event_type}</div></div>
                  <div><div className="text-xs text-muted-foreground">Detected</div><div className="font-mono">{format(new Date(sel.ts),"PP HH:mm:ss")}</div></div>
                  <div><div className="text-xs text-muted-foreground">Status</div><div className="capitalize">{sel.status}</div></div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Score breakdown</div>
                  <div className="space-y-1.5 text-xs">
                    {[["Volume z-score", 0.78],["Rare port", 0.62],["Geo novelty", 0.41],["Sequence pattern", 0.55]].map(([k,v]) => (
                      <div key={k as string} className="flex items-center gap-2">
                        <span className="w-32 text-muted-foreground">{k}</span>
                        <Progress value={(v as number)*100} className="h-1.5 flex-1" />
                        <span className="font-mono w-10 text-right">{(v as number).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {log && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Related log</div>
                    <pre className="text-[11px] bg-muted/40 border border-border rounded-md p-3 font-mono overflow-x-auto">{JSON.stringify(log,null,2)}</pre>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={()=>reviewAnomaly(sel.id)}>Mark reviewed</Button>
                  <Button size="sm" variant="secondary" onClick={()=>promoteAnomaly(sel.id)}>Convert to alert</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
