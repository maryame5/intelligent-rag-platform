import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Crown,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MessagesSquare,
  Play,
  Plus,
  Search,
  Settings2,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCog,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const { data: kbs = [] } = useQuery<import("@/lib/api").KnowledgeBase[]>({
    queryKey: ["kbs"],
    queryFn: () => api.getKnowledgeBases(),
  });
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
                <MessagesSquare className="mr-1.5 size-4 text-marine" />
                Ouvrir le Chat
              </Link>
            </Button>
            <Button
              asChild
              className="bg-marine text-papier hover:bg-nuit text-xs font-bold shadow-sm"
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
          <div className="rounded-2xl border border-brume p-5 bg-white shadow-2xs hover:shadow-sm hover:border-marine transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Documents Indexés
              </span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-brume text-marine border border-marine/20">
                <BookOpen className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-extrabold font-mono text-slate-900">
                {realDocumentCount}
              </p>
              {realDocumentCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                  <Check className="size-3" /> Vectorisés
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-medium">
                  En attente
                </span>
              )}
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
          <div className="rounded-2xl border border-brume p-5 bg-white shadow-2xs hover:shadow-sm hover:border-marine transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Questions Posées
              </span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-brume text-marine border border-marine/20">
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
          <div className="rounded-2xl border border-brume p-5 bg-white shadow-2xs hover:shadow-sm hover:border-marine transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Vitesse de Réponse
              </span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-brume text-marine border border-marine/20">
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
              className="text-xs font-bold text-marine hover:text-nuit flex items-center gap-1"
            >
              Gérer toutes les bases <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kbs.map((kb) => (
              <div
                key={kb.id}
                className="rounded-xl border border-brume bg-brume/50 p-4 flex flex-col justify-between hover:border-marine hover:bg-white hover:shadow-2xs transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-brume text-marine border border-marine/20">
                      <BookOpen className="size-4" />
                    </div>
                    {kb.documentCount > 0 ? (
                      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                        Opérationnelle
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-medium">
                        Base vide
                      </span>
                    )}
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
                    className="text-xs font-bold text-marine hover:text-nuit flex items-center gap-1"
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
                      {item.action} <span className="font-bold text-marine">{item.target}</span>
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

  const activeWsId =
    typeof window !== "undefined"
      ? localStorage.getItem("rag.activeWorkspaceId") || undefined
      : undefined;

  const { data: bases = [], isLoading } = useQuery({
    queryKey: ["kbs", activeWsId],
    queryFn: () => api.getKnowledgeBases(activeWsId),
  });

  const createMutation = useMutation({
    mutationFn: (kbName: string) => api.createKnowledgeBase(kbName, activeWsId),
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
  const [answerToDelete, setAnswerToDelete] = useState<string | null>(null);

  const { data: kbs = [] } = useQuery<import("@/lib/api").KnowledgeBase[]>({
    queryKey: ["kbs"],
    queryFn: () => api.getKnowledgeBases(),
  });
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
              <Button className="bg-marine text-papier hover:bg-nuit">
                <Plus className="mr-1.5 size-4" />
                Certifier une réponse
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[#28264B] dark:text-[#E8EAE7]">
                  <ShieldCheck className="size-5 text-marine" />
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
                    className="bg-marine text-papier hover:bg-nuit"
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
            <Loader2 className="mr-2 size-5 animate-spin text-marine" />
            Chargement des réponses vérifiées...
          </div>
        ) : answers.length === 0 ? (
          <div className="panel flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-orbite-soft text-braise">
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
              className="mt-5 bg-marine text-papier hover:bg-nuit"
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
                        <span className="font-medium text-marine dark:text-paper">
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
                    onClick={() => setAnswerToDelete(a.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!answerToDelete}
        onOpenChange={(open) => !open && setAnswerToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette réponse certifiée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette réponse de référence ne sera plus prioritaire lors des futures requêtes des
              utilisateurs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (answerToDelete) {
                  deleteMutation.mutate(answerToDelete);
                  setAnswerToDelete(null);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function TeamContent() {
  const queryClient = useQueryClient();
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [memberToRemove, setMemberToRemove] = useState<{ userId: string; email: string } | null>(
    null,
  );
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

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

  // Charger les invitations en attente
  const { data: pendingInvitations = [], isLoading: isLoadingInvites } = useQuery({
    queryKey: ["workspace-invitations", currentWsId],
    queryFn: () => (currentWsId ? api.getWorkspaceInvitations(currentWsId) : Promise.resolve([])),
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

  // Inviter un membre par e-mail
  const inviteMutation = useMutation({
    mutationFn: () => {
      if (!currentWsId) throw new Error("Aucun workspace sélectionné");
      return api.createWorkspaceInvitation(currentWsId, inviteEmail.trim(), inviteRole);
    },
    onSuccess: (invitation) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations", currentWsId] });
      setInviteEmail("");
      setInviteRole("MEMBER");
      setIsInviteOpen(false);
      if (invitation.inviteUrl) {
        setLastInviteUrl(invitation.inviteUrl);
      }
      toast.success("Invitation envoyée avec succès par e-mail !");
    },
    onError: (err: Error) => toast.error(err.message || "Erreur lors de l'envoi de l'invitation"),
  });

  // Révoquer une invitation
  const revokeInviteMutation = useMutation({
    mutationFn: (invId: string) => {
      if (!currentWsId) throw new Error("Aucun workspace sélectionné");
      return api.revokeWorkspaceInvitation(currentWsId, invId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations", currentWsId] });
      toast.success("Invitation révoquée.");
    },
    onError: (err: Error) => toast.error(err.message || "Erreur lors de la révocation"),
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Lien d'invitation copié dans le presse-papier !");
  };

  return (
    <>
      <PageHeader
        title="Espaces de travail & Équipe"
        description="Gérez vos workspaces, invitez vos collaborateurs par e-mail et attribuez les rôles (Admin / Membre)."
        actions={
          <div className="flex items-center gap-2">
            <Dialog open={isCreateWsOpen} onOpenChange={setIsCreateWsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-border/80 hover:bg-secondary">
                  <Building2 className="mr-1.5 size-4 text-marine dark:text-papier" />
                  Nouveau workspace
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-[#28264B] dark:text-[#E8EAE7]">
                    <Building2 className="size-5 text-marine" />
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
                      className="bg-marine text-papier hover:bg-nuit"
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
              <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-marine text-papier hover:bg-nuit">
                    <Mail className="mr-1.5 size-4 text-papier" />
                    Inviter par e-mail
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#28264B] dark:text-[#E8EAE7]">
                      <Mail className="size-5 text-marine" />
                      Inviter un collaborateur
                    </DialogTitle>
                    <DialogDescription>
                      Un e-mail contenant un lien sécurisé d'invitation sera envoyé. Le
                      collaborateur définira son propre mot de passe lors de son inscription.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      inviteMutation.mutate();
                    }}
                    className="space-y-4 py-2"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="mEmail">Adresse e-mail du collaborateur</Label>
                      <Input
                        id="mEmail"
                        type="email"
                        placeholder="collaborateur@entreprise.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mRole">Rôle dans le workspace</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(val) => setInviteRole(val as "ADMIN" | "MEMBER")}
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
                      <Button type="button" variant="ghost" onClick={() => setIsInviteOpen(false)}>
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        disabled={inviteMutation.isPending || !inviteEmail.trim()}
                        className="bg-marine text-papier hover:bg-nuit"
                      >
                        {inviteMutation.isPending && (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        Envoyer l'invitation
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
            <div className="flex size-11 items-center justify-center rounded-xl bg-orbite-soft text-braise">
              <Building2 className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#28264B] dark:text-[#E8EAE7]">
                  {currentWorkspace?.name || "Aucun workspace"}
                </h2>
                <span className="rounded-full bg-orbite-soft px-2 py-0.5 text-xs font-medium text-braise">
                  {members.length} {members.length > 1 ? "membres" : "membre"}
                </span>
                {pendingInvitations.length > 0 && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {pendingInvitations.length} en attente
                  </span>
                )}
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

        {/* Dernier lien d'invitation généré (utile si l'envoi d'email local est simulé) */}
        {lastInviteUrl && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <Check className="size-4 shrink-0" />
              <span>
                <strong>Lien d'invitation généré :</strong> Partagez ce lien directement si
                nécessaire.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-emerald-500/40 hover:bg-emerald-500/20"
                onClick={() => copyToClipboard(lastInviteUrl)}
              >
                <Copy className="mr-1.5 size-3" />
                Copier le lien
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setLastInviteUrl(null)}
              >
                Fermer
              </Button>
            </div>
          </div>
        )}

        {/* Member list / Empty State */}
        {workspaces.length === 0 && !isLoadingWs ? (
          <div className="panel flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-orbite-soft text-braise">
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
              className="mt-6 bg-marine text-papier hover:bg-nuit"
            >
              <Plus className="mr-2 size-4" />
              Créer mon premier workspace
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Table des membres actifs */}
            <div className="panel overflow-hidden border border-border/70 shadow-sm">
              <div className="border-b bg-surface-raised px-5 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Membres actifs du workspace
                </h3>
              </div>
              <div className="grid grid-cols-[1fr_auto] border-b bg-surface-raised/50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid-cols-[1fr_160px_160px_100px]">
                <span>Membre & Coordonnées</span>
                <span className="hidden md:block">Rôle</span>
                <span className="hidden md:block">Date d'adhésion</span>
                <span className="text-right">Actions</span>
              </div>

              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-5 animate-spin text-marine" />
                  Chargement des membres...
                </div>
              ) : members.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Aucun membre trouvé dans ce workspace.
                </div>
              ) : (
                members.map((m) => {
                  const initials =
                    (m.displayName || m.email || "?").split("@")[0]?.slice(0, 2).toUpperCase() ??
                    "??";
                  return (
                    <div
                      key={m.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 border-b px-5 py-4 transition-colors last:border-0 hover:bg-surface-raised/40 md:grid-cols-[1fr_160px_160px_100px]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-marine text-xs font-semibold text-papier shadow-sm">
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
                          <span className="inline-flex items-center gap-1 rounded-md bg-orbite-soft px-2.5 py-1 text-xs font-medium text-braise border border-braise/30">
                            <Crown className="size-3.5" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border">
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
                          onClick={() => setMemberToRemove({ userId: m.userId, email: m.email })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Table des invitations en attente */}
            {pendingInvitations.length > 0 && (
              <div className="panel overflow-hidden border border-border/70 shadow-sm">
                <div className="border-b bg-surface-raised px-5 py-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Invitations en attente d'acceptation
                  </h3>
                </div>
                <div className="grid grid-cols-[1fr_auto] border-b bg-surface-raised/50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid-cols-[1fr_140px_160px_140px]">
                  <span>E-mail invité</span>
                  <span className="hidden md:block">Rôle proposé</span>
                  <span className="hidden md:block">Expire le</span>
                  <span className="text-right">Actions</span>
                </div>

                {pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 border-b px-5 py-3.5 transition-colors last:border-0 hover:bg-surface-raised/40 md:grid-cols-[1fr_140px_160px_140px]"
                  >
                    <div className="flex items-center gap-2.5">
                      <Mail className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{inv.email}</span>
                    </div>

                    <div className="hidden md:block">
                      <span className="inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {inv.role === "ADMIN" ? "Administrateur" : "Membre"}
                      </span>
                    </div>

                    <span className="hidden text-xs text-muted-foreground md:block">
                      {new Date(inv.expiresAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    <div className="flex items-center justify-end gap-1">
                      {inv.inviteUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-marine dark:text-orbite hover:bg-secondary"
                          title="Copier le lien d'invitation"
                          onClick={() => copyToClipboard(inv.inviteUrl!)}
                        >
                          <Copy className="mr-1 size-3.5" />
                          Copier lien
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Révoquer l'invitation"
                        onClick={() => revokeInviteMutation.mutate(inv.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce collaborateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment retirer {memberToRemove?.email} de ce workspace ? L'utilisateur
              n'aura plus accès aux bases de connaissances associées à cet espace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (memberToRemove) {
                  removeMemberMutation.mutate(memberToRemove.userId);
                  setMemberToRemove(null);
                }
              }}
            >
              Retirer le collaborateur
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
            <Loader2 className="mr-2 size-5 animate-spin text-marine" />
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
                    <span className="flex size-11 items-center justify-center rounded-xl bg-marine font-mono text-xs font-bold text-papier shadow-sm">
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
                      : "bg-marine text-papier hover:bg-nuit"
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

type SettingsTab = "profile" | "workspace" | "security" | "models";

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profil", icon: <Users className="size-4" /> },
  { id: "workspace", label: "Workspace", icon: <Building2 className="size-4" /> },
  { id: "security", label: "Sécurité", icon: <Lock className="size-4" /> },
  { id: "models", label: "Modèles & recherche", icon: <Settings2 className="size-4" /> },
];

export function SettingsContent() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // ── Profil ──────────────────────────────────────────────────────────
  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: api.getMe });
  const [displayName, setDisplayName] = useState("");
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

  // ── Sécurité ─────────────────────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const changePwdMutation = useMutation({
    mutationFn: () => api.changePassword(currentPwd, newPwd),
    onSuccess: () => {
      toast.success("Mot de passe modifié avec succès.");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    },
    onError: (error: Error) => toast.error(error.message || "Échec du changement de mot de passe."),
  });

  // ── Workspace ─────────────────────────────────────────────────────────
  const { data: workspaces = [], isLoading: isLoadingWs } = useQuery({
    queryKey: ["workspaces"],
    queryFn: api.getWorkspaces,
    enabled: activeTab === "workspace",
  });
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const currentWsId = selectedWsId || workspaces[0]?.id || null;
  const currentWorkspace = workspaces.find((w) => w.id === currentWsId);
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["workspace-members", currentWsId],
    queryFn: () => (currentWsId ? api.getWorkspaceMembers(currentWsId) : Promise.resolve([])),
    enabled: !!currentWsId && activeTab === "workspace",
  });

  // ── Modèles ──────────────────────────────────────────────────────────
  const [searchMode, setSearchMode] = useState<"vector" | "hybrid">(() => {
    if (typeof window === "undefined") return "hybrid";
    return (localStorage.getItem("rag_search_mode") as "vector" | "hybrid") || "hybrid";
  });
  const [topK, setTopK] = useState<number>(() => {
    if (typeof window === "undefined") return 5;
    const saved = localStorage.getItem("rag_top_k");
    return saved ? Number(saved) : 5;
  });
  const [rerankerEnabled, setRerankerEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("rag_reranker_enabled") === "true";
  });

  const handleSearchModeChange = (mode: "vector" | "hybrid") => {
    setSearchMode(mode);
    localStorage.setItem("rag_search_mode", mode);
    toast.success(`Mode de recherche défini sur ${mode === "hybrid" ? "Hybride" : "Vectoriel"}`);
  };

  const handleTopKChange = (val: number) => {
    setTopK(val);
    localStorage.setItem("rag_top_k", String(val));
  };

  const handleRerankerChange = () => {
    setRerankerEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("rag_reranker_enabled", String(next));
      toast.success(`Reranker ${next ? "activé" : "désactivé"}`);
      return next;
    });
  };

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Profil, workspace, sécurité et préférences de réponse."
      />
      <div className="grid gap-5 p-4 md:p-6 xl:grid-cols-[240px_1fr]">
        {/* ── Navigation latérale ── */}
        <nav className="space-y-1">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-secondary font-semibold text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ── Contenu actif ── */}
        <div className="min-w-0">
          {/* ────────── PROFIL ────────── */}
          {activeTab === "profile" && (
            <section className="panel max-w-2xl space-y-6 p-6">
              <div>
                <h2 className="text-base font-semibold">Profil personnel</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Votre adresse e-mail est fixée à l'inscription et ne peut pas être modifiée.
                </p>
              </div>

              {/* Avatar + infos */}
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-marine/20 to-braise/20 text-2xl font-bold text-marine">
                  {(profile?.displayName ?? profile?.email ?? "?")[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="font-semibold">{profile?.displayName || "—"}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      profile?.role === "ADMIN"
                        ? "bg-braise/10 text-braise"
                        : "bg-orbite-soft text-marine"
                    }`}
                  >
                    {profile?.role === "ADMIN" ? "Administrateur" : "Utilisateur"}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Nom affiché
                  <Input
                    className="mt-2"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Prénom Nom"
                  />
                </label>
                <label className="text-sm font-medium">
                  Adresse e-mail
                  <Input className="mt-2" disabled value={profile?.email ?? "—"} />
                </label>
              </div>

              {profile?.createdAt && (
                <p className="text-xs text-muted-foreground">
                  Compte créé le{" "}
                  {new Date(profile.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}

              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || !displayName.trim()}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="mr-1 animate-spin" />
                ) : (
                  <Check className="mr-1 size-4" />
                )}
                Enregistrer les modifications
              </Button>
            </section>
          )}

          {/* ────────── WORKSPACE ────────── */}
          {activeTab === "workspace" && (
            <section className="max-w-2xl space-y-5">
              <div className="panel p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Mes workspaces</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Liste des espaces de travail auxquels vous appartenez.
                    </p>
                  </div>
                </div>

                {isLoadingWs ? (
                  <div className="mt-4 flex justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : workspaces.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">Aucun workspace trouvé.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => setSelectedWsId(ws.id)}
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                          ws.id === currentWsId
                            ? "border-marine/30 bg-orbite-soft/30"
                            : "border-border hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex size-9 items-center justify-center rounded-lg bg-marine/10 text-marine">
                          <Building2 className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{ws.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Créé le {new Date(ws.createdAt).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        {ws.id === currentWsId && <Check className="size-4 text-marine shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {currentWorkspace && (
                <div className="panel p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Membres — {currentWorkspace.name}</h3>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                      {members.length} membre{members.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {isLoadingMembers ? (
                    <div className="mt-4 flex justify-center py-4">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="mt-4 divide-y divide-border/50">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 py-2.5">
                          <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-marine/20 to-braise/20 text-sm font-semibold text-marine">
                            {(m.displayName ?? m.email ?? "?")[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {m.displayName ?? m.email}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              m.role === "ADMIN"
                                ? "bg-braise/10 text-braise"
                                : "bg-orbite-soft text-marine"
                            }`}
                          >
                            {m.role === "ADMIN" ? "Admin" : "Membre"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ────────── SÉCURITÉ ────────── */}
          {activeTab === "security" && (
            <section className="panel max-w-2xl space-y-6 p-6">
              <div>
                <h2 className="text-base font-semibold">Changer le mot de passe</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choisissez un mot de passe robuste d'au moins 8 caractères.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium">
                  Mot de passe actuel
                  <div className="relative mt-2">
                    <Input
                      type={showPwd ? "text" : "password"}
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>

                <label className="block text-sm font-medium">
                  Nouveau mot de passe
                  <Input
                    type="password"
                    className="mt-2"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="••••••••"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Confirmer le nouveau mot de passe
                  <Input
                    type="password"
                    className="mt-2"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="••••••••"
                  />
                  {confirmPwd && newPwd !== confirmPwd && (
                    <p className="mt-1 text-xs text-red-500">
                      Les mots de passe ne correspondent pas.
                    </p>
                  )}
                </label>
              </div>

              <Button
                onClick={() => changePwdMutation.mutate()}
                disabled={
                  changePwdMutation.isPending ||
                  !currentPwd ||
                  !newPwd ||
                  newPwd !== confirmPwd ||
                  newPwd.length < 6
                }
              >
                {changePwdMutation.isPending ? (
                  <Loader2 className="mr-1 animate-spin" />
                ) : (
                  <KeyRound className="mr-1 size-4" />
                )}
                Mettre à jour le mot de passe
              </Button>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex items-start gap-2">
                  <Shield className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-300">
                      Bonnes pratiques
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-amber-700 dark:text-amber-400 list-disc list-inside">
                      <li>Utilisez au moins 12 caractères</li>
                      <li>Combinez lettres, chiffres et symboles</li>
                      <li>N'utilisez pas le même mot de passe sur d'autres sites</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ────────── MODÈLES & RECHERCHE ────────── */}
          {activeTab === "models" && (
            <section className="max-w-2xl space-y-5">
              <div className="panel p-5 space-y-5">
                <div>
                  <h2 className="text-base font-semibold">Préférences de recherche</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ces paramètres sont sauvegardés localement et s'appliquent à vos sessions de
                    chat.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Mode de recherche</Label>
                    <div className="mt-2 flex gap-2">
                      {(["vector", "hybrid"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => handleSearchModeChange(mode)}
                          className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                            searchMode === mode
                              ? "border-marine bg-orbite-soft/40 text-marine"
                              : "border-border hover:bg-secondary/50 text-muted-foreground"
                          }`}
                        >
                          {mode === "vector" ? "🔍 Vectoriel" : "⚡ Hybride (Vector + BM25)"}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {searchMode === "hybrid"
                        ? "Le mode hybride combine la recherche vectorielle et BM25 pour de meilleurs résultats."
                        : "La recherche vectorielle utilise uniquement les embeddings sémantiques."}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">
                      Nombre de chunks récupérés (Top-K)
                    </Label>
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={topK}
                        onChange={(e) => handleTopKChange(Number(e.target.value))}
                        className="flex-1 accent-marine"
                      />
                      <span className="w-8 text-center font-mono text-sm font-semibold">
                        {topK}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Un Top-K plus élevé améliore le recall mais augmente la latence.
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                    <div>
                      <p className="text-sm font-medium">Reranker (Cross-Encoder)</p>
                      <p className="text-xs text-muted-foreground">
                        Améliore la précision au prix d'une latence légèrement plus élevée.
                      </p>
                    </div>
                    <button
                      onClick={handleRerankerChange}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        rerankerEnabled ? "bg-marine" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform ${
                          rerankerEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="panel p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-braise" />
                  <h3 className="font-semibold">Modèle LLM configuré</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Le modèle de génération est configuré globalement par l'administrateur via les
                  variables d'environnement du backend.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/80 bg-surface-raised p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Modèle de génération
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-foreground">GPT-4o mini</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Synthèse & réponses RAG avec citations
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-surface-raised p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Modèle d'embedding
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-foreground">
                      text-embedding-3-small
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      1536 dimensions · Indexation sémantique
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

export function AdminContent() {
  const queryClient = useQueryClient();
  const { data: counts } = useQuery({ queryKey: ["admin-counts"], queryFn: api.getAdminCounts });
  const { data: metrics } = useQuery({ queryKey: ["metrics"], queryFn: api.getMetrics });
  const { data: feedbackItems = [] } = useQuery({
    queryKey: ["admin-feedback", "down"],
    queryFn: () => api.getAdminFeedback("down"),
  });
  const { data: kbs = [] } = useQuery<import("@/lib/api").KnowledgeBase[]>({
    queryKey: ["kbs"],
    queryFn: () => api.getKnowledgeBases(),
  });
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: api.getAdminUsers,
  });

  const [selectedKb, setSelectedKb] = useState<string>("");
  const [mode, setMode] = useState<"vector" | "hybrid">("vector");
  const [rerank, setRerank] = useState(false);

  // Auto-sélectionner la première base si aucune sélectionnée
  React.useEffect(() => {
    if (!selectedKb && kbs.length > 0) {
      setSelectedKb(kbs[0].id);
    }
  }, [kbs, selectedKb]);

  const evalMutation = useMutation({
    mutationFn: () => api.runEvaluation({ knowledgeBaseId: selectedKb, mode, rerank }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      toast.success("Évaluation terminée avec succès !");
    },
    onError: (error: Error) => toast.error(error.message || "Échec de l'évaluation."),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "ADMIN" | "USER" }) =>
      api.updateAdminUserRole(userId, role),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin-users"], (prev: typeof allUsers) =>
        prev.map((u) => (u.id === updated.id ? updated : u)),
      );
      toast.success(`Rôle mis à jour pour ${updated.email}.`);
    },
    onError: (error: Error) => toast.error(error.message || "Échec du changement de rôle."),
  });

  return (
    <>
      <PageHeader
        title="Administration"
        description="Compteurs système, benchmark retrieval et traçabilité."
      />
      <div className="space-y-5 p-4 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard title="Utilisateurs" value={String(counts?.totalUsers ?? "—")} />
          <KPICard title="Knowledge bases" value={String(counts?.totalKnowledgeBases ?? "—")} />
          <KPICard title="Documents indexés" value={String(counts?.totalDocuments ?? "—")} />
          <KPICard
            title="Satisfaction réponses"
            value={counts ? `${counts.totalFeedbackUp} 👍 / ${counts.totalFeedbackDown} 👎` : "—"}
          />
        </div>

        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Lancer un benchmark retrieval</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Recall@K, Precision@K, MRR et fidélité de réponse (LLM-as-judge) calculés sur le dataset
            d'évaluation en conditions réelles contre une base de connaissances.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-48">
              <Label className="text-xs text-muted-foreground">Knowledge base</Label>
              <Select value={selectedKb} onValueChange={setSelectedKb}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue
                    placeholder={kbs.length === 0 ? "Aucune base disponible" : "Choisir une base"}
                  />
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
              className="bg-marine text-papier hover:bg-nuit"
            >
              {evalMutation.isPending ? (
                <Loader2 className="mr-2 animate-spin size-4" />
              ) : (
                <Play className="mr-2 size-4" />
              )}
              {evalMutation.isPending ? "Évaluation en cours..." : "Lancer le benchmark"}
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
              <div className="divide-y max-h-[420px] overflow-y-auto">
                {feedbackItems.map((f) => (
                  <div key={f.feedbackId} className="p-4 text-xs space-y-2.5">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {f.knowledgeBaseName} · {f.userEmail}
                      </span>
                      <span>
                        {new Date(f.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {f.questionContent ? (
                      <div className="rounded-lg bg-secondary/60 p-2.5">
                        <span className="font-semibold text-marine dark:text-orbite text-[11px] block mb-1">
                          Question posée par l'utilisateur :
                        </span>
                        <p className="text-foreground font-medium text-xs">{f.questionContent}</p>
                      </div>
                    ) : null}

                    <div className="rounded-lg bg-muted/40 p-2.5">
                      <span className="font-semibold text-muted-foreground text-[11px] block mb-1">
                        Réponse générée par le modèle :
                      </span>
                      <p className="font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {f.messageContent}
                      </p>
                    </div>

                    {f.comment ? (
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                        <strong>Commentaire :</strong> « {f.comment} »
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Gestion des utilisateurs ── */}
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <UserCog className="size-4 text-marine" />
              <span className="font-semibold">Gestion des utilisateurs</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {allUsers.length} compte{allUsers.length !== 1 ? "s" : ""}
            </span>
          </div>
          {isLoadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : allUsers.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun utilisateur trouvé.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {allUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-marine/20 to-braise/20 text-sm font-semibold text-marine">
                    {(u.displayName ?? u.email ?? "?")[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.displayName ?? u.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    {u.createdAt && (
                      <p className="text-xs text-muted-foreground">
                        Inscrit le {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                  <Select
                    value={u.role}
                    onValueChange={(role) =>
                      changeRoleMutation.mutate({ userId: u.id, role: role as "ADMIN" | "USER" })
                    }
                    disabled={changeRoleMutation.isPending}
                  >
                    <SelectTrigger
                      className={`w-36 text-xs font-medium ${
                        u.role === "ADMIN"
                          ? "border-braise/30 bg-braise/5 text-braise"
                          : "border-marine/30 bg-orbite-soft/30 text-marine"
                      }`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">Utilisateur</SelectItem>
                      <SelectItem value="ADMIN">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </section>
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
