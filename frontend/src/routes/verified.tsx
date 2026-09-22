import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { VerifiedContent } from "@/components/data-pages";

export const Route = createFileRoute("/verified")({
  head: () => ({
    meta: [
      { title: "Réponses vérifiées — Acme Intelligence" },
      { name: "description", content: "Référentiel des réponses validées par vos experts métier." },
      { property: "og:title", content: "Réponses vérifiées — Acme Intelligence" },
      { property: "og:description", content: "Référentiel des réponses validées par vos experts métier." },
    ],
  }),
  component: () => (
    <AppShell>
      <VerifiedContent />
    </AppShell>
  ),
});
