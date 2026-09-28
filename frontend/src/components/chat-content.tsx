import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Layers,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, type ChatCitation, type ChatMessage, type ConversationDetail } from "@/lib/api";
import { cn } from "@/lib/utils";

const SAMPLE_PROMPTS = [
  "Quelles sont les fonctionnalités principales documentées ?",
  "Fais-moi un résumé synthétique des points clés.",
  "Quelles sont les procédures et règles de conformité ?",
  "Compare les différentes approches mentionnées dans les docs.",
];

export function ChatContent() {
  const queryClient = useQueryClient();
  const { data: kbs = [] } = useQuery({ queryKey: ["kbs"], queryFn: api.getKnowledgeBases });
  const [kbId, setKbId] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  // Inspecteur de sources latéral
  const [selectedCitation, setSelectedCitation] = useState<ChatCitation | null>(null);

  // État du streaming et des étapes
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [streamingUserMsg, setStreamingUserMsg] = useState<string | null>(null);
  const [pipelineStep, setPipelineStep] = useState<number>(0);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamingBufferRef = useRef<string>("");

  useEffect(() => {
    if (!kbId && kbs.length > 0) setKbId(kbs[0]?.id || "");
  }, [kbs, kbId]);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", kbId],
    queryFn: () => api.getConversationsForKb(kbId),
    enabled: !!kbId,
  });

  const { data: conversation } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => api.getConversation(conversationId as string),
    enabled: !!conversationId,
  });

  const currentKb = kbs.find((k) => k.id === kbId);

  // Scroll automatique vers le bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamingContent, conversation?.messages]);

  const deleteMutation = useMutation({
    mutationFn: (convId: string) => api.deleteConversation(convId),
    onSuccess: (_data, convId) => {
      if (conversationId === convId) setConversationId(null);
      queryClient.invalidateQueries({ queryKey: ["conversations", kbId] });
      queryClient.removeQueries({ queryKey: ["conversation", convId] });
      toast.success("Conversation supprimée.");
    },
    onError: (error: Error) => toast.error(error.message || "Échec de la suppression."),
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ messageId, rating }: { messageId: string; rating: "up" | "down" }) =>
      api.submitFeedback(messageId, rating),
    onSuccess: (_data, variables) => {
      queryClient.setQueryData<ConversationDetail>(["conversation", conversationId], (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((m) =>
            m.id === variables.messageId ? { ...m, feedback: variables.rating } : m,
          ),
        };
      });
      toast.success(variables.rating === "up" ? "Merci pour ce retour positif !" : "Merci, feedback enregistré.");
    },
    onError: (error: Error) => toast.error(error.message || "Échec de l'envoi du feedback."),
  });

  const handleSend = (textToSend?: string) => {
    const text = (textToSend ?? draft).trim();
    if (!text || isSending || !kbId) return;
    setDraft("");
    setStreamingUserMsg(text);
    setStreamingContent("");
    setIsSending(true);
    setPipelineStep(1);
    streamingBufferRef.current = "";

    // Simuler le passage dynamique des étapes de raisonnement RAG
    const timer1 = setTimeout(() => setPipelineStep(2), 600);
    const timer2 = setTimeout(() => setPipelineStep(3), 1200);

    api.sendChatMessageStream({
      knowledgeBaseId: kbId,
      conversationId: conversationId ?? undefined,
      message: text,
      onChunk: (chunk) => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        setPipelineStep(3);
        streamingBufferRef.current += chunk;
        setStreamingContent((prev) => (prev ?? "") + chunk);
      },
      onDone: (result) => {
        const newConversationId = result.conversationId;
        const accumulated = streamingBufferRef.current;

        queryClient.setQueryData<ConversationDetail>(["conversation", newConversationId], (old) => {
          const userMsg: ChatMessage = { id: `local-u-${Date.now()}`, role: "user", content: text };
          const assistantMsg: ChatMessage = {
            id: result.messageId,
            role: "assistant",
            content: accumulated,
            citations: result.citations,
            notFound: !result.grounded,
          };
          if (old) return { ...old, messages: [...old.messages, userMsg, assistantMsg] };
          return {
            id: newConversationId,
            kbId,
            title: text.slice(0, 80),
            createdAt: new Date().toISOString(),
            messages: [userMsg, assistantMsg],
          };
        });

        setConversationId(newConversationId);
        queryClient.invalidateQueries({ queryKey: ["conversations", kbId] });
        queryClient.invalidateQueries({ queryKey: ["conversation", newConversationId] });
        setStreamingContent(null);
        setStreamingUserMsg(null);
        setIsSending(false);
        setPipelineStep(0);
      },
      onError: (err) => {
        toast.error(err.message || "Échec de l'envoi du message.");
        setStreamingContent(null);
        setStreamingUserMsg(null);
        setIsSending(false);
        setPipelineStep(0);
      },
    });
  };

  const messages: ChatMessage[] = conversation?.messages ?? [];

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] md:grid-cols-[280px_1fr] bg-gradient-to-b from-background to-surface-raised/30">
      {/* Sidebar des conversations */}
      <aside className="border-r border-border/70 p-3.5 bg-card/60 backdrop-blur">
        <div className="mb-3 space-y-1.5">
          <label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase px-1">
            Base de connaissances
          </label>
          <Select
            value={kbId}
            onValueChange={(v) => {
              setKbId(v);
              setConversationId(null);
            }}
          >
            <SelectTrigger className="w-full bg-surface border-border/80 text-xs font-medium">
              <SelectValue placeholder="Choisir une base" />
            </SelectTrigger>
            <SelectContent>
              {kbs.map((kb) => (
                <SelectItem key={kb.id} value={kb.id}>
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-3.5 text-[#AA0033] dark:text-[#959EC9]" />
                    <span>{kb.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="mb-4 w-full bg-[#AA0033] text-white hover:bg-[#880029] shadow-sm transition-all text-xs"
          onClick={() => {
            setConversationId(null);
            setSelectedCitation(null);
          }}
          disabled={!kbId}
        >
          <Plus className="mr-1.5 size-4" />
          Nouvelle conversation
        </Button>

        <div className="flex items-center justify-between px-2 pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Historique</p>
          <span className="text-[10px] text-muted-foreground">{conversations.length}</span>
        </div>

        <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs transition-all",
                conversationId === c.id
                  ? "bg-[#AA0033]/15 text-[#AA0033] font-semibold dark:bg-[#AA0033]/25 dark:text-[#E8EAE7] border border-[#AA0033]/30"
                  : "text-foreground hover:bg-secondary/70",
              )}
            >
              <button
                onClick={() => {
                  setConversationId(c.id);
                  setSelectedCitation(null);
                }}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate">{c.title ?? "Conversation"}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </button>
              <button
                aria-label="Supprimer cette conversation"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMutation.mutate(c.id);
                }}
                disabled={deleteMutation.isPending}
                className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {kbId && conversations.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">Aucune conversation archivée.</p>
          ) : null}
        </div>
      </aside>

      {/* Main Chat Area & Source Inspector Drawer */}
      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageHeader
          title={conversation?.title ?? (currentKb ? `Discussion avec ${currentKb.name}` : "Studio de Conversation RAG")}
          description="Chaque réponse est strictement sourcée, traçable et ancrée dans vos documents avec reranking hybride."
          actions={
            currentKb && (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#AA0033]/10 px-3 py-1 text-xs font-medium text-[#AA0033] dark:bg-[#AA0033]/20 dark:text-[#E8EAE7] border border-[#AA0033]/20">
                  <Layers className="size-3 text-[#AA0033]" />
                  {currentKb.documentCount} documents indexés
                </span>
              </div>
            )
          }
        />

        <div className="flex flex-1 min-h-0">
          {/* Messages stream */}
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.length === 0 && streamingUserMsg === null ? (
                <div className="my-10 flex flex-col items-center justify-center text-center">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#28264B] to-[#1c1a35] text-[#E8EAE7] shadow-lg shadow-[#28264B]/20">
                    <Sparkles className="size-8 text-[#AA0033]" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-[#28264B] dark:text-[#E8EAE7]">
                    Explorez {currentKb?.name || "vos connaissances"}
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
                    Posez vos questions en langage naturel. Le moteur RAG combine recherche vectorielle dense et BM25 avec citations exactes.
                  </p>

                  <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-2">
                    {SAMPLE_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSend(prompt)}
                        className="group flex items-center justify-between rounded-xl border border-border/80 bg-surface/70 p-3.5 text-left text-xs font-medium text-foreground transition-all hover:border-[#AA0033]/60 hover:bg-surface-raised hover:shadow-sm"
                      >
                        <span className="line-clamp-2">{prompt}</span>
                        <ArrowRight className="ml-2 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-[#AA0033]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onSelectCitation={(citation) => setSelectedCitation(citation)}
                  selectedCitation={selectedCitation}
                  onFeedback={
                    m.role === "assistant" ? (rating) => feedbackMutation.mutate({ messageId: m.id, rating }) : undefined
                  }
                />
              ))}

              {/* Streaming state & live pipeline animation */}
              {streamingUserMsg !== null ? (
                <div className="space-y-4">
                  <MessageBubble
                    message={{ id: "pending-user", role: "user", content: streamingUserMsg }}
                  />

                  {/* Reasoning / Processing Steps Card */}
                  <div className="rounded-xl border border-border/80 bg-surface/90 p-4 shadow-sm backdrop-blur space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#28264B] dark:text-[#959EC9]">
                      <Zap className="size-4 animate-pulse text-[#AA0033]" />
                      Pipeline RAG en cours d'exécution
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div
                        className={cn(
                          "flex items-center gap-1.5 rounded-md p-2 transition-all",
                          pipelineStep >= 1
                            ? "bg-[#28264B]/10 text-[#28264B] dark:text-[#E8EAE7] font-medium"
                            : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {pipelineStep === 1 ? (
                          <Loader2 className="size-3 animate-spin text-[#AA0033]" />
                        ) : pipelineStep > 1 ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Search className="size-3" />
                        )}
                        1. Recherche hybride
                      </div>

                      <div
                        className={cn(
                          "flex items-center gap-1.5 rounded-md p-2 transition-all",
                          pipelineStep >= 2
                            ? "bg-[#28264B]/10 text-[#28264B] dark:text-[#E8EAE7] font-medium"
                            : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {pipelineStep === 2 ? (
                          <Loader2 className="size-3 animate-spin text-[#AA0033]" />
                        ) : pipelineStep > 2 ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Layers className="size-3" />
                        )}
                        2. Reranking
                      </div>

                      <div
                        className={cn(
                          "flex items-center gap-1.5 rounded-md p-2 transition-all",
                          pipelineStep >= 3
                            ? "bg-[#28264B]/10 text-[#28264B] dark:text-[#E8EAE7] font-medium"
                            : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {pipelineStep === 3 && !streamingContent ? (
                          <Loader2 className="size-3 animate-spin text-[#AA0033]" />
                        ) : pipelineStep >= 3 ? (
                          <Sparkles className="size-3 text-[#AA0033]" />
                        ) : (
                          <FileText className="size-3" />
                        )}
                        3. Synthèse sourcée
                      </div>
                    </div>

                    {streamingContent && (
                      <div className="pt-2 border-t border-border/60 text-sm leading-relaxed text-foreground">
                        <MarkdownFormatted content={streamingContent} />
                        <span className="ml-1 inline-block size-2 rounded-full animate-ping bg-[#AA0033]" />
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Source Inspector Drawer (Volet latéral) */}
          {selectedCitation && (
            <aside className="w-80 md:w-96 shrink-0 border-l border-border/80 bg-card p-5 shadow-lg flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-[#28264B]/10 text-[#28264B] dark:text-[#959EC9]">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Source Inspecteur
                    </h4>
                    <p className="text-xs font-semibold text-[#28264B] dark:text-[#E8EAE7]">
                      Citation [{selectedCitation.index}]
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:bg-secondary"
                  onClick={() => setSelectedCitation(null)}
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="mt-4 space-y-4 flex-1">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Document d'origine</span>
                  <p className="mt-1 text-sm font-semibold text-[#28264B] dark:text-[#E8EAE7]">
                    {selectedCitation.documentTitle}
                  </p>
                  {selectedCitation.page ? (
                    <span className="mt-1 inline-block rounded bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                      Page {selectedCitation.page}
                    </span>
                  ) : null}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Passage / Chunk extrait
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedCitation.excerpt);
                        toast.success("Extrait copié dans le presse-papier !");
                      }}
                    >
                      <Copy className="mr-1 size-3" />
                      Copier
                    </Button>
                  </div>
                  <div className="rounded-xl border border-[#28264B]/20 bg-[#28264B]/5 p-3.5 text-xs leading-relaxed text-foreground font-mono selection:bg-[#AA0033]/20">
                    {selectedCitation.excerpt}
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-surface-raised p-3 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ShieldCheck className="size-4" />
                    Ancrage vérifié
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Ce passage a été sélectionné et validé par le modèle de reranking pour composer la réponse générée.
                  </p>
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-border/80 bg-card/80 p-4 backdrop-blur">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-border/80 bg-surface p-1.5 shadow-md focus-within:border-[#AA0033] focus-within:ring-2 focus-within:ring-[#AA0033]/20 transition-all"
          >
            <Input
              placeholder="Posez votre question à vos documents…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!kbId || isSending}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm px-3"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!kbId || isSending || !draft.trim()}
              className="size-9 shrink-0 rounded-xl bg-[#AA0033] text-white hover:bg-[#880029] transition-all"
            >
              {isSending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}

/** Formateur Markdown simple avec coloration des blocs de code et citations */
function MarkdownFormatted({ content }: { content: string }) {
  // Découpage simple des blocs de code pour un rendu propre
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3).trim().split("\n");
          const lang = lines[0] || "text";
          const code = lines.slice(1).join("\n") || lines[0];
          return (
            <div key={index} className="my-3 overflow-hidden rounded-xl border border-border bg-[#28264B] text-[#E8EAE7] text-xs">
              <div className="flex items-center justify-between bg-black/30 px-3 py-1.5 text-[11px] font-mono text-muted-foreground">
                <span>{lang}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    toast.success("Code copié !");
                  }}
                  className="flex items-center gap-1 hover:text-white"
                >
                  <Copy className="size-3" /> Copier
                </button>
              </div>
              <pre className="p-3 overflow-x-auto font-mono">{code}</pre>
            </div>
          );
        }

        return (
          <p key={index} className="whitespace-pre-wrap">
            {part}
          </p>
        );
      })}
    </div>
  );
}

