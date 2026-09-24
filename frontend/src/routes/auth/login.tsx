import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth-screen";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Connexion — SmartRAG" },
      { name: "description", content: "Accédez à votre espace documentaire sécurisé." },
      { property: "og:title", content: "Connexion — SmartRAG" },
      { property: "og:description", content: "Accédez à votre espace documentaire sécurisé." },
    ],
  }),
  component: () => <AuthScreen mode="login" />,
});
