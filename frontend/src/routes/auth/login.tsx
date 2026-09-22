import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth-screen";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Connexion — Acme Intelligence" },
      { name: "description", content: "Accédez à votre espace documentaire sécurisé." },
      { property: "og:title", content: "Connexion — Acme Intelligence" },
      { property: "og:description", content: "Accédez à votre espace documentaire sécurisé." },
    ],
  }),
  component: () => <AuthScreen mode="login" />,
});
