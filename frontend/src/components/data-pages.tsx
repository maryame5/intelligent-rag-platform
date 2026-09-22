import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Loader2,
  Play,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { KPICard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { PreviewBadge } from "@/components/preview-badge";

export function DashboardContent() {
  const { data: metrics } = useQuery({ queryKey: ["metrics"], queryFn: api.getMetrics });
  const { data: activity = [] } = useQuery({ queryKey: ["activity"], queryFn: api.getActivity });
  const { data: kbs = [] } = useQuery({ queryKey: ["kbs"], queryFn: api.getKnowledgeBases });
  const realDocumentCount = kbs.reduce((sum, kb) => sum + kb.documentCount, 0);

  // Pipeline réel : tous les documents de toutes les KBs, triés par date,
  // pour afficher les 5 derniers avec leur statut (PROCESSING / READY / FAILED).
  const { data: allDocs = [] } = useQuery({
    queryKey: ["all-docs-pipeline", kbs.map((k) => k.id)],
    queryFn: async () => {
      const results = await Promise.all(kbs.map((kb) => api.getDocuments(kb.id, 10)));
      return results
        .flat()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8);
    },
    enabled: kbs.length > 0,
  });

  // Mapper les statuts backend vers les clés attendues par <StatusBadge>
  const pipelineStatusMap: Record<string, string> = {
    PROCESSING: "processing",
    READY: "indexed",
    FAILED: "failed",
  };
  const pipelineLabelMap: Record<string, string> = {
    PROCESSING: "Traitement",
    READY: "Indexé",
    FAILED: "Échec",
  };

  return (
    <>
      <PageHeader
        title="Vue d'ensemble"
        description="Santé documentaire, activité et qualité de réponse de votre workspace."
        actions={
          <Button asChild>
            <Link to="/knowledge-bases">
              <Plus />
              Nouvelle base
            </Link>
          </Button>
        }
      />
      <div className="space-y-6 p-4 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard title="Documents indexés (réel)" value={String(realDocumentCount)} />
          <KPICard
            title="Requêtes cette semaine"
            value={metrics?.queriesThisWeek.toLocaleString("fr-FR") ?? "—"}
            trend="démo"
          />
          <KPICard
            title="Taux de réponse"
            value={metrics ? `${Math.round(metrics.answeredRate * 100)} %` : "—"}
            trend="démo"
          />
          <KPICard title="Latence P95" value={metrics ? `${(metrics.latencyP95 / 1000).toFixed(1)} s` : "—"} trend="démo" />
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <section className="panel">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold">Activité récente</h2>
              <PreviewBadge />
            </div>
            <ul className="divide-y divide-border">
              {activity.slice(0, 5).map((item) => (
                <li key={item.id} className="flex gap-3 p-4 text-sm">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  <p className="min-w-0 flex-1">
                    <strong>{item.actor}</strong> {item.action} <span className="text-primary">{item.target}</span>
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.at}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold">Pipeline d'ingestion</h2>
              {/* Plus de PreviewBadge — données réelles */}
            </div>
            <div className="space-y-3 p-4">
              {allDocs.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun document importé pour l'instant.</p>
              ) : (
                allDocs.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 text-sm">
                    <Clock3 className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{doc.title}</span>
                    <StatusBadge
                      status={pipelineStatusMap[doc.status] ?? "queued"}
                      label={pipelineLabelMap[doc.status] ?? doc.status}
                    />
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export function KnowledgeBasesContent() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");

  const { data: bases = [], isLoading } = useQuery({ queryKey: ["kbs"], queryFn: api.getKnowledgeBases });

  const createMutation = useMutation({
    mutationFn: (kbName: string) => api.createKnowledgeBase(kbName),
    onSuccess: (kb) => {
      toast.success(`Base « ${kb.name} » créée.`);
      queryClient.invalidateQueries({ queryKey: ["kbs"] });
      setOpen(false);
      setName("");
    },
    onError: (error: Error) => toast.error(error.message || "Échec de la création."),
  });

  const filtered = bases.filter((kb) => kb.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Bases de connaissance"
        description={`${bases.length} espace${bases.length === 1 ? "" : "s"} documentaire${bases.length === 1 ? "" : "s"}.`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus />
                Créer une base
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle knowledge base</DialogTitle>
                <DialogDescription>Elle sera vide — vous pourrez y importer des documents ensuite.</DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim()) createMutation.mutate(name.trim());
                }}
              >
                <Label htmlFor="kb-name">Nom</Label>
                <Input
                  id="kb-name"
                  className="mt-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Documentation produit"
                  autoFocus
                  required
                />
                <DialogFooter className="mt-6">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="animate-spin" /> : null}
                    Créer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="p-4 md:p-6">
        <div className="mb-4 flex max-w-md items-center gap-2 rounded-md border bg-surface px-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            className="border-0 shadow-none focus-visible:ring-0"
            placeholder="Rechercher une base…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune base pour l’instant — créez la première.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((kb) => (
              <Link
                key={kb.id}
                to="/knowledge-bases/$kbId"
                params={{ kbId: kb.id }}
                className="panel group p-5 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between">
                  <span className="rounded-md bg-primary/10 p-2 text-primary">
                    <BookOpen className="size-5" />
                  </span>
                </div>
                <h2 className="mt-4 font-semibold group-hover:text-primary">{kb.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Créée le {new Date(kb.createdAt).toLocaleDateString("fr-FR")}
                </p>
                <div className="mt-5 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                  <span>{kb.documentCount} document{kb.documentCount === 1 ? "" : "s"}</span>
                  <ArrowRight className="size-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export { ChatContent } from "./chat-content";

export function VerifiedContent() {
  const { data: answers = [] } = useQuery({ queryKey: ["verified"], queryFn: api.getVerifiedAnswers });
  return (
    <>
      <PageHeader
        title="Réponses vérifiées"
        description="Référentiel des réponses validées par vos experts métier."
        actions={
          <>
            <PreviewBadge />
            <Button disabled>
              <Plus />
              Ajouter une réponse
            </Button>
          </>
        }
      />
      <div className="space-y-3 p-4 md:p-6">
        {answers.map((a) => (
          <article key={a.id} className="panel p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
              <div className="min-w-0">
                <h2 className="font-medium">{a.question}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{a.answer}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Vérifiée par {a.verifiedBy}</span>
                  <span>·</span>
                  <span>{a.uses} utilisations</span>
                  {a.tags.map((t) => (
                    <span key={t} className="rounded bg-secondary px-2 py-0.5">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export function TeamContent() {
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: api.getMembers });
  return (
    <>
      <PageHeader
        title="Équipe & accès"
        description="Membres, invitations et responsabilités du workspace."
        actions={
          <>
            <PreviewBadge />
            <Button disabled>
              <Plus />
              Inviter
            </Button>
          </>
        }
      />
      <div className="p-4 md:p-6">
        <div className="panel overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] border-b bg-surface-raised px-4 py-3 text-xs font-semibold uppercase text-muted-foreground md:grid-cols-[1fr_180px_140px_120px]">
            <span>Membre</span>
            <span className="hidden md:block">Rôle</span>
            <span className="hidden md:block">Activité</span>
            <span>Statut</span>
          </div>
          {members.map((m) => (
            <div
              key={m.id}
              className="grid grid-cols-[1fr_auto] items-center gap-3 border-b px-4 py-3 last:border-0 md:grid-cols-[1fr_180px_140px_120px]"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {m.initials}
                </span>
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
              </div>
              <span className="hidden text-sm capitalize md:block">{m.role}</span>
              <span className="hidden text-sm text-muted-foreground md:block">{m.lastActive}</span>
              <StatusBadge status={m.status === "active" ? "indexed" : "queued"} label={m.status === "active" ? "Actif" : "Invité"} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function IntegrationsContent() {
  const { data: integrations = [] } = useQuery({ queryKey: ["integrations"], queryFn: api.getIntegrations });
  return (
    <>
      <PageHeader
        title="Intégrations"
        description="Connectez les systèmes où vit la connaissance de votre entreprise."
        actions={<PreviewBadge />}
      />
      <div className="grid gap-4 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-3">
        {integrations.map((i) => (
          <article key={i.id} className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-md bg-secondary font-mono text-xs">
                {i.name.slice(0, 2).toUpperCase()}
              </span>
              <StatusBadge status={i.status === "connected" ? "indexed" : "queued"} label={i.status === "connected" ? "Connecté" : "Bientôt"} />
            </div>
            <h2 className="mt-4 font-semibold">{i.name}</h2>
            <p className="mt-1 min-h-10 text-sm text-muted-foreground">{i.description}</p>
            <Button className="mt-5 w-full" variant="outline" disabled>
              {i.status === "connected" ? "Configurer" : "Me prévenir"}
            </Button>
          </article>
        ))}
      </div>
    </>
  );
}

export function SettingsContent() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: api.getMe });
  const [displayName, setDisplayName] = useState("");

  // Initialiser le champ une fois le profil chargé
  const [initialised, setInitialised] = useState(false);
  if (profile && !initialised) {
    setDisplayName(profile.displayName ?? "");
    setInitialised(true);
  }

  const updateMutation = useMutation({
    mutationFn: () => api.updateMe(displayName),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      toast.success("Profil mis à jour.");
    },
    onError: (error: Error) => toast.error(error.message || "Échec de la mise à jour."),
  });

  return (
    <>
      <PageHeader title="Paramètres" description="Profil, workspace, sécurité et préférences de réponse." />
      <div className="grid gap-5 p-4 md:p-6 xl:grid-cols-[220px_1fr]">
        <nav className="space-y-1">
          {["Profil", "Workspace", "Sécurité", "Modèles & recherche", "Facturation"].map((x, i) => (
            <button
              key={x}
              className={`w-full rounded-md px-3 py-2 text-left text-sm ${i === 0 ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {x}
            </button>
          ))}
        </nav>
        <section className="panel max-w-3xl p-5">
          <h2 className="font-semibold">Profil personnel</h2>
          <p className="mt-1 text-sm text-muted-foreground">Votre adresse e-mail est fixée à l'inscription.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              Nom affiché
              <Input
                className="mt-2"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Prénom Nom"
              />
            </label>
            <label className="text-sm">
              Adresse e-mail
              <Input className="mt-2" disabled value={profile?.email ?? "—"} />
            </label>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Rôle&nbsp;: <span className="font-medium capitalize">{profile?.role.toLowerCase() ?? "—"}</span>
          </div>
          <Button
            className="mt-5"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || !displayName.trim()}
          >
            {updateMutation.isPending ? <Loader2 className="animate-spin" /> : null}
            Enregistrer
          </Button>
        </section>
      </div>
    </>
  );
}

export function AdminContent() {
  const { data: counts } = useQuery({ queryKey: ["admin-counts"], queryFn: api.getAdminCounts });
  const { data: metrics } = useQuery({ queryKey: ["metrics"], queryFn: api.getMetrics });
  const { data: feedbackItems = [] } = useQuery({
    queryKey: ["admin-feedback", "down"],
    queryFn: () => api.getAdminFeedback("down"),
  });
  const { data: kbs = [] } = useQuery({ queryKey: ["kbs"], queryFn: api.getKnowledgeBases });

  const [selectedKb, setSelectedKb] = useState<string>("");
  const [mode, setMode] = useState<"vector" | "hybrid">("vector");
  const [rerank, setRerank] = useState(false);

  const evalMutation = useMutation({
    mutationFn: () => api.runEvaluation({ knowledgeBaseId: selectedKb, mode, rerank }),
    onSuccess: () => toast.success("Évaluation terminée."),
    onError: (error: Error) => toast.error(error.message || "Échec de l'évaluation."),
  });

  return (
    <>
      <PageHeader title="Administration" description="Compteurs système, benchmark retrieval et traçabilité." />
      <div className="space-y-5 p-4 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard title="Utilisateurs (réel)" value={String(counts?.totalUsers ?? "—")} />
          <KPICard title="Knowledge bases (réel)" value={String(counts?.totalKnowledgeBases ?? "—")} />
          <KPICard title="Documents (réel)" value={String(counts?.totalDocuments ?? "—")} />
          <KPICard
            title="Feedback (réel)"
            value={counts ? `${counts.totalFeedbackUp} 👍 / ${counts.totalFeedbackDown} 👎` : "—"}
          />
        </div>

        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Lancer un benchmark retrieval</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Recall@K, Precision@K, MRR et faithfulness (LLM-as-judge) sur le dataset d'exemple, en
            conditions réelles contre une knowledge base (Sprint 7 du backend).
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-48">
              <Label className="text-xs text-muted-foreground">Knowledge base</Label>
              <Select value={selectedKb} onValueChange={setSelectedKb}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choisir une base" />
                </SelectTrigger>
                <SelectContent>
                  {kbs.map((kb) => (
                    <SelectItem key={kb.id} value={kb.id}>
                      {kb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-40">
              <Label className="text-xs text-muted-foreground">Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as "vector" | "hybrid")}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vector">Vector-only</SelectItem>
                  <SelectItem value="hybrid">Hybride</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant={rerank ? "default" : "outline"} onClick={() => setRerank((r) => !r)} type="button">
              Reranker {rerank ? "activé" : "désactivé"}
            </Button>
            <Button onClick={() => evalMutation.mutate()} disabled={!selectedKb || evalMutation.isPending}>
              {evalMutation.isPending ? <Loader2 className="animate-spin" /> : <Play />}
              Lancer
            </Button>
          </div>

          {evalMutation.data ? (
            <div className="mt-5 grid gap-3 border-t pt-4 sm:grid-cols-3 xl:grid-cols-6">
              <Metric label="Questions" value={String(evalMutation.data.totalQuestions)} />
              <Metric
                label="Recall@K"
                value={evalMutation.data.meanRecallAtK !== null ? `${Math.round(evalMutation.data.meanRecallAtK * 100)}%` : "—"}
              />
              <Metric
                label="Precision@K"
                value={evalMutation.data.meanPrecisionAtK !== null ? `${Math.round(evalMutation.data.meanPrecisionAtK * 100)}%` : "—"}
              />
              <Metric label="MRR" value={evalMutation.data.mrr.toFixed(2)} />
              <Metric
                label="Faithfulness"
                value={evalMutation.data.meanFaithfulness !== null ? `${Math.round(evalMutation.data.meanFaithfulness * 100)}%` : "—"}
              />
              <Metric label="Latence P95" value={`${Math.round(evalMutation.data.p95LatencyMs)} ms`} />
            </div>
          ) : null}
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="panel p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Qualité RAG (historique)</h2>
              <PreviewBadge />
            </div>
            {metrics?.quality.map((q) => (
              <div key={q.experiment} className="mt-3">
                <div className="flex justify-between text-sm">
                  <span>{q.experiment}</span>
                  <span className="font-mono">{Math.round(q.faithfulness * 100)}%</span>
                </div>
                <div className="mt-1 h-1.5 bg-secondary">
                  <div className="h-full bg-primary" style={{ width: `${q.faithfulness * 100}%` }} />
                </div>
              </div>
            ))}
          </section>
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b p-4">
              <span className="font-semibold">Feedback négatif (réel)</span>
              <span className="text-xs text-muted-foreground">{feedbackItems.length} réponse(s) à revoir</span>
            </div>
            {feedbackItems.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Aucun 👎 pour l’instant.</p>
            ) : (
              feedbackItems.slice(0, 7).map((f) => (
                <div key={f.feedbackId} className="border-b px-4 py-3 text-xs last:border-0">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>
                      {f.knowledgeBaseName} · {f.userEmail}
                    </span>
                    <span>{new Date(f.createdAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <p className="mt-1 truncate font-mono">{f.messageContent}</p>
                  {f.comment ? <p className="mt-1 italic text-muted-foreground">« {f.comment} »</p> : null}
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-lg tabular-nums">{value}</p>
    </div>
  );
}
