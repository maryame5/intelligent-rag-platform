import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { IntegrationsContent } from "@/components/data-pages";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Intégrations — SmartRAG" },
      { name: "description", content: "Connectez les systèmes où vit la connaissance de votre entreprise." },
      { property: "og:title", content: "Intégrations — SmartRAG" },
      { property: "og:description", content: "Connectez les systèmes où vit la connaissance de votre entreprise." },
    ],
  }),
  component: () => (
    <AppShell>
      <IntegrationsContent />
    </AppShell>
  ),
});
