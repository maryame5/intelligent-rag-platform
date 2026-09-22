import { createFileRoute } from "@tanstack/react-router";
import { OnboardingFlow } from "@/components/onboarding-flow";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Configuration initiale — Acme Intelligence" },
      { name: "description", content: "Créez votre workspace, invitez votre équipe et votre première base documentaire." },
      { property: "og:title", content: "Configuration initiale — Acme Intelligence" },
      { property: "og:description", content: "Workspace, équipe et première base de connaissance en trois étapes." },
    ],
  }),
  component: OnboardingFlow,
});
