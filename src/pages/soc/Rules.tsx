import { useState } from "react";
import { useSoc } from "@/mock/store";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeverityBadge } from "@/components/soc/SeverityBadge";
import { PageHeader } from "@/components/soc/PageHeader";
import { Plus, Play, Trash2 } from "lucide-react";
import type { Rule, Severity } from "@/types/soc";
import { toast } from "sonner";
import { deleteRuleApi } from "@/lib/api";

function emptyRule(): Rule {
  return { id: "r" + Date.now(), name: "", description: "", severity: "medium", enabled: true, created_by: "you", condition: { all: [] } };
}

export default function Rules() {
  const { rules, toggleRule, upsertRule, refreshData } = useSoc();
  const [editing, setEditing] = useState<Rule | null>(null);
  const [conditionText, setConditionText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open(r: Rule | null) {
    const draft = r ? { ...r } : emptyRule();
    setEditing(draft);
    setConditionText(JSON.stringify(draft.condition, null, 2));
    setError(null);
  }
  function save() {
    if (!editing) return;
    try {
      const cond = JSON.parse(conditionText);
      upsertRule({ ...editing, condition: cond });
      setEditing(null);
    } catch (e: any) {
      setError("Invalid JSON: " + e.message);
    }
  }
  function testRule() {
    const matches = Math.floor(Math.random() * 8);
    toast.success(`Test complete — ${matches} match${matches===1?'':'es'} in last 1h`);
  }
  async function removeRule(id: string) {
    if (!confirm("Delete this rule?")) return;
    try { await deleteRuleApi(id); toast.success("Rule deleted"); void refreshData(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <>
      <PageHeader title="Detection rules" description={`${rules.length} rules • ${rules.filter(r=>r.enabled).length} enabled`}
        actions={<Button size="sm" onClick={()=>open(null)}><Plus className="h-3.5 w-3.5 mr-1.5" />New rule</Button>} />
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-12">On</TableHead><TableHead>Name</TableHead><TableHead>Severity</TableHead><TableHead>Description</TableHead><TableHead>Author</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rules.map((r)=>(
                <TableRow key={r.id}>
                  <TableCell><Switch checked={r.enabled} onCheckedChange={()=>toggleRule(r.id)} /></TableCell>
                  <TableCell className="text-sm">{r.name}</TableCell>
                  <TableCell><SeverityBadge severity={r.severity} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-md">{r.description}</TableCell>
                  <TableCell className="text-xs">{r.created_by}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={testRule}><Play className="h-3.5 w-3.5 mr-1" />Test</Button>
                    <Button size="sm" variant="ghost" onClick={()=>open(r)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={()=>removeRule(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o)=>!o && setEditing(null)}>
        <DialogContent className="max-w-2xl bg-card">
          <DialogHeader><DialogTitle>{editing && rules.some(r=>r.id===editing.id)?"Edit rule":"New rule"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-4">
              <div className="grid gap-2"><Label>Name</Label><Input value={editing.name} onChange={(e)=>setEditing({...editing, name: e.target.value})} /></div>
              <div className="grid gap-2"><Label>Description</Label><Input value={editing.description} onChange={(e)=>setEditing({...editing, description: e.target.value})} /></div>
              <div className="grid gap-2"><Label>Severity</Label>
                <Select value={editing.severity} onValueChange={(v)=>setEditing({...editing, severity: v as Severity})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","critical"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Condition (JSON)</Label>
                <Textarea className="font-mono text-xs min-h-[180px]" value={conditionText} onChange={(e)=>setConditionText(e.target.value)} />
                {error && <div className="text-xs text-severity-crit">{error}</div>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
