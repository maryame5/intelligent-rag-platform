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
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#3d4f7e] via-[#3d4f7e] to-[#262236] p-10 lg:flex lg:flex-col text-white">
        {/* Decorative blurs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#e18546]/15 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
        {/* Dot grid */}
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <div className="relative z-10 flex items-center gap-2.5 font-semibold text-lg">
          <img src="/icon.png" alt="SmartRAG" className="size-9 rounded-lg object-contain" />
          <span className="tracking-tight">SmartRAG</span>
        </div>

        <div className="relative z-10 my-auto max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#e18546]">Plateforme RAG d'entreprise</p>
          <h1 className="mt-5 text-4xl font-bold leading-tight">
            La connaissance de votre entreprise, gouvernée et prête à répondre.
          </h1>
          <div className="mt-10 space-y-4">
            {[
              { icon: CheckCircle2, text: "Sources citées et réponses vérifiables" },
              { icon: Shield, text: "Recherche hybride avec reranking" },
              { icon: Zap, text: "Pipeline d'ingestion automatisé" },
            ].map((item) => (
              <p key={item.text} className="flex items-center gap-3 text-sm text-white/80">
                <item.icon className="size-5 shrink-0 text-[#e18546]" />
                {item.text}
              </p>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">Sécurité et isolation des données par utilisateur.</p>
      </section>

      {/* ───── Right panel — Form ───── */}
      <section className="flex items-center justify-center bg-[#fefef3] p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src="/icon.png" alt="SmartRAG" className="size-9 rounded-lg object-contain" />
            <strong className="text-lg text-[#262236]">SmartRAG</strong>
          </div>

          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-[#3d4f7e]/10 px-3 py-1 text-xs font-medium text-[#3d4f7e]">
            <Brain className="size-3.5" />
            {mode === "login" ? "Bon retour" : "Nouveau compte"}
          </div>
          <h2 className="mt-3 text-2xl font-bold text-[#262236]">{mode === "login" ? "Connexion" : "Créer un compte"}</h2>
          <p className="mt-2 text-sm text-[#262236]/60">
            {mode === "login" ? "Accédez à votre espace documentaire sécurisé." : "Quelques secondes, sans carte bancaire."}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <Label className="text-[#262236]/80">Email</Label>
              <Input className="mt-2 h-11 border-[#262236]/10 bg-white focus-visible:border-[#3d4f7e] focus-visible:ring-[#3d4f7e]/20" name="email" type="email" required placeholder="vous@entreprise.com" />
            </label>
            <label className="block">
              <Label className="text-[#262236]/80">Mot de passe</Label>
              <Input className="mt-2 h-11 border-[#262236]/10 bg-white focus-visible:border-[#3d4f7e] focus-visible:ring-[#3d4f7e]/20" name="password" type="password" minLength={8} required placeholder="8 caractères minimum" />
            </label>
            {message ? (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{message}</p>
            ) : null}
            <Button className="w-full h-11 rounded-lg bg-[#3d4f7e] text-white font-semibold shadow-lg shadow-[#3d4f7e]/20 hover:bg-[#2d3d66] transition-all" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              {mode === "login" ? "Se connecter" : "Créer mon compte"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#262236]/50">
            {mode === "login" ? "Nouveau ici ?" : "Déjà un compte ?"}{" "}
            <Link to={mode === "login" ? "/auth/register" : "/auth/login"} className="font-semibold text-[#3d4f7e] hover:text-[#e18546] transition-colors">
              {mode === "login" ? "Créer un compte" : "Se connecter"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
