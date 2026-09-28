import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AdminContent } from "@/components/data-pages";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Observabilité — SmartRAG" },
      {
        name: "description",
        content: "Performance, qualité RAG, traitements et traçabilité du workspace.",
      },
      { property: "og:title", content: "Observabilité — SmartRAG" },
      {
        property: "og:description",
        content: "Performance, qualité RAG, traitements et traçabilité.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <AdminContent />
    </AppShell>
  ),
});
