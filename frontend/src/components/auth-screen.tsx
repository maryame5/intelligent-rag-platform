import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/backend-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    try {
      if (mode === "login") {
        await login(email, password);
        navigate({ to: "/" });
      } else {
        await register(email, password);
        navigate({ to: "/onboarding" });
      }
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_.9fr]">
      <section className="hidden border-r bg-sidebar p-10 lg:flex lg:flex-col">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">AI</span>
          Acme Intelligence
        </div>
        <div className="my-auto max-w-xl">
          <p className="font-mono text-xs uppercase text-primary">Enterprise knowledge infrastructure</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            La connaissance de votre entreprise, gouvernée et prête à répondre.
          </h1>
          <div className="mt-10 space-y-4 text-sm text-muted-foreground">
            {["Sources citées et réponses vérifiables", "Recherche hybride avec reranking", "Qualité et traitements mesurables"].map(
              (x) => (
                <p key={x} className="flex gap-3">
                  <CheckCircle2 className="size-5 text-success" />
                  {x}
                </p>
              ),
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Sécurité et isolation des données par utilisateur.</p>
      </section>

      <section className="flex items-center justify-center p-5">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">AI</span>
            <strong>Acme Intelligence</strong>
          </div>
          <p className="text-sm text-primary">{mode === "login" ? "Bon retour" : "Créez votre compte"}</p>
          <h2 className="mt-1 text-2xl font-semibold">{mode === "login" ? "Connexion" : "Créer un compte"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "login" ? "Accédez à votre espace documentaire sécurisé." : "Quelques secondes, sans carte bancaire."}
          </p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <Label>Email</Label>
              <Input className="mt-2" name="email" type="email" required placeholder="vous@entreprise.com" />
            </label>
            <label className="block">
              <Label>Mot de passe</Label>
              <Input className="mt-2" name="password" type="password" minLength={8} required placeholder="8 caractères minimum" />
            </label>
            {message ? <p className="rounded-md border bg-surface p-3 text-sm text-destructive">{message}</p> : null}
            <Button className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              {mode === "login" ? "Se connecter" : "Créer mon compte"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Nouveau ici ?" : "Déjà un compte ?"}{" "}
            <Link to={mode === "login" ? "/auth/register" : "/auth/login"} className="font-medium text-primary">
              {mode === "login" ? "Créer un compte" : "Se connecter"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
