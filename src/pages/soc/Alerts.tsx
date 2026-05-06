import { useState } from "react";
import { useSoc } from "@/mock/store";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SeverityBadge } from "@/components/soc/SeverityBadge";
import { PageHeader } from "@/components/soc/PageHeader";
import { formatDistanceToNow, format } from "date-fns";
import type { Alert } from "@/types/soc";
import { CheckCircle2, ArrowUpCircle, MessageSquarePlus } from "lucide-react";

export default function Alerts() {
  const { alerts, logs, timeline, updateAlertStatus, addAlertNote, rules } = useSoc();
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const selected: Alert | undefined = alerts.find((a) => a.id === openId);
  const relatedLog = selected ? logs.find((l) => l.id === selected.log_id) : undefined;
  const tl = selected ? timeline.filter((t) => t.alert_id === selected.id) : [];
  const rule = selected ? rules.find((r) => r.id === selected.rule_id) : undefined;

  return (
    <>
      <PageHeader title="Alerts" description={`${alerts.length} alerts • ${alerts.filter(a=>a.status==='open'||a.status==='investigating').length} active`} />
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source IP</TableHead>
              <TableHead>When</TableHead>
              <TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {alerts.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => { setOpenId(a.id); setNote(""); }}>
                  <TableCell className="text-sm">{a.title}</TableCell>
                  <TableCell><SeverityBadge severity={a.severity} /></TableCell>
                  <TableCell className="text-xs capitalize text-muted-foreground">{a.status}</TableCell>
                  <TableCell className="font-mono text-xs">{a.source_ip}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.ts), { addSuffix: true })}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="ghost">Open</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-card">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2"><SeverityBadge severity={selected.severity} /><span className="text-xs text-muted-foreground capitalize">{selected.status}</span></div>
                <SheetTitle className="mt-1">{selected.title}</SheetTitle>
                <SheetDescription>{selected.description}</SheetDescription>
              </SheetHeader>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Field label="Source IP" mono>{selected.source_ip}</Field>
                <Field label="Detected" mono>{format(new Date(selected.ts), "PP HH:mm:ss")}</Field>
                <Field label="Rule">{rule?.name ?? selected.rule_id}</Field>
                <Field label="Log ID" mono>{selected.log_id}</Field>
              </div>

              <div className="mt-6 flex gap-2">
                <Button size="sm" onClick={() => updateAlertStatus(selected.id, "resolved")}><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Resolve</Button>
                <Button size="sm" variant="secondary" onClick={() => updateAlertStatus(selected.id, "escalated")}><ArrowUpCircle className="h-3.5 w-3.5 mr-1.5" />Escalate</Button>
                <Button size="sm" variant="ghost" onClick={() => updateAlertStatus(selected.id, "investigating")}>Investigate</Button>
              </div>

              <Section title="Attack timeline">
                <ol className="relative border-l border-border ml-1 space-y-3 pl-4">
                  {tl.map((s) => (
                    <li key={s.id} className="text-sm">
                      <span className="absolute -left-[5px] mt-1 h-2 w-2 rounded-full bg-primary" />
                      <div className="font-medium">{s.action}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(s.ts), "HH:mm:ss")} • {s.result}</div>
                    </li>
                  ))}
                </ol>
              </Section>

              {relatedLog && (
                <Section title="Related log">
                  <pre className="text-[11px] bg-muted/40 border border-border rounded-md p-3 overflow-x-auto font-mono">{JSON.stringify(relatedLog, null, 2)}</pre>
                </Section>
              )}

              <Section title={`Notes (${selected.notes.length})`}>
                <div className="space-y-2 mb-3">
                  {selected.notes.map((n, i) => (
                    <div key={i} className="text-sm border border-border rounded-md p-2 bg-muted/20">
                      <div className="text-xs text-muted-foreground">{n.author} • {format(new Date(n.ts), "PP HH:mm")}</div>
                      <div>{n.text}</div>
                    </div>
                  ))}
                </div>
                <Textarea placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button size="sm" className="mt-2" disabled={!note.trim()} onClick={() => { addAlertNote(selected.id, note.trim()); setNote(""); }}>
                  <MessageSquarePlus className="h-3.5 w-3.5 mr-1.5" />Add note
                </Button>
              </Section>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Field({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-sm mt-0.5" : "text-sm mt-0.5"}>{children}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}
