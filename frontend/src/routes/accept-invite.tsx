import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { ArrowRight, Building2, CheckCircle2, Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { api, type InvitationDetails } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/config";
import { toast } from "sonner";

export const Route = createFileRoute("/accept-invite")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Accepter l'invitation — SmartRAG" },
      { name: "description", content: "Rejoignez votre espace de travail SmartRAG." },
    ],
  }),
  component: AcceptInviteScreen,
});

function AcceptInviteScreen() {
  const { token } = useSearch({ from: "/accept-invite" });
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Jeton d'invitation manquant dans le lien.");
      setLoading(false);
      return;
    }

    api
      .getInvitationByToken(token)
      .then((data) => {
        setInvite(data);
        if (data.isExpired) {
          setError("Cette invitation a expiré. Veuillez demander une nouvelle invitation.");
        } else if (data.isAccepted) {
          setError("Cette invitation a déjà été acceptée. Vous pouvez vous connecter directement.");
        }
      })
      .catch((err) => {
        setError(err.message || "Invitation invalide ou introuvable.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !invite) return;

    if (!user && password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (!user && password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    try {
      const tokens = await api.acceptInvitation(token, {
        displayName: displayName.trim() || undefined,
        password: password || undefined,
      });

      localStorage.setItem("access_token", tokens.accessToken);
      localStorage.setItem("refresh_token", tokens.refreshToken);

      toast.success(`Bienvenue dans le workspace "${invite.workspaceName}" !`);
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error(err.message || "Échec de l'acceptation de l'invitation.");
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      {/* ───── Left panel — Branding ───── */}
      <section className="relative hidden overflow-hidden bg-nuit p-10 lg:flex lg:flex-col text-papier">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-nuit-soft/60 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-marine/40 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative z-10 flex items-center gap-2.5 font-semibold text-lg">
          <div className="flex size-9 items-center justify-center rounded-xl bg-orbite text-nuit font-bold shadow-sm">
            S
          </div>
          <span className="tracking-tight font-extrabold text-white">{APP_NAME}</span>
        </div>

        <div className="relative z-10 my-auto max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-orbite/20 px-3 py-1 font-mono text-xs font-semibold text-orbite">
            <Building2 className="size-3.5" />
            Invitation Collaborateur
          </div>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-white">
            Rejoignez votre équipe sur SmartRAG.
          </h1>
          <p className="mt-4 text-slate-300">
            Accédez aux bases documentaires, interrogez les connaissances de l'organisation avec des citations vérifiables.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { icon: ShieldCheck, text: "Accès cloisonné et sécurisé par espace de travail" },
              { icon: UserCheck, text: "Gouvernance des rôles et traçabilité des accès" },
            ].map((item) => (
              <p key={item.text} className="flex items-center gap-3 text-sm text-slate-200">
                <item.icon className="size-4 shrink-0 text-emerald-400" />
                {item.text}
              </p>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-400">
          Plateforme documentaire souveraine et sécurisée.
        </p>
      </section>

      {/* ───── Right panel — Invitation Card / Form ───── */}
      <section className="flex items-center justify-center bg-slate-50 p-6 dark:bg-background">
        <div className="w-full max-w-md">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="size-8 animate-spin text-marine" />
              <p className="mt-4 text-sm text-muted-foreground">Vérification de l'invitation...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">Invitation inaccessible</h2>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => navigate({ to: "/auth/login" })}
              >
                Retour à la connexion
              </Button>
            </div>
          ) : invite ? (
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-orbite-soft text-braise">
                  <Building2 className="size-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{invite.workspaceName}</h2>
                  <p className="text-xs text-muted-foreground">
                    Invité par {invite.inviterName || invite.inviterEmail}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
                Vous rejoignez en tant que{" "}
                <span className="font-semibold text-foreground">
                  {invite.role === "ADMIN" ? "Administrateur" : "Membre"}
                </span>{" "}
                avec l'adresse <strong className="text-foreground">{invite.email}</strong>.
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {!user ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="dName">Nom d'affichage (optionnel)</Label>
                      <Input
                        id="dName"
                        placeholder="ex: Marie Dupont"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mPass">Définissez votre mot de passe</Label>
                      <Input
                        id="mPass"
                        type="password"
                        placeholder="Au moins 8 caractères"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mPassConf">Confirmez votre mot de passe</Label>
                      <Input
                        id="mPassConf"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Vous êtes actuellement connecté(e). Cliquez ci-dessous pour rejoindre ce workspace avec votre compte.
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-marine font-semibold text-papier hover:bg-nuit"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 size-4" />
                  )}
                  Accepter et rejoindre
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
