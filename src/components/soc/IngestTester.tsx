import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sendIngestEvent, type IngestPayload } from "@/lib/api";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface Props { apiKey: string; }

const SAMPLE_TYPES = ["auth_failure", "auth_success", "port_scan", "firewall_block", "dns_query", "http_request"];

export default function IngestTester({ apiKey }: Props) {
  const [sourceIp, setSourceIp] = useState("10.0.0.42");
  const [destIp, setDestIp] = useState("10.0.0.1");
  const [user, setUser] = useState("alice");
  const [eventType, setEventType] = useState("auth_failure");
  const [extra, setExtra] = useState('{\n  "result": "failed"\n}');
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<string>("");

  async function send() {
    setBusy(true);
    try {
      let raw: Record<string, unknown> = {};
      if (extra.trim()) raw = JSON.parse(extra);
      const payload: IngestPayload = {
        timestamp: new Date().toISOString(),
        source_ip: sourceIp,
        destination_ip: destIp || undefined,
        user: user || undefined,
        event_type: eventType,
        ...raw,
      };
      const result = await sendIngestEvent(apiKey, payload);
      setResponse(JSON.stringify(result, null, 2));
      toast.success(result.alert_created ? `Alert created (#${result.alert_id})` : "Event ingested");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ingest failed";
      setResponse(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5"><Label className="text-xs">Source IP</Label>
          <Input value={sourceIp} onChange={(e)=>setSourceIp(e.target.value)} className="font-mono text-xs" /></div>
        <div className="grid gap-1.5"><Label className="text-xs">Destination IP</Label>
          <Input value={destIp} onChange={(e)=>setDestIp(e.target.value)} className="font-mono text-xs" /></div>
        <div className="grid gap-1.5"><Label className="text-xs">User</Label>
          <Input value={user} onChange={(e)=>setUser(e.target.value)} className="text-xs" /></div>
        <div className="grid gap-1.5"><Label className="text-xs">Event type</Label>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{SAMPLE_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs">Extra fields (JSON)</Label>
        <Textarea value={extra} onChange={(e)=>setExtra(e.target.value)} className="font-mono text-xs min-h-[100px]" />
      </div>
      <Button onClick={send} disabled={busy} size="sm"><Send className="h-3.5 w-3.5 mr-1.5" />Send test event</Button>
      {response && (
        <pre className="text-[11px] font-mono bg-muted/30 p-2 rounded border border-border overflow-x-auto max-h-48">{response}</pre>
      )}
    </div>
  );
}
