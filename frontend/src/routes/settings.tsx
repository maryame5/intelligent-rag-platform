import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SettingsContent } from "@/components/data-pages";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres — Acme Intelligence" },
      { name: "description", content: "Profil, workspace, sécurité et préférences de réponse." },
      { property: "og:title", content: "Paramètres — Acme Intelligence" },
      { property: "og:description", content: "Profil, workspace, sécurité et préférences de réponse." },
    ],
  }),
  component: () => (
    <AppShell>
      <SettingsContent />
    </AppShell>
  ),
});
