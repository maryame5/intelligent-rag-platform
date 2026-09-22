import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { DashboardContent } from "@/components/data-pages";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vue d'ensemble — Acme Intelligence" },
      { name: "description", content: "Santé documentaire, activité et qualité de réponse de votre workspace." },
      { property: "og:title", content: "Vue d'ensemble — Acme Intelligence" },
      { property: "og:description", content: "Santé documentaire, activité et qualité de réponse de votre workspace." },
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
