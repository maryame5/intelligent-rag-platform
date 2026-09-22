import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  delta,
  icon: Icon,
  invertDelta,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
  icon?: LucideIcon;
  invertDelta?: boolean;
}) {
  const positive = delta !== undefined && (invertDelta ? delta < 0 : delta > 0);
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
      </div>
      <div className="mt-3 font-mono text-2xl tracking-tight tabular-nums">{value}</div>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        {delta !== undefined ? (
          <span className={cn("inline-flex items-center gap-0.5 font-medium", positive ? "text-success" : "text-destructive")}>
            {delta > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(delta)}%
          </span>
        ) : null}
        {hint ? <span>{hint}</span> : null}
      </div>
    </div>
  );
}

/** Compact alias used by the dashboard/admin content blocks. */
export function KPICard({ title, value, trend }: { title: string; value: string; trend?: string }) {
  return trend === undefined ? <KpiCard label={title} value={value} /> : <KpiCard label={title} value={value} hint={trend} />;
}
