import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { DashboardContent } from "@/components/data-pages";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Vue d'ensemble — SmartRAG" },
      {
        name: "description",
        content: "Santé documentaire, activité et qualité de réponse de votre workspace.",
      },
      { property: "og:title", content: "Vue d'ensemble — SmartRAG" },
      {
        property: "og:description",
        content: "Santé documentaire, activité et qualité de réponse de votre workspace.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
