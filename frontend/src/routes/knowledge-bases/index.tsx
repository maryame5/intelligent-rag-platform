import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { KnowledgeBasesContent } from "@/components/data-pages";

export const Route = createFileRoute("/knowledge-bases/")({
  head: () => ({
    meta: [
      { title: "Bases de connaissance — Acme Intelligence" },
      { name: "description", content: "Espaces documentaires gouvernés, prêts pour la recherche et la citation." },
      { property: "og:title", content: "Bases de connaissance — Acme Intelligence" },
      { property: "og:description", content: "Espaces documentaires gouvernés, prêts pour la recherche." },
    ],
  }),
  component: () => (
    <AppShell>
      <KnowledgeBasesContent />
    </AppShell>
  ),
});
