import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  ChevronRight,
  Clock3,
  Crown,
  FileText,
  Loader2,
  MessagesSquare,
  Play,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Zap,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { KPICard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { RAGAreaChart, RAGRadialGauge } from "@/components/rag-charts";
import { PreviewBadge } from "@/components/preview-badge";

export function DashboardContent() {
  const { data: metrics } = useQuery({ queryKey: ["metrics"], queryFn: api.getMetrics });
  const { data: activity = [] } = useQuery({ queryKey: ["activity"], queryFn: api.getActivity });
  const { data: kbs = [] } = useQuery({ queryKey: ["kbs"], queryFn: api.getKnowledgeBases });
  const realDocumentCount = kbs.reduce((sum, kb) => sum + kb.documentCount, 0);

  // Pipeline réel : tous les documents de toutes les KBs, triés par date
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

  const pipelineStatusMap: Record<string, string> = {
    PROCESSING: "processing",
    READY: "indexed",
    FAILED: "failed",
  };
  const pipelineLabelMap: Record<string, string> = {
    PROCESSING: "En cours",
    READY: "Indexé",
    FAILED: "Échec",
  };

  return (
    <>
      <PageHeader
        title="Tableau de Bord & Analytique Documentaire"
        description="Supervision en temps réel de l'ingestion de vos documents, volume de questions et indice de fiabilité."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              asChild
              variant="outline"
              className="border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold shadow-2xs"
            >
              <Link to="/chat">
                <MessagesSquare className="mr-1.5 size-4 text-indigo-600" />
                Ouvrir le Chat
              </Link>
            </Button>
            <Button
              asChild
              className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold shadow-sm"
            >
              <Link to="/knowledge-bases">
                <Plus className="mr-1.5 size-4" />
                Nouvelle base
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Top KPI Metric Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Card 1: Documents Indexés */}
          <div className="rounded-2xl border border-slate-200 p-5 bg-white shadow-2xs hover:shadow-sm hover:border-indigo-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Documents Indexés
              </span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <BookOpen className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-extrabold font-mono text-slate-900">
                {realDocumentCount}
              </p>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                <Check className="size-3" /> 100% Vectorisés
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Répartis sur{" "}
              <strong className="text-slate-800">
                {kbs.length} base{kbs.length > 1 ? "s" : ""}
              </strong>{" "}
              actives
            </p>
          </div>

          {/* Card 2: Requêtes RAG */}
          <div className="rounded-2xl border border-slate-200 p-5 bg-white shadow-2xs hover:shadow-sm hover:border-indigo-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Questions Posées
              </span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Search className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-extrabold font-mono text-slate-900">
                {metrics?.queriesThisWeek.toLocaleString("fr-FR") ?? "—"}
              </p>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Questions posées aux bases</p>
          </div>

          {/* Card 3: Satisfaction */}
          <div className="rounded-2xl border border-slate-200 p-5 bg-white shadow-2xs hover:shadow-sm hover:border-emerald-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Satisfaction
              </span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <ShieldCheck className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-extrabold font-mono text-emerald-600">
                {metrics?.answeredRate != null ? `${Math.round(metrics.answeredRate * 100)}%` : "—"}
              </p>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Basée sur les retours 👍</p>
          </div>

          {/* Card 4: Latence P95 */}
          <div className="rounded-2xl border border-slate-200 p-5 bg-white shadow-2xs hover:shadow-sm hover:border-indigo-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Vitesse de Réponse
              </span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                <Zap className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-extrabold font-mono text-slate-900">
                {metrics?.latencyP95 != null ? `${Math.round(metrics.latencyP95)} ms` : "—"}
              </p>
              <span className="inline-flex items-center rounded-md bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 text-[10px] font-mono font-bold">
                Recherche + IA
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Temps de réponse instantané</p>
          </div>
        </div>

        {/* Interactive Charts Section */}
        <div className="grid gap-5 xl:grid-cols-[1.4fr_.9fr]">
          {/* Left: Volume area chart */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
              <div>
                <h2 className="font-extrabold text-base text-slate-900">
                  Volume des Questions & Activité
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Évolution des interrogations sur vos documents
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-mono font-bold text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Temps Réel
                </span>
              </div>
            </div>
            <div className="pt-2">
              <RAGAreaChart data={metrics?.series || []} height={230} />
            </div>
          </section>

          {/* Right: Triade d'Évaluation */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs flex flex-col justify-between">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="font-extrabold text-base text-slate-900">
                Indicateurs de Confiance & Qualité
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mesure de la fidélité, de la pertinence et de la précision
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 py-4">
              <RAGRadialGauge
                score={metrics?.quality.faithfulness ?? null}
                label="Fidélité"
                sublabel="Sans hallucination"
              />
              <RAGRadialGauge
                score={metrics?.quality.answerRelevance ?? null}
                label="Pertinence"
                sublabel="Réponse exacte"
              />
              <RAGRadialGauge
                score={metrics?.quality.contextRecall ?? null}
                label="Rappel @5"
                sublabel="Passages trouvés"
              />
              <RAGRadialGauge
                score={metrics?.quality.contextPrecision ?? null}
                label="Précision"
                sublabel="Classement IA"
              />
            </div>
          </section>
        </div>

        {/* Quick Knowledge Base Cards Grid */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h2 className="font-extrabold text-base text-slate-900">
                Bases de Connaissances Actives
              </h2>
              <p className="text-xs text-slate-500">Vos collections documentaires accessibles</p>
            </div>
            <Link
              to="/knowledge-bases"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Gérer toutes les bases <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kbs.map((kb) => (
              <div
                key={kb.id}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between hover:border-indigo-300 hover:bg-white hover:shadow-2xs transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <BookOpen className="size-4" />
                    </div>
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                      Opérationnelle
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 truncate">{kb.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {kb.documentCount} document{kb.documentCount > 1 ? "s" : ""} indexé
                    {kb.documentCount > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <Link
                    to="/chat"
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <MessagesSquare className="size-3.5" /> Poser une question
                  </Link>
                  <Link
                    to="/knowledge-bases/$kbId"
                    params={{ kbId: kb.id }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Gérer →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Split (Recent Activity & Ingestion Pipeline) */}
        <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-2xl border border-[#dcdfd9] bg-white overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#dcdfd9] p-4 bg-[#fafbfa]">
              <h2 className="font-extrabold text-sm text-[#28264B] dark:text-[#E8EAE7]">
                Journal d'activité récent
              </h2>
              <span className="text-xs text-[#4E5174] font-medium">
                {activity.length} événements
              </span>
            </div>
            <ul className="divide-y divide-[#dcdfd9] max-h-[300px] overflow-y-auto">
              {activity.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 p-3.5 text-xs hover:bg-[#fafbfa] transition-colors"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-[#28264B] text-white font-bold text-[10px]">
                    {item.user.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[#28264B]">
                      <strong className="text-[#28264B] font-bold">{item.user}</strong>{" "}
                      {item.action} <span className="font-bold text-[#AA0033]">{item.target}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-[#4E5174] font-mono">{item.time}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#dcdfd9] bg-white overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#dcdfd9] p-4 bg-[#fafbfa]">
              <h2 className="font-extrabold text-sm text-[#28264B] dark:text-[#E8EAE7]">
                File de traitement MinIO / Celery
              </h2>
              <span className="text-xs text-[#4E5174] font-medium">{allDocs.length} fichiers</span>
            </div>
            <div className="divide-y divide-[#dcdfd9] max-h-[300px] overflow-y-auto">
              {allDocs.length === 0 ? (
                <p className="p-6 text-center text-xs text-[#4E5174]">
                  Aucun document en attente dans la file.
                </p>
              ) : (
                allDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3.5 text-xs hover:bg-[#fafbfa] transition-colors"
                  >
                    <FileText className="size-4 shrink-0 text-[#28264B]" />
                    <span className="min-w-0 flex-1 truncate font-semibold text-[#28264B]">
                      {doc.title}
                    </span>
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

  const { data: bases = [], isLoading } = useQuery({
    queryKey: ["kbs"],
    queryFn: api.getKnowledgeBases,
  });

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
                <DialogDescription>
                  Elle sera vide — vous pourrez y importer des documents ensuite.
                </DialogDescription>
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
          <p className="text-sm text-muted-foreground">
            Aucune base pour l’instant — créez la première.
          </p>
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
                  <span>
                    {kb.documentCount} document{kb.documentCount === 1 ? "" : "s"}
                  </span>
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
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [kbId, setKbId] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const { data: kbs = [] } = useQuery({ queryKey: ["kbs"], queryFn: api.getKnowledgeBases });
  const { data: answers = [], isLoading } = useQuery({
    queryKey: ["verified"],
    queryFn: () => api.getVerifiedAnswers(),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      return api.createVerifiedAnswer({
        knowledgeBaseId: kbId,
        question,
        answer,
        tags,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verified"] });
      setQuestion("");
      setAnswer("");
      setTagsInput("");
      setIsOpen(false);
      toast.success("Réponse vérifiée enregistrée avec succès !");
    },
    onError: (err: Error) => toast.error(err.message || "Erreur lors de l'enregistrement"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteVerifiedAnswer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verified"] });
      toast.success("Réponse supprimée.");
    },
    onError: (err: Error) => toast.error(err.message || "Erreur lors de la suppression"),
  });

  return (
    <>
      <PageHeader
        title="Réponses vérifiées & Q&A de référence"
        description="Référentiel des réponses certifiées par vos experts métier pour garantir la conformité des réponses RAG."
        actions={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#AA0033] text-white hover:bg-[#28264B]">
                <Plus className="mr-1.5 size-4" />
                Certifier une réponse
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[#28264B] dark:text-[#E8EAE7]">
                  <ShieldCheck className="size-5 text-[#AA0033]" />
                  Nouvelle réponse de référence
                </DialogTitle>
                <DialogDescription>
                  Ajoutez une question fréquente et sa réponse officielle certifiée liée à une base
                  de connaissances.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!kbId || !question.trim() || !answer.trim()) return;
                  createMutation.mutate();
                }}
                className="space-y-4 py-2"
              >
                <div className="space-y-2">
                  <Label htmlFor="vKb">Base de connaissances associée</Label>
                  <Select value={kbId} onValueChange={setKbId} required>
                    <SelectTrigger id="vKb">
                      <SelectValue placeholder="Sélectionner une base..." />
                    </SelectTrigger>
                    <SelectContent>
                      {kbs.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          {k.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vQ">Question ou requête type</Label>
                  <Input
                    id="vQ"
                    placeholder="ex: Quelle est la procédure pour demander un congé sans solde ?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vA">Réponse certifiée</Label>
                  <textarea
                    id="vA"
                    rows={4}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Rédigez la réponse validée par les experts..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vTags">Tags (séparés par des virgules)</Label>
                  <Input
                    id="vTags"
                    placeholder="RH, Congés, Procédure"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                  />
                </div>
                <DialogFooter className="mt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || !kbId || !question.trim() || !answer.trim()
                    }
                    className="bg-[#AA0033] text-white hover:bg-[#28264B]"
                  >
                    {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Enregistrer la réponse
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-4 p-4 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-[#AA0033]" />
            Chargement des réponses vérifiées...
          </div>
        ) : answers.length === 0 ? (
          <div className="panel flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[#AA0033]/10 text-[#AA0033] dark:text-[#AA0033]">
              <ShieldCheck className="size-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[#28264B] dark:text-[#E8EAE7]">
              Aucune réponse certifiée pour le moment
            </h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Les réponses certifiées servent de vérité terrain (Gold Standard) pour alimenter vos
              agents RAG avec des faits immuables.
            </p>
            <Button
              onClick={() => setIsOpen(true)}
              className="mt-5 bg-[#AA0033] text-white hover:bg-[#28264B]"
            >
              <Plus className="mr-2 size-4" />
              Ajouter une première réponse
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {answers.map((a) => (
              <article
                key={a.id}
                className="panel border-border/80 p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-base text-[#28264B] dark:text-[#E8EAE7]">
                        {a.question}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {a.answer}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-[#AA0033] dark:text-[#E8EAE7]">
                          Vérifiée par {a.verifiedBy}
                        </span>
                        <span>·</span>
                        <span>{a.uses} utilisations</span>
                        {a.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Supprimer"
                    onClick={() => {
                      if (confirm("Voulez-vous vraiment supprimer cette réponse vérifiée ?")) {
                        deleteMutation.mutate(a.id);
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function TeamContent() {
  const queryClient = useQueryClient();
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberRole, setMemberRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

  // Charger la liste des workspaces réels
  const { data: workspaces = [], isLoading: isLoadingWs } = useQuery({
    queryKey: ["workspaces"],
    queryFn: api.getWorkspaces,
  });

  // Définir le workspace actif par défaut
  const currentWsId = selectedWsId || workspaces[0]?.id || null;
  const currentWorkspace = workspaces.find((w) => w.id === currentWsId);

  // Charger les membres du workspace actif
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["workspace-members", currentWsId],
    queryFn: () => (currentWsId ? api.getWorkspaceMembers(currentWsId) : Promise.resolve([])),
    enabled: !!currentWsId,
  });

  // Créer un workspace
  const createWsMutation = useMutation({
    mutationFn: (name: string) => api.createWorkspace(name),
    onSuccess: (newWs) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setSelectedWsId(newWs.id);
      setNewWsName("");
      setIsCreateWsOpen(false);
      toast.success(`Workspace "${newWs.name}" créé avec succès !`);
    },
    onError: (err: Error) => toast.error(err.message || "Erreur lors de la création du workspace"),
  });

  // Ajouter un membre
  const addMemberMutation = useMutation({
    mutationFn: () => {
      if (!currentWsId) throw new Error("Aucun workspace sélectionné");
      return api.addWorkspaceMember(currentWsId, memberEmail, memberPassword, memberRole);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", currentWsId] });
      setMemberEmail("");
      setMemberPassword("");
      setMemberRole("MEMBER");
      setIsAddMemberOpen(false);
      toast.success("Membre ajouté avec succès au workspace !");
    },
    onError: (err: Error) => toast.error(err.message || "Erreur lors de l'ajout du membre"),
  });

  // Supprimer un membre
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!currentWsId) throw new Error("Aucun workspace sélectionné");
      return api.removeWorkspaceMember(currentWsId, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", currentWsId] });
      toast.success("Membre retiré du workspace.");
    },
    onError: (err: Error) => toast.error(err.message || "Erreur lors de la suppression"),
  });

  return (
    <>
      <PageHeader
        title="Espaces de travail & Équipe"
        description="Gérez vos workspaces, attribuez les rôles (Admin / Membre) et invitez vos collaborateurs."
        actions={
          <div className="flex items-center gap-2">
            <Dialog open={isCreateWsOpen} onOpenChange={setIsCreateWsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-border/80 hover:bg-secondary">
                  <Building2 className="mr-1.5 size-4 text-[#AA0033] dark:text-[#E8EAE7]" />
                  Nouveau workspace
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-[#28264B] dark:text-[#E8EAE7]">
                    <Building2 className="size-5 text-[#AA0033]" />
                    Créer un nouvel espace de travail
                  </DialogTitle>
                  <DialogDescription>
                    Créez un workspace dédié à votre équipe ou votre projet pour cloisonner la
                    connaissance.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newWsName.trim()) return;
                    createWsMutation.mutate(newWsName.trim());
                  }}
                  className="space-y-4 py-2"
                >
                  <div className="space-y-2">
                    <Label htmlFor="wsName">Nom du workspace</Label>
                    <Input
                      id="wsName"
                      placeholder="ex: R&D Machine Learning, Direction Juridique..."
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      required
                    />
                  </div>
                  <DialogFooter className="mt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsCreateWsOpen(false)}>
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={createWsMutation.isPending || !newWsName.trim()}
                      className="bg-[#AA0033] text-white hover:bg-[#28264B]"
                    >
                      {createWsMutation.isPending && (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      )}
                      Créer le workspace
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {currentWorkspace && (
              <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#AA0033] text-white hover:bg-[#28264B]">
                    <UserPlus className="mr-1.5 size-4 text-[#AA0033]" />
                    Ajouter un membre
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#28264B] dark:text-[#E8EAE7]">
                      <UserPlus className="size-5 text-[#AA0033]" />
                      Ajouter un collaborateur
                    </DialogTitle>
                    <DialogDescription>
                      Ajoutez un utilisateur existant ou créez un nouveau compte avec son mot de
                      passe initial.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addMemberMutation.mutate();
                    }}
                    className="space-y-4 py-2"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="mEmail">Adresse e-mail</Label>
                      <Input
                        id="mEmail"
                        type="email"
                        placeholder="collaborateur@entreprise.com"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mPass">Mot de passe temporaire (pour nouveau compte)</Label>
                      <Input
                        id="mPass"
                        type="password"
                        placeholder="••••••••"
                        value={memberPassword}
                        onChange={(e) => setMemberPassword(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Laissez vide si l'utilisateur possède déjà un compte sur la plateforme.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mRole">Rôle dans le workspace</Label>
                      <Select
                        value={memberRole}
                        onValueChange={(val) => setMemberRole(val as "ADMIN" | "MEMBER")}
                      >
                        <SelectTrigger id="mRole">
                          <SelectValue placeholder="Sélectionner le rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">Membre (Consultation & Chat)</SelectItem>
                          <SelectItem value="ADMIN">Administrateur (Gestion & KBs)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter className="mt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsAddMemberOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        disabled={addMemberMutation.isPending || !memberEmail.trim()}
                        className="bg-[#AA0033] text-white hover:bg-[#28264B]"
                      >
                        {addMemberMutation.isPending && (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        Ajouter
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      <div className="space-y-6 p-4 md:p-6">
        {/* Workspace Switcher Banner */}
        <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-gradient-to-r from-card to-surface-raised p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#AA0033]/15 text-[#AA0033] dark:bg-[#AA0033]/30 dark:text-[#AA0033]">
              <Building2 className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#28264B] dark:text-[#E8EAE7]">
                  {currentWorkspace?.name || "Aucun workspace"}
                </h2>
                <span className="rounded-full bg-[#AA0033]/10 px-2 py-0.5 text-xs font-medium text-[#AA0033] dark:bg-[#AA0033]/30 dark:text-[#E8EAE7]">
                  {members.length} {members.length > 1 ? "membres" : "membre"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {currentWorkspace
                  ? `Créé le ${new Date(currentWorkspace.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
                  : "Créez votre premier workspace pour démarrer"}
              </p>
            </div>
          </div>

          {workspaces.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Changer d'espace :</span>
              <Select value={currentWsId || ""} onValueChange={(val) => setSelectedWsId(val)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Member list / Empty State */}
        {workspaces.length === 0 && !isLoadingWs ? (
          <div className="panel flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-[#AA0033]/10 text-[#AA0033] dark:text-[#AA0033]">
              <Building2 className="size-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[#28264B] dark:text-[#E8EAE7]">
              Aucun espace de travail
            </h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Créez un premier workspace pour organiser vos bases de connaissances et inviter les
              membres de votre équipe.
            </p>
            <Button
              onClick={() => setIsCreateWsOpen(true)}
              className="mt-6 bg-[#AA0033] text-white hover:bg-[#28264B]"
            >
              <Plus className="mr-2 size-4" />
              Créer mon premier workspace
            </Button>
          </div>
        ) : (
          <div className="panel overflow-hidden border border-border/70 shadow-sm">
            <div className="grid grid-cols-[1fr_auto] border-b bg-surface-raised px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid-cols-[1fr_160px_160px_100px]">
              <span>Membre & Coordonnées</span>
              <span className="hidden md:block">Rôle</span>
              <span className="hidden md:block">Date d'adhésion</span>
              <span className="text-right">Actions</span>
            </div>

            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-5 animate-spin text-[#AA0033]" />
                Chargement des membres...
              </div>
            ) : members.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Aucun membre trouvé dans ce workspace.
              </div>
            ) : (
              members.map((m) => {
                const initials = (m.displayName || m.email).split("@")[0].slice(0, 2).toUpperCase();
                return (
                  <div
                    key={m.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 border-b px-5 py-4 transition-colors last:border-0 hover:bg-surface-raised/40 md:grid-cols-[1fr_160px_160px_100px]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#AA0033] to-[#28264B] text-xs font-semibold text-[#E8EAE7] shadow-sm">
                        {initials}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-[#28264B] dark:text-[#E8EAE7]">
                          {m.displayName || m.email.split("@")[0]}
                        </p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-1.5">
                      {m.role === "ADMIN" ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#AA0033]/15 px-2.5 py-1 text-xs font-medium text-[#AA0033] border border-[#AA0033]/30">
                          <Crown className="size-3.5" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#AA0033]/15 px-2.5 py-1 text-xs font-medium text-[#AA0033] dark:text-[#E8EAE7] border border-[#AA0033]/30">
                          <Shield className="size-3.5" />
                          Membre
                        </span>
                      )}
                    </div>

                    <span className="hidden text-xs text-muted-foreground md:block">
                      {m.joinedAt
                        ? new Date(m.joinedAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>

                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Retirer le membre"
                        onClick={() => {
                          if (
                            confirm(`Voulez-vous vraiment retirer ${m.email} de ce workspace ?`)
                          ) {
                            removeMemberMutation.mutate(m.userId);
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}

export function IntegrationsContent() {
  const queryClient = useQueryClient();
  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: api.getIntegrations,
  });

  const connectMutation = useMutation({
    mutationFn: (provider: string) => api.connectIntegration(provider),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      if (updated.status === "connected") {
        toast.success(`Connecteur ${updated.name} activé avec succès !`);
      } else {
        toast.info(`Connecteur ${updated.name} déconnecté.`);
      }
    },
    onError: (err: Error) =>
      toast.error(err.message || "Erreur lors de la configuration du connecteur"),
  });

  return (
    <>
      <PageHeader
        title="Connecteurs & Intégrations"
        description="Connectez les outils où réside le savoir de votre organisation (Notion, Google Drive, Slack, GitHub, Confluence, S3)."
      />
      <div className="grid gap-5 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-[#AA0033]" />
            Chargement des intégrations...
          </div>
        ) : (
          integrations.map((i) => {
            const isConnected = i.status === "connected";
            return (
              <article
                key={i.id}
                className="panel flex flex-col justify-between border-border/70 p-5 transition-shadow hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#AA0033] to-[#28264B] font-mono text-xs font-bold text-[#E8EAE7] shadow-sm">
                      {i.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        isConnected
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {isConnected ? "Connecté" : "Disponible"}
                    </span>
                  </div>
                  <h2 className="mt-4 font-semibold text-[#28264B] dark:text-[#E8EAE7]">
                    {i.name}
                  </h2>
                  <p className="mt-1 min-h-12 text-sm leading-relaxed text-muted-foreground">
                    {i.description}
                  </p>
                </div>
                <Button
                  className={`mt-6 w-full ${
                    isConnected
                      ? "border-border/80 hover:bg-destructive/10 hover:text-destructive"
                      : "bg-[#AA0033] text-white hover:bg-[#28264B]"
                  }`}
                  variant={isConnected ? "outline" : "default"}
                  disabled={connectMutation.isPending}
                  onClick={() => connectMutation.mutate(i.provider)}
                >
                  {connectMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {isConnected ? "Déconnecter" : "Connecter & Synchroniser"}
                </Button>
              </article>
            );
          })
        )}
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
      <PageHeader
        title="Paramètres"
        description="Profil, workspace, sécurité et préférences de réponse."
      />
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
          <p className="mt-1 text-sm text-muted-foreground">
            Votre adresse e-mail est fixée à l'inscription.
          </p>
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
            Rôle&nbsp;:{" "}
            <span className="font-medium capitalize">{profile?.role.toLowerCase() ?? "—"}</span>
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
      <PageHeader
        title="Administration"
        description="Compteurs système, benchmark retrieval et traçabilité."
      />
      <div className="space-y-5 p-4 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard title="Utilisateurs (réel)" value={String(counts?.totalUsers ?? "—")} />
          <KPICard
            title="Knowledge bases (réel)"
            value={String(counts?.totalKnowledgeBases ?? "—")}
          />
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
            <Button
              variant={rerank ? "default" : "outline"}
              onClick={() => setRerank((r) => !r)}
              type="button"
            >
              Reranker {rerank ? "activé" : "désactivé"}
            </Button>
            <Button
              onClick={() => evalMutation.mutate()}
              disabled={!selectedKb || evalMutation.isPending}
            >
              {evalMutation.isPending ? <Loader2 className="animate-spin" /> : <Play />}
              Lancer
            </Button>
          </div>

          {evalMutation.data ? (
            <div className="mt-5 grid gap-3 border-t pt-4 sm:grid-cols-3 xl:grid-cols-6">
              <Metric label="Questions" value={String(evalMutation.data.totalQuestions)} />
              <Metric
                label="Recall@K"
                value={
                  evalMutation.data.meanRecallAtK !== null
                    ? `${Math.round(evalMutation.data.meanRecallAtK * 100)}%`
                    : "—"
                }
              />
              <Metric
                label="Precision@K"
                value={
                  evalMutation.data.meanPrecisionAtK !== null
                    ? `${Math.round(evalMutation.data.meanPrecisionAtK * 100)}%`
                    : "—"
                }
              />
              <Metric label="MRR" value={evalMutation.data.mrr.toFixed(2)} />
              <Metric
                label="Faithfulness"
                value={
                  evalMutation.data.meanFaithfulness !== null
                    ? `${Math.round(evalMutation.data.meanFaithfulness * 100)}%`
                    : "—"
                }
              />
              <Metric
                label="Latence P95"
                value={`${Math.round(evalMutation.data.p95LatencyMs)} ms`}
              />
            </div>
          ) : null}
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="panel p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Qualité RAG</h2>
              <PreviewBadge />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              {[
                ["Faithfulness", metrics?.quality.faithfulness],
                ["Pertinence", metrics?.quality.answerRelevance],
                ["Recall contexte", metrics?.quality.contextRecall],
                ["Precision contexte", metrics?.quality.contextPrecision],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-secondary/40 p-3">
                  <div className="text-muted-foreground">{label}</div>
                  <div className="mt-1 font-mono font-semibold">
                    {typeof value === "number" ? `${Math.round(value * 100)}%` : "—"}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b p-4">
              <span className="font-semibold">Feedback négatif (réel)</span>
              <span className="text-xs text-muted-foreground">
                {feedbackItems.length} réponse(s) à revoir
              </span>
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
                  {f.comment ? (
                    <p className="mt-1 italic text-muted-foreground">« {f.comment} »</p>
                  ) : null}
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
