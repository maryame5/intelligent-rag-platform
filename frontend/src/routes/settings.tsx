import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SettingsContent } from "@/components/data-pages";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres — SmartRAG" },
      { name: "description", content: "Profil, workspace, sécurité et préférences de réponse." },
      { property: "og:title", content: "Paramètres — SmartRAG" },
      {
        property: "og:description",
        content: "Profil, workspace, sécurité et préférences de réponse.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <SettingsContent />
    </AppShell>
  ),
});
