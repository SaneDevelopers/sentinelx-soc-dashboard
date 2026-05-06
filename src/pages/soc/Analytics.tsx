import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Cpu, Brain, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/soc/PageHeader";

function ModelCard({ icon: Icon, name, kind }: { icon: any; name: string; kind: string }) {
  return (
    <Card className="bg-card border-border relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 ring-1 ring-primary/20">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm">{name}</CardTitle>
            <div className="text-xs text-muted-foreground">{kind}</div>
          </div>
        </div>
        <Badge variant="outline" className="border-severity-med/40 text-severity-med gap-1.5"><Lock className="h-3 w-3" /> Offline</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border border-border bg-muted/20 p-3 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-severity-med mt-0.5" />
          <div>
            <div className="font-medium">Model offline — training disabled</div>
            <div className="text-xs text-muted-foreground mt-1">Inference and tuning will activate when the model is trained.</div>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip><TooltipTrigger asChild><div>
            <div className="flex items-center justify-between text-xs mb-1.5"><span>Threshold</span><span className="font-mono text-muted-foreground">0.85</span></div>
            <Slider disabled defaultValue={[85]} max={100} step={1} />
          </div></TooltipTrigger><TooltipContent>Enable when models are trained</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><div>
            <div className="flex items-center justify-between text-xs mb-1.5"><span>Sensitivity</span><span className="font-mono text-muted-foreground">0.50</span></div>
            <Slider disabled defaultValue={[50]} max={100} step={1} />
          </div></TooltipTrigger><TooltipContent>Enable when models are trained</TooltipContent></Tooltip>
        </TooltipProvider>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["Precision","—"],["Recall","—"],["AUC","—"]].map(([k,v]) => (
            <div key={k} className="rounded-md border border-border bg-muted/20 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="text-sm font-mono mt-0.5">{v}</div>
            </div>
          ))}
        </div>
        <Button disabled className="w-full" variant="secondary">Train model</Button>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  return (
    <>
      <PageHeader title="Analytics" description="Anomaly detection models and tuning controls." />
      <div className="grid gap-4 md:grid-cols-2">
        <ModelCard icon={Cpu} name="Isolation Forest" kind="Tree-based outlier detection" />
        <ModelCard icon={Brain} name="Autoencoder" kind="Reconstruction-based anomaly score" />
      </div>
    </>
  );
}
