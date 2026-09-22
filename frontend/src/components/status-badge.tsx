import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral" | "info" | "accent";

const toneMap: Record<string, Tone> = {
  indexed: "success",
  succeeded: "success",
  connected: "success",
  active: "success",
  processing: "info",
  running: "info",
  queued: "neutral",
  invited: "warning",
  available: "info",
  "coming-soon": "neutral",
  failed: "danger",
  critical: "danger",
  warning: "warning",
  info: "neutral",
  archived: "neutral",
};

const labelMap: Record<string, string> = {
  indexed: "Indexé",
  processing: "Traitement",
  queued: "En file",
  failed: "Échec",
  succeeded: "Réussi",
  running: "En cours",
  connected: "Connecté",
  available: "Disponible",
  "coming-soon": "Bientôt disponible",
  active: "Actif",
  invited: "Invitation",
  info: "Info",
  warning: "Alerte",
  critical: "Critique",
  archived: "Archivé",
};

const toneClasses: Record<Tone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-info/30 bg-info/10 text-info",
  accent: "border-primary/30 bg-primary/10 text-primary",
  neutral: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({
  status,
  label,
  tone,
  className,
}: {
  status: string;
  label?: string;
  tone?: Tone;
  className?: string;
}) {
  const resolved = tone ?? toneMap[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[resolved],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label ?? labelMap[status] ?? status}
    </span>
  );
}
