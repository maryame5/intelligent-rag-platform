import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { TeamContent } from "@/components/data-pages";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Équipe & accès — Acme Intelligence" },
      { name: "description", content: "Membres, invitations et responsabilités du workspace." },
      { property: "og:title", content: "Équipe & accès — Acme Intelligence" },
      { property: "og:description", content: "Membres, invitations et responsabilités du workspace." },
    ],
  }),
  component: () => (
    <AppShell>
      <TeamContent />
    </AppShell>
  ),
});
