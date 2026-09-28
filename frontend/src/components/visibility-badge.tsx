import { Globe, Lock, Users } from "lucide-react";
import type { Visibility } from "@/lib/types";
import { cn } from "@/lib/utils";

const map = {
  private: { icon: Lock, label: "Privée" },
  team: { icon: Users, label: "Équipe" },
  workspace: { icon: Globe, label: "Workspace" },
} as const;

export function VisibilityBadge({
  visibility,
  className,
}: {
  visibility: Visibility;
  className?: string;
}) {
  const { icon: Icon, label } = map[visibility];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

export function AvatarStack({ initials, max = 4 }: { initials: string[]; max?: number }) {
  const shown = initials.slice(0, max);
  const rest = initials.length - shown.length;
  return (
    <div className="flex -space-x-1.5">
      {shown.map((i) => (
        <span
          key={i}
          className="flex size-6 items-center justify-center rounded-full border border-background bg-surface-raised text-[10px] font-medium text-muted-foreground"
        >
          {i}
        </span>
      ))}
      {rest > 0 ? (
        <span className="flex size-6 items-center justify-center rounded-full border border-background bg-muted text-[10px] font-medium text-muted-foreground">
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
