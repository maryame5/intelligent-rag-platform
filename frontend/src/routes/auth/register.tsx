import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth-screen";

export const Route = createFileRoute("/auth/register")({
  head: () => ({
    meta: [
      { title: "Créer un compte — SmartRAG" },
      {
        name: "description",
        content: "Créez votre workspace et devenez Owner de votre espace documentaire.",
      },
      { property: "og:title", content: "Créer un compte — SmartRAG" },
      {
        property: "og:description",
        content: "Créez votre workspace et devenez Owner de votre espace documentaire.",
      },
    ],
  }),
  component: () => <AuthScreen mode="register" />,
});
