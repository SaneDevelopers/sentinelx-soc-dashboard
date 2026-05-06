import { useState } from "react";
import { useSoc } from "@/mock/store";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/soc/PageHeader";
import { format } from "date-fns";
import { Star, StarOff } from "lucide-react";

const riskCls: Record<string,string> = {
  low: "border-severity-low/40 text-severity-low",
  medium: "border-severity-med/40 text-severity-med",
  high: "border-severity-high/40 text-severity-high",
  critical: "border-severity-crit/40 text-severity-crit",
};

export default function ThreatIntel() {
  const { threats, toggleWatchlist } = useSoc();
  const [openId, setOpenId] = useState<string|null>(null);
  const sel = threats.find((t)=>t.id===openId);
  return (
    <>
      <PageHeader title="Threat intelligence" description={`${threats.length} indicators • ${threats.filter(t=>t.watchlisted).length} watchlisted`} />
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Indicator</TableHead><TableHead>Type</TableHead><TableHead>Risk</TableHead><TableHead>Source</TableHead><TableHead>Last seen</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {threats.map((t)=>(
                <TableRow key={t.id} className="cursor-pointer" onClick={()=>setOpenId(t.id)}>
                  <TableCell className="font-mono text-xs">{t.indicator}</TableCell>
                  <TableCell className="text-xs uppercase">{t.type}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs capitalize ${riskCls[t.risk_level]}`}>{t.risk_level}</Badge></TableCell>
                  <TableCell className="text-xs">{t.source}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(t.last_seen),"PP HH:mm")}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={(e)=>{e.stopPropagation(); toggleWatchlist(t.id);}}>
                      {t.watchlisted ? <Star className="h-4 w-4 fill-primary text-primary" /> : <StarOff className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!openId} onOpenChange={(o)=>!o&&setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-md bg-card">
          {sel && (
            <>
              <SheetHeader>
                <Badge variant="outline" className={`w-fit text-xs capitalize ${riskCls[sel.risk_level]}`}>{sel.risk_level} risk</Badge>
                <SheetTitle className="font-mono break-all">{sel.indicator}</SheetTitle>
                <SheetDescription>{sel.description}</SheetDescription>
              </SheetHeader>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Type</div><div className="uppercase">{sel.type}</div></div>
                <div><div className="text-xs text-muted-foreground">Source</div><div>{sel.source}</div></div>
                <div><div className="text-xs text-muted-foreground">First seen</div><div className="font-mono text-xs">{format(new Date(sel.first_seen),"PP HH:mm")}</div></div>
                <div><div className="text-xs text-muted-foreground">Last seen</div><div className="font-mono text-xs">{format(new Date(sel.last_seen),"PP HH:mm")}</div></div>
              </div>
              <Button className="mt-5 w-full" onClick={()=>toggleWatchlist(sel.id)}>
                {sel.watchlisted ? "Remove from watchlist" : "Add to watchlist"}
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
