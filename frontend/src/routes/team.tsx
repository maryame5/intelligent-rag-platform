import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { TeamContent } from "@/components/data-pages";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Équipe & accès — SmartRAG" },
      { name: "description", content: "Membres, invitations et responsabilités du workspace." },
      { property: "og:title", content: "Équipe & accès — SmartRAG" },
      {
        property: "og:description",
        content: "Membres, invitations et responsabilités du workspace.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <TeamContent />
    </AppShell>
  ),
});
