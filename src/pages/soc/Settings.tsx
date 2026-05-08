import { useEffect, useState } from "react";
import { useSoc } from "@/mock/store";
import { useAuth } from "@/auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/soc/PageHeader";
import IngestTester from "@/components/soc/IngestTester";
import { Copy, RefreshCw, LogOut } from "lucide-react";
import { toast } from "sonner";
import {
  fetchSettings, getApiBaseUrl, rotateApiKey, setApiBaseUrl,
  updateThreshold, type ApiSettings,
} from "@/lib/api";

export default function Settings() {
  const { apiKey, regenerateApiKey, mlModelOnline } = useSoc();
  const { user, logout } = useAuth();
  const [time, setTime] = useState("24h");
  const [dark, setDark] = useState(true);
  const [apiUrl, setApiUrlState] = useState(getApiBaseUrl());
  const [serverSettings, setServerSettings] = useState<ApiSettings | null>(null);
  const [threshold, setThreshold] = useState(0.7);
  const [liveKey, setLiveKey] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings().then((s) => {
      setServerSettings(s);
      setThreshold(s.alert_score_threshold);
    }).catch(() => { /* offline */ });
  }, []);

  function setTheme(v: boolean) {
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
  }

  function saveApiUrl() {
    setApiBaseUrl(apiUrl);
    toast.success("API URL saved — reloading");
    setTimeout(() => window.location.reload(), 400);
  }

  async function rotate() {
    try {
      const res = await rotateApiKey();
      setLiveKey(res.api_key);
      toast.success("API key rotated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rotation failed");
    }
  }

  async function saveThreshold(v: number) {
    setThreshold(v);
    try {
      await updateThreshold(v);
      toast.success(`Threshold set to ${v.toFixed(2)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const displayKey = liveKey ?? (serverSettings?.ingest_api_key_preview ?? apiKey);
  const isAdmin = user?.role === "admin";

  return (
    <>
      <PageHeader
        title="Settings"
        description="Personal preferences and system configuration."
        actions={user ? (
          <Button size="sm" variant="ghost" onClick={logout}><LogOut className="h-3.5 w-3.5 mr-1.5" />Sign out</Button>
        ) : undefined}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm">Account & preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {user && (
              <div className="text-xs text-muted-foreground">
                Signed in as <span className="text-foreground font-medium">{user.email}</span> · role <span className="text-foreground">{user.role}</span>
              </div>
            )}
            <div className="grid gap-2"><Label>Time format</Label>
              <Select value={time} onValueChange={setTime}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="24h">24-hour</SelectItem><SelectItem value="12h">12-hour</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div><div className="text-sm">Dark theme</div><div className="text-xs text-muted-foreground">Optimized for low-light SOC use</div></div>
              <Switch checked={dark} onCheckedChange={setTheme} />
            </div>
            <div className="grid gap-2 border-t border-border pt-4">
              <Label>Backend API URL</Label>
              <div className="flex gap-2">
                <Input value={apiUrl} onChange={(e)=>setApiUrlState(e.target.value)} className="font-mono text-xs" />
                <Button variant="secondary" onClick={saveApiUrl}>Save</Button>
              </div>
              <div className="text-xs text-muted-foreground">Stored in this browser. Default: http://localhost:8000</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm">System</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Ingest API key</Label>
              <div className="flex gap-2">
                <Input readOnly value={displayKey} className="font-mono text-xs" />
                <Button variant="secondary" size="icon"
                  onClick={()=>{navigator.clipboard.writeText(displayKey); toast.success("Copied");}}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon"
                  disabled={!isAdmin}
                  onClick={() => { void (serverSettings ? rotate() : regenerateApiKey()); }}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Send as <code>x-api-key</code> header on POST /api/public/ingest.
                {!isAdmin && " Admin role required to rotate."}
              </div>
            </div>

            <div className="grid gap-2 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <Label>Alert score threshold</Label>
                <span className="text-xs font-mono text-muted-foreground">{threshold.toFixed(2)}</span>
              </div>
              <Slider
                value={[threshold]}
                min={0} max={1} step={0.05}
                disabled={!isAdmin}
                onValueChange={(v) => setThreshold(v[0])}
                onValueCommit={(v) => { void saveThreshold(v[0]); }}
              />
              <div className="text-xs text-muted-foreground">Anomaly score above this creates an alert.</div>
            </div>

            <div className="border-t border-border pt-4 text-xs text-muted-foreground">
              Detection engine: <span className="text-severity-low">healthy</span> · Models:{" "}
              <span className={mlModelOnline ? "text-severity-low" : "text-severity-med"}>
                {mlModelOnline ? "online" : "offline"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border md:col-span-2">
          <CardHeader><CardTitle className="text-sm">Ingest tester</CardTitle></CardHeader>
          <CardContent>
            <IngestTester apiKey={liveKey ?? apiKey} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
