import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, FileText, Loader2, Search, SplitSquareHorizontal, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader, EmptyState } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { PreviewBadge } from "@/components/preview-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, documentStatusBadge, documentTypeLabel } from "@/lib/api";

export const Route = createFileRoute("/knowledge-bases/$kbId")({
  head: () => ({
    meta: [
      { title: "Base de connaissance — Acme Intelligence" },
      { name: "description", content: "Documents, accès et paramètres de la base." },
    ],
  }),
  component: KnowledgeBaseDetail,
});

const TABS = ["Documents", "Accès", "Recherche & qualité", "Paramètres"] as const;
const ACCEPTED_TYPES = ".pdf,.txt,.md,.html,.docx";

function KnowledgeBaseDetail() {
  const { kbId } = Route.useParams();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Documents");
  const [query, setQuery] = useState("");
  const [compareQuery, setCompareQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: kb } = useQuery({ queryKey: ["kb", kbId], queryFn: () => api.getKnowledgeBase(kbId) });
  const { data: docs = [] } = useQuery({ queryKey: ["docs", kbId], queryFn: () => api.getDocuments(kbId) });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: api.getMembers });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { document, jobId } = await api.uploadDocument(kbId, file);
      toast.info(`« ${file.name} » envoyé, traitement en cours…`);
      await queryClient.invalidateQueries({ queryKey: ["docs", kbId] });
      const job = await api.pollJobUntilDone(jobId);
      return { document, job };
    },
    onSuccess: ({ document, job }) => {
      queryClient.invalidateQueries({ queryKey: ["docs", kbId] });
      queryClient.invalidateQueries({ queryKey: ["kb", kbId] });
      queryClient.invalidateQueries({ queryKey: ["kbs"] });
      if (job.status === "SUCCESS") {
        toast.success(`« ${document.title} » indexé avec succès.`);
      } else {
        toast.error(`Échec du traitement de « ${document.title} »${job.errorMessage ? ` : ${job.errorMessage}` : ""}`);
      }
    },
    onError: (error: Error) => toast.error(error.message || "Échec de l'upload."),
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => api.deleteDocument(documentId),
    onSuccess: () => {
      toast.success("Document supprimé.");
      queryClient.invalidateQueries({ queryKey: ["docs", kbId] });
      queryClient.invalidateQueries({ queryKey: ["kb", kbId] });
      queryClient.invalidateQueries({ queryKey: ["kbs"] });
    },
    onError: (error: Error) => toast.error(error.message || "Échec de la suppression."),
  });

  const compareMutation = useMutation({
    mutationFn: (q: string) => api.compareRetrievalModes(kbId, q),
    onError: (error: Error) => toast.error(error.message || "Échec de la comparaison."),
  });

  const [newKbName, setNewKbName] = useState("");
  // Initialiser le champ une fois la KB chargée
  const [kbNameInitialised, setKbNameInitialised] = useState(false);
  if (kb && !kbNameInitialised) {
    setNewKbName(kb.name);
    setKbNameInitialised(true);
  }

  const renameMutation = useMutation({
    mutationFn: () => api.renameKnowledgeBase(kbId, newKbName),
    onSuccess: (updated) => {
      toast.success(`Base renommée en « ${updated.name} ».`);
      queryClient.setQueryData(["kb", kbId], updated);
      queryClient.invalidateQueries({ queryKey: ["kbs"] });
    },
    onError: (error: Error) => toast.error(error.message || "Échec du renommage."),
  });

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  };

  const filtered = docs.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <AppShell>
      <PageHeader
        crumbs={[{ label: "Bases de connaissance", to: "/knowledge-bases" }, { label: kb?.name ?? "Base" }]}
        title={kb?.name ?? "Base de connaissance"}
        description={kb ? `${kb.documentCount} document${kb.documentCount === 1 ? "" : "s"} indexés` : "Chargement…"}
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={handleFileSelected}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
              Importer un document
            </Button>
          </>
        }
      />

      <div className="space-y-5 p-4 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Documents" value={String(kb?.documentCount ?? 0)} icon={FileText} />
          <KpiCard
            label="Indexés"
            value={String(docs.filter((d) => d.status === "READY").length)}
            hint="prêts pour la recherche"
          />
          <KpiCard
            label="En traitement"
            value={String(docs.filter((d) => d.status === "PROCESSING").length)}
          />
          <KpiCard
            label="Échecs"
            value={String(docs.filter((d) => d.status === "FAILED").length)}
          />
        </div>

        <div className="flex flex-wrap gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
                tab === t ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Documents" ? (
          <section className="space-y-4">
            <div className="flex max-w-md items-center gap-2 rounded-md border border-border bg-surface px-3">
              <Search className="size-4 text-muted-foreground" />
              <Input
                className="border-0 shadow-none focus-visible:ring-0"
                placeholder="Rechercher un document…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {filtered.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Aucun document"
                description="Importez des fichiers PDF, DOCX, HTML ou Markdown pour alimenter cette base."
                action={
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload />
                    Importer
                  </Button>
                }
              />
            ) : (
              <div className="panel overflow-hidden">
                <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-border bg-surface-raised px-4 py-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:grid-cols-[1fr_80px_140px_120px_40px]">
                  <span>Document</span>
                  <span className="hidden md:block">Type</span>
                  <span className="hidden md:block">Déposé le</span>
                  <span>Statut</span>
                  <span />
                </div>
                {filtered.map((d) => {
                  const badge = documentStatusBadge(d.status);
                  return (
                    <div
                      key={d.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border px-4 py-2.5 text-sm last:border-0 md:grid-cols-[1fr_80px_140px_120px_40px]"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        {d.status === "FAILED" ? (
                          <AlertCircle className="size-4 shrink-0 text-destructive" />
                        ) : (
                          <FileText className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{d.title}</span>
                      </div>
                      <span className="hidden font-mono text-xs text-muted-foreground md:block">
                        {documentTypeLabel(d.mimeType)}
                      </span>
                      <span className="hidden truncate text-xs text-muted-foreground md:block">
                        {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                      <span className="justify-self-start">
                        <StatusBadge status={badge.status} label={badge.label} />
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer"
                        onClick={() => deleteMutation.mutate(d.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {tab === "Accès" ? (
          <section className="panel max-w-3xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Membres ayant accès</h2>
              <PreviewBadge />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Le backend actuel ne gère qu'un propriétaire par base (pas encore de permissions
              partagées) — cette liste illustre la fonctionnalité cible.
            </p>
            <ul className="mt-5 divide-y divide-border border-t border-border">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {m.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <span className="text-sm capitalize text-muted-foreground">{m.role}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {tab === "Recherche & qualité" ? (
          <section className="space-y-5">
            <div className="panel p-5">
              <h2 className="font-semibold">Comparer les stratégies de retrieval</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Une même question, cherchée en vectoriel seul, en hybride (BM25 + vectoriel),
                et en hybride avec reranking — pour voir concrètement ce que chaque étape
                change (Sprint 5 du backend).
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (compareQuery.trim()) compareMutation.mutate(compareQuery.trim());
                }}
                className="mt-4 flex gap-2"
              >
                <Input
                  placeholder="Ex : quelle est la politique de congés ?"
                  value={compareQuery}
                  onChange={(e) => setCompareQuery(e.target.value)}
                />
                <Button type="submit" disabled={compareMutation.isPending || !compareQuery.trim()}>
                  {compareMutation.isPending ? <Loader2 className="animate-spin" /> : <SplitSquareHorizontal />}
                  Comparer
                </Button>
              </form>

              {compareMutation.data ? (
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {compareMutation.data.map((column) => (
                    <div key={column.mode} className="rounded-md border">
                      <div className="border-b bg-surface-raised px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                        {column.mode}
                      </div>
                      <div className="divide-y">
                        {column.results.length === 0 ? (
                          <p className="p-3 text-xs text-muted-foreground">Aucun résultat.</p>
                        ) : (
                          column.results.map((r) => (
                            <div key={r.chunkId} className="p-3 text-xs">
                              <div className="flex items-center justify-between text-muted-foreground">
                                <span className="truncate font-medium text-foreground">{r.documentFilename}</span>
                                <span className="font-mono">{r.score.toFixed(3)}</span>
                              </div>
                              <p className="mt-1 line-clamp-3 text-muted-foreground">{r.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="panel p-5">
              <h2 className="font-semibold">État de l'indexation</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Recall@K / Precision@K / MRR se mesurent via un run d'évaluation (Sprint 7 du
                backend) plutôt qu'en continu — lancez-en un depuis{" "}
                <a href="/admin" className="text-primary underline">
                  Administration
                </a>{" "}
                (réservé aux administrateurs).
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {(["READY", "PROCESSING", "FAILED"] as const).map((s) => {
                  const badge = documentStatusBadge(s);
                  return (
                    <li key={s} className="flex items-center justify-between">
                      <StatusBadge status={badge.status} label={badge.label} />
                      <span className="font-mono tabular-nums">{docs.filter((d) => d.status === s).length}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ) : null}

        {tab === "Paramètres" ? (
          <section className="panel max-w-2xl p-5">
            <h2 className="font-semibold">Paramètres de la base</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Renommez la base. La configuration de chunking reste gérée côté backend.
            </p>
            <div className="mt-5 grid gap-4">
              <label className="text-sm">
                Nom
                <Input
                  className="mt-2"
                  value={newKbName}
                  onChange={(e) => setNewKbName(e.target.value)}
                  placeholder={kb?.name ?? "Nom de la base"}
                />
              </label>
            </div>
            <div className="mt-6 flex gap-2">
              <Button
                onClick={() => renameMutation.mutate()}
                disabled={renameMutation.isPending || !newKbName.trim() || newKbName === kb?.name}
              >
                {renameMutation.isPending ? <Loader2 className="animate-spin" /> : null}
                Enregistrer
              </Button>
              <Button variant="outline" disabled>
                Réindexer la base
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