function MessageBubble({
  message,
  onSelectCitation,
  selectedCitation,
  onFeedback,
}: {
  message: ChatMessage;
  onSelectCitation?: (citation: ChatCitation) => void;
  selectedCitation?: ChatCitation | null;
  onFeedback?: ((rating: "up" | "down") => void) | undefined;
}) {
  const [copied, setCopied] = useState(false);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-gradient-to-r from-[#28264B] to-[#1c1a35] px-4 py-3 text-sm text-[#E8EAE7] shadow-md">
          {message.content}
        </div>
      </div>
    );
  }

  const notFound = message.notFound ?? !message.citations;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success("Réponse copiée dans le presse-papier !");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-sm transition-all",
        notFound
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-border/80 bg-card hover:border-[#AA0033]/30",
      )}
    >
      {notFound && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-4" />
          Information non trouvée dans les documents de cette base.
        </div>
      )}

      <MarkdownFormatted content={message.content} />

      {/* Citations interactives */}
      {message.citations && message.citations.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/60">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            Sources & Références citées :
          </span>
          <div className="grid gap-2 sm:grid-cols-2">
            {message.citations.map((c) => {
              const isSelected = selectedCitation?.index === c.index;
              return (
                <button
                  key={c.index}
                  type="button"
                  onClick={() => onSelectCitation?.(c)}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl border p-2.5 text-left text-xs transition-all",
                    isSelected
                      ? "border-[#AA0033] bg-[#AA0033]/10 text-foreground ring-1 ring-[#AA0033]"
                      : "border-border/70 bg-surface-raised/60 hover:border-[#AA0033]/50 hover:bg-surface-raised",
                  )}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[#28264B]/10 font-mono text-[10px] font-bold text-[#AA0033] dark:text-[#959EC9]">
                    {c.index}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate text-[#28264B] dark:text-[#E8EAE7]">
                      {c.documentTitle}
                    </p>
                    <p className="line-clamp-1 text-[11px] text-muted-foreground">{c.excerpt}</p>
                  </div>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions footer (Copy & Feedback) */}
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="mr-1 size-3.5 text-emerald-500" /> : <Copy className="mr-1 size-3.5" />}
            {copied ? "Copié" : "Copier"}
          </Button>
        </div>

        {onFeedback ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">Utile ?</span>
            <button
              type="button"
              aria-label="Utile"
              onClick={() => onFeedback("up")}
              className={cn(
                "rounded p-1 transition-colors hover:bg-secondary",
                message.feedback === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
              )}
            >
              <ThumbsUp className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Pas utile"
              onClick={() => onFeedback("down")}
              className={cn(
                "rounded p-1 transition-colors hover:bg-secondary",
                message.feedback === "down" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <ThumbsDown className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

