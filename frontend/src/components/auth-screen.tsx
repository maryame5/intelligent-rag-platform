import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Loader2, Shield, Brain, Zap } from "lucide-react";
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
        navigate({ to: "/dashboard" });
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
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      {/* ───── Left panel — Branding ───── */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#28264B] via-[#28264B] to-[#1c1a35] p-10 lg:flex lg:flex-col text-white">
        {/* Decorative blurs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#AA0033]/20 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#959EC9]/15 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
        {/* Dot grid */}
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(232,234,231,0.12) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <div className="relative z-10 flex items-center gap-2.5 font-semibold text-lg">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[#AA0033] text-white font-bold">
            S
          </div>
          <span className="tracking-tight font-extrabold">Smart<span className="text-[#959EC9]">RAG</span></span>
        </div>

        <div className="relative z-10 my-auto max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#959EC9]">Plateforme RAG d'entreprise</p>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#E8EAE7]">
            La connaissance de votre entreprise, gouvernée et prête à répondre.
          </h1>
          <div className="mt-10 space-y-4">
            {[
              { icon: CheckCircle2, text: "Sources citées et réponses vérifiables" },
              { icon: Shield, text: "Recherche hybride pgvector + BM25 avec reranking" },
              { icon: Zap, text: "Pipeline d'ingestion MinIO + Celery asynchrone" },
            ].map((item) => (
              <p key={item.text} className="flex items-center gap-3 text-sm text-[#E8EAE7]/90 font-medium">
                <item.icon className="size-5 shrink-0 text-[#AA0033]" />
                {item.text}
              </p>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-[#E8EAE7]/50">Sécurité et isolation des données par espace et rôle (RBAC).</p>
      </section>

      {/* ───── Right panel — Form ───── */}
      <section className="flex items-center justify-center bg-[#fafbfa] p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#AA0033] text-white font-bold">
              S
            </div>
            <strong className="text-lg text-[#28264B]">Smart<span className="text-[#AA0033]">RAG</span></strong>
          </div>

          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-[#28264B]/10 px-3 py-1 text-xs font-semibold text-[#28264B]">
            <Brain className="size-3.5 text-[#AA0033]" />
            {mode === "login" ? "Bon retour" : "Nouveau compte"}
          </div>
          <h2 className="mt-3 text-2xl font-extrabold text-[#28264B]">{mode === "login" ? "Connexion" : "Créer un compte"}</h2>
          <p className="mt-2 text-sm text-[#4E5174]">
            {mode === "login" ? "Accédez à votre espace documentaire sécurisé." : "Quelques secondes, sans carte bancaire."}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <Label className="text-[#28264B] font-semibold text-xs">Email</Label>
              <Input className="mt-2 h-11 border-[#dcdfd9] bg-white focus-visible:border-[#AA0033] focus-visible:ring-[#AA0033]/20" name="email" type="email" required placeholder="vous@entreprise.com" />
            </label>
            <label className="block">
              <Label className="text-[#28264B] font-semibold text-xs">Mot de passe</Label>
              <Input className="mt-2 h-11 border-[#dcdfd9] bg-white focus-visible:border-[#AA0033] focus-visible:ring-[#AA0033]/20" name="password" type="password" minLength={8} required placeholder="8 caractères minimum" />
            </label>
            {message ? (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 font-medium">{message}</p>
            ) : null}
            <Button className="w-full h-11 rounded-lg bg-[#AA0033] text-white font-bold shadow-md hover:bg-[#880029] transition-all cursor-pointer" disabled={loading}>
              {loading ? <Loader2 className="animate-spin size-4" /> : <ArrowRight className="size-4" />}
              {mode === "login" ? "Se connecter" : "Créer mon compte"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#4E5174]">
            {mode === "login" ? "Nouveau ici ?" : "Déjà un compte ?"}{" "}
            <Link to={mode === "login" ? "/auth/register" : "/auth/login"} className="font-bold text-[#AA0033] hover:underline transition-colors">
              {mode === "login" ? "Créer un compte" : "Se connecter"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
