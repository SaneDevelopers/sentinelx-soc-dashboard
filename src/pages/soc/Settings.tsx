import { useState } from "react";
import { useSoc } from "@/mock/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/soc/PageHeader";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { apiKey, regenerateApiKey } = useSoc();
  const [time, setTime] = useState("24h");
  const [dark, setDark] = useState(true);

  function setTheme(v: boolean) {
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
  }

  return (
    <>
      <PageHeader title="Settings" description="Personal preferences and system configuration." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm">User preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2"><Label>Time format</Label>
              <Select value={time} onValueChange={setTime}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="24h">24-hour</SelectItem><SelectItem value="12h">12-hour</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div><div className="text-sm">Dark theme</div><div className="text-xs text-muted-foreground">Optimized for low-light SOC use</div></div>
              <Switch checked={dark} onCheckedChange={setTheme} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm">System</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Ingest API key</Label>
              <div className="flex gap-2">
                <Input readOnly value={apiKey} className="font-mono text-xs" />
                <Button variant="secondary" size="icon" onClick={()=>{navigator.clipboard.writeText(apiKey); toast.success("Copied");}}><Copy className="h-4 w-4" /></Button>
                <Button variant="secondary" size="icon" onClick={regenerateApiKey}><RefreshCw className="h-4 w-4" /></Button>
              </div>
              <div className="text-xs text-muted-foreground">Send as <code>x-api-key</code> header on POST /api/public/ingest.</div>
            </div>
            <div className="border-t border-border pt-4 text-xs text-muted-foreground">
              Detection engine: <span className="text-severity-low">healthy</span> · Models: <span className="text-severity-med">offline</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
