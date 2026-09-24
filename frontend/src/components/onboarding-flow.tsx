import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Check } from "lucide-react";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/backend-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Onboarding simplifié par rapport au gabarit initial : pas de création de
 * workspace ni d'invitation d'équipe (aucun endpoint backend pour ça à ce
 * jour — voir lib/api.ts). Seule étape réelle : créer la première knowledge
 * base via POST /knowledge-bases.
 */
export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [kbName, setKbName] = useState("Documentation produit");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function next(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (step === 0) {
      setStep(1);
      return;
    }

    if (step === 1) {
      setLoading(true);
      try {
        await api.createKnowledgeBase(kbName);
        setStep(2);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Création impossible.");
      } finally {
        setLoading(false);
      }
      return;
    }

    navigate({ to: "/" });
  }

  const steps = ["Bienvenue", "Première base", "Terminé"];

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b px-5 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <img src="/icon.png" alt="SmartRAG" className="size-8 rounded-md object-contain" />
            SmartRAG
          </div>
          <span className="text-sm text-muted-foreground">Configuration initiale</span>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-5 py-8">
        <ol className="mb-10 grid grid-cols-3 gap-2">
          {steps.map((s, i) => (
            <li key={s}>
              <div className={`h-1 rounded ${i <= step ? "bg-primary" : "bg-secondary"}`} />
              <p className={`mt-2 text-xs ${i === step ? "font-semibold" : "text-muted-foreground"}`}>
                {i + 1}. {s}
              </p>
            </li>
          ))}
        </ol>
        <form onSubmit={next} className="panel mx-auto max-w-xl p-6 md:p-8">
          {step === 0 ? (
            <>
              <span className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <BookOpen />
              </span>
              <h1 className="mt-5 text-2xl font-semibold">Bienvenue sur SmartRAG</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Vous allez créer votre première knowledge base — un espace documentaire que vous
                pourrez interroger en langage naturel une fois des documents importés.
              </p>
            </>
          ) : step === 1 ? (
            <>
              <span className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <BookOpen />
              </span>
              <h1 className="mt-5 text-2xl font-semibold">Créez votre première Knowledge Base</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Vous pourrez y importer des documents (PDF, DOCX, HTML, Markdown) juste après.
              </p>
              <label className="mt-6 block">
                <Label>Nom de la base</Label>
                <Input className="mt-2" value={kbName} onChange={(e) => setKbName(e.target.value)} required />
              </label>
            </>
          ) : (
            <div className="text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
                <Check />
              </span>
              <h1 className="mt-5 text-2xl font-semibold">Votre espace est prêt</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                « {kbName} » a été créée. Importez des documents pour commencer à l'interroger.
              </p>
            </div>
          )}
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          <div className="mt-8 flex justify-end">
            <Button disabled={loading}>
              {step === 2 ? "Ouvrir le tableau de bord" : "Continuer"}
              <ArrowRight />
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
