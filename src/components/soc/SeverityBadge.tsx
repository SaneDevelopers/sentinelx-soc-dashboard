import { cn } from "@/lib/utils";
import type { Severity } from "@/types/soc";

const map: Record<Severity, { label: string; cls: string }> = {
  low:      { label: "Low",      cls: "bg-severity-low/15 text-severity-low border-severity-low/30" },
  medium:   { label: "Medium",   cls: "bg-severity-med/15 text-severity-med border-severity-med/30" },
  high:     { label: "High",     cls: "bg-severity-high/15 text-severity-high border-severity-high/30" },
  critical: { label: "Critical", cls: "bg-severity-crit/15 text-severity-crit border-severity-crit/40" },
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const s = map[severity];
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium font-mono", s.cls, className)}>
      {s.label}
    </span>
  );
}

export function StatusDot({ tone }: { tone: "good" | "warn" | "bad" | "muted" }) {
  const c = tone === "good" ? "bg-severity-low" : tone === "warn" ? "bg-severity-med" : tone === "bad" ? "bg-severity-crit" : "bg-muted-foreground";
  return <span className={cn("inline-block h-2 w-2 rounded-full", c)} />;
}
