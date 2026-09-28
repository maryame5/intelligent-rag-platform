import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ChatContent } from "@/components/data-pages";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Conversations — SmartRAG" },
      {
        name: "description",
        content: "Interrogez vos documents et obtenez des réponses sourcées et vérifiables.",
      },
      { property: "og:title", content: "Conversations — SmartRAG" },
      { property: "og:description", content: "Réponses ancrées dans vos sources autorisées." },
    ],
  }),
  component: () => (
    <AppShell>
      <ChatContent />
    </AppShell>
  ),
});
