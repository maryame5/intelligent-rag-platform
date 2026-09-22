import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Marque une section de l'UI dont les données sont encore mockées (aucun
 * endpoint backend prévu à ce jour — voir la section "DONNÉES DE
 * DÉMONSTRATION" dans lib/api.ts). Volontairement visible : jamais laisser
 * penser qu'une donnée de démonstration est une mesure réelle.
 */
export function PreviewBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning",
        className,
      )}
      title="Données de démonstration — aucun endpoint backend pour cette fonctionnalité à ce jour."
    >
      <Sparkles className="size-3" />
      Aperçu
    </span>
  );
}
