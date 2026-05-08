import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function AuthPage() {
  const { user, login, signup, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  async function submit(mode: "login" | "signup") {
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await signup(email, password);
      toast.success(mode === "login" ? "Logged in" : "Account created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 ring-1 ring-primary/30">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">SentinelX SOC</CardTitle>
              <div className="text-xs text-muted-foreground">Sign in to your console</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Log in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <div className="space-y-3 mt-4">
              <div className="grid gap-2"><Label>Email</Label><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
              <div className="grid gap-2"><Label>Password</Label><Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} /></div>
            </div>
            <TabsContent value="login" className="mt-4">
              <Button className="w-full" disabled={busy} onClick={()=>submit("login")}>Log in</Button>
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <Button className="w-full" disabled={busy} onClick={()=>submit("signup")}>Create account</Button>
              <div className="text-xs text-muted-foreground mt-2">First account becomes the admin.</div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
