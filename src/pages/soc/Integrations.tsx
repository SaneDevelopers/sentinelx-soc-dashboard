import { useState } from "react";
import { useSoc } from "@/mock/store";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/soc/PageHeader";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

const statusCls: Record<string,string> = {
  connected: "border-severity-low/40 text-severity-low",
  syncing: "border-primary/40 text-primary",
  error: "border-severity-crit/40 text-severity-crit",
  disconnected: "border-muted-foreground/40 text-muted-foreground",
};

export default function Integrations() {
  const { integrations, addIntegration, removeIntegration } = useSoc();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("Cloud Audit");
  return (
    <>
      <PageHeader title="Integrations" description={`${integrations.length} connected sources`}
        actions={<Button size="sm" onClick={()=>{setOpen(true); setName("");}}><Plus className="h-3.5 w-3.5 mr-1.5" />Add integration</Button>} />
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead>Last sync</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {integrations.map((i)=>(
                <TableRow key={i.id}>
                  <TableCell className="text-sm">{i.name}</TableCell>
                  <TableCell className="text-xs">{i.type}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{i.data_type}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs capitalize ${statusCls[i.status]}`}>{i.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(i.last_sync),"PP HH:mm:ss")}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={()=>removeIntegration(i.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card">
          <DialogHeader><DialogTitle>Add integration</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>Name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g. GitHub Audit Log" /></div>
            <div className="grid gap-2"><Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Cloud Audit","Identity","EDR","Edge / WAF","SIEM","Custom"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button disabled={!name.trim()} onClick={()=>{
              addIntegration({ id:"i"+Date.now(), name, type, status:"syncing", last_sync:new Date().toISOString(), data_type:"events" });
              setOpen(false);
            }}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
