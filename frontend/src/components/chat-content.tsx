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
  PanelLeftClose,
  PanelLeftOpen,
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
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type ChatCitation, type ChatMessage, type ConversationDetail } from "@/lib/api";
import { cn } from "@/lib/utils";

const SAMPLE_PROMPTS = [
  "Quelles sont les procédures et règles décrites dans ces documents ?",
  "Fais-moi un résumé synthétique des points clés.",
  "Quelles sont les responsabilités et actions mentionnées ?",
  "Compare les différentes sections et données chiffrées.",
];

export function ChatContent() {
  const queryClient = useQueryClient();
  const { data: kbs = [] } = useQuery({ queryKey: ["kbs"], queryFn: api.getKnowledgeBases });
  const [kbId, setKbId] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  // Contrôle de visibilité de l'historique latéral
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Inspecteur de source (volet tiroir non bloquant ou modal)
  const [selectedCitation, setSelectedCitation] = useState<ChatCitation | null>(null);

  // État du streaming et des étapes RAG
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [streamingUserMsg, setStreamingUserMsg] = useState<string | null>(null);
  const [pipelineStep, setPipelineStep] = useState<number>(0);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamingBufferRef = useRef<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Scroll automatique fluide vers le bas
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
      toast.success(
        variables.rating === "up"
          ? "Merci pour ce retour positif !"
          : "Merci, feedback enregistré.",
      );
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

    const timer1 = setTimeout(() => setPipelineStep(2), 500);
    const timer2 = setTimeout(() => setPipelineStep(3), 1000);

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
    <div className="relative flex h-[calc(100vh-3.5rem)] overflow-hidden bg-[#fafbfa] text-[#28264B]">
      {/* ───── 1. Collapsible Sidebar (Historique & Sélection de Base) ───── */}
      <aside
        className={cn(
          "h-full border-r border-[#dcdfd9] bg-white transition-all duration-300 ease-in-out flex flex-col z-20 shrink-0",
          sidebarOpen
            ? "w-72 shadow-sm"
            : "w-0 -translate-x-full md:translate-x-0 md:w-0 overflow-hidden border-r-0",
        )}
      >
        {sidebarOpen && (
          <div className="flex flex-col h-full p-3.5 w-72">
            {/* Header Sidebar */}
            <div className="flex items-center justify-between pb-3 border-b border-[#dcdfd9]">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-[#28264B] text-white">
                  <BookOpen className="size-3.5 text-[#959EC9]" />
                </div>
                <span className="font-extrabold text-sm text-[#28264B]">Espace Chat</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="size-8 text-[#4E5174] hover:bg-[#E8EAE7] rounded-lg"
                title="Masquer l'historique"
              >
                <PanelLeftClose className="size-4" />
              </Button>
            </div>

            {/* Base de connaissances selector */}
            <div className="my-3 space-y-1">
              <label className="text-[10px] font-bold tracking-wider text-[#4E5174] uppercase px-1">
                Base active
              </label>
              <Select
                value={kbId}
                onValueChange={(v) => {
                  setKbId(v);
                  setConversationId(null);
                }}
              >
                <SelectTrigger className="w-full bg-[#fafbfa] border-[#dcdfd9] text-xs font-semibold text-[#28264B] focus:ring-[#AA0033]">
                  <SelectValue placeholder="Choisir une base" />
                </SelectTrigger>
                <SelectContent>
                  {kbs.map((kb) => (
                    <SelectItem key={kb.id} value={kb.id}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="size-3.5 text-[#AA0033]" />
                        <span className="truncate">{kb.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bouton Nouvelle conversation */}
            <Button
              className="mb-4 w-full bg-[#AA0033] text-white hover:bg-[#880029] shadow-xs transition-all text-xs font-bold h-9"
              onClick={() => {
                setConversationId(null);
                setSelectedCitation(null);
                inputRef.current?.focus();
              }}
              disabled={!kbId}
            >
              <Plus className="mr-1.5 size-4" />
              Nouvelle discussion
            </Button>

            {/* Liste historique */}
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4E5174]">
                Historique ({conversations.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {conversations.map((c) => {
                const isActive = conversationId === c.id;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "group flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs transition-all cursor-pointer",
                      isActive
                        ? "bg-[#28264B] text-white font-semibold shadow-xs"
                        : "text-[#4E5174] hover:bg-[#E8EAE7]/70 hover:text-[#28264B]",
                    )}
                    onClick={() => {
                      setConversationId(c.id);
                      setSelectedCitation(null);
                    }}
                  >
                    <MessageSquare
                      className={cn(
                        "size-3.5 shrink-0",
                        isActive ? "text-[#959EC9]" : "text-[#4E5174]",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-xs">
                        {c.title ?? "Nouvelle discussion"}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] block",
                          isActive ? "text-white/60" : "text-[#4E5174]/70",
                        )}
                      >
                        {new Date(c.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <button
                      aria-label="Supprimer"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(c.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className={cn(
                        "rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400",
                        isActive ? "text-white/70" : "text-[#4E5174]",
                      )}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })}

              {kbId && conversations.length === 0 && (
                <div className="p-4 text-center text-xs text-[#4E5174]">
                  Aucune conversation archivée.
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ───── 2. Main Chat Area (Full Width & Spacious) ───── */}
      <main className="relative flex flex-1 flex-col h-full min-w-0 overflow-hidden bg-[#fafbfa]">
        {/* Top Control Bar */}
        <header className="h-14 shrink-0 border-b border-[#dcdfd9] bg-white/90 backdrop-blur-md px-4 flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {!sidebarOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="h-8 gap-1.5 px-2.5 text-xs font-semibold text-[#28264B] border-[#dcdfd9] hover:bg-[#E8EAE7]"
                title="Afficher l'historique"
              >
                <PanelLeftOpen className="size-4 text-[#AA0033]" />
                <span className="hidden sm:inline">Historique</span>
              </Button>
            )}

            <div className="flex items-center gap-2 truncate">
              <span className="font-extrabold text-sm text-[#28264B] truncate">
                {conversation?.title ?? (currentKb ? `${currentKb.name}` : "Discussion RAG")}
              </span>
              {currentKb && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E8EAE7] px-2.5 py-0.5 text-[11px] font-semibold text-[#28264B] border border-[#dcdfd9]">
                  <Layers className="size-3 text-[#AA0033]" />
                  {currentKb.documentCount} docs
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden md:inline-flex items-center gap-1 text-xs text-[#4E5174] font-medium">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              Recherche Hybride BM25 + pgvector
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConversationId(null);
                setSelectedCitation(null);
                inputRef.current?.focus();
              }}
              className="h-8 text-xs font-bold text-[#AA0033] border-[#AA0033]/30 hover:bg-[#AA0033]/10"
            >
              <Plus className="size-3.5 mr-1" />
              Nouveau
            </Button>
          </div>
        </header>

        {/* Scrollable Message Feed */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-4xl space-y-6">
            {messages.length === 0 && streamingUserMsg === null ? (
              <div className="my-12 flex flex-col items-center justify-center text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#28264B] to-[#1c1a35] text-white shadow-lg">
                  <Sparkles className="size-8 text-[#AA0033]" />
                </div>
                <h3 className="mt-5 text-2xl font-extrabold text-[#28264B]">
                  Interrogez {currentKb?.name || "vos documents"}
                </h3>
                <p className="mt-2 max-w-lg text-sm text-[#4E5174] leading-relaxed">
                  Posez vos questions en langage naturel. Le moteur extrait les passages pertinents,
                  réordonne par pertinence et formule une réponse avec citations exactes.
                </p>

                <div className="mt-8 grid w-full gap-3 sm:grid-cols-2 text-left">
                  {SAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      className="group flex items-center justify-between rounded-xl border border-[#dcdfd9] bg-white p-4 text-xs font-semibold text-[#28264B] transition-all hover:border-[#AA0033] hover:shadow-sm"
                    >
                      <span className="line-clamp-2">{prompt}</span>
                      <ArrowRight className="ml-2 size-4 shrink-0 text-[#959EC9] transition-transform group-hover:translate-x-1 group-hover:text-[#AA0033]" />
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
                  m.role === "assistant"
                    ? (rating) => feedbackMutation.mutate({ messageId: m.id, rating })
                    : undefined
                }
              />
            ))}

            {/* Live Pipeline Animation during Generation */}
            {streamingUserMsg !== null ? (
              <div className="space-y-4">
                <MessageBubble
                  message={{ id: "pending-user", role: "user", content: streamingUserMsg }}
                />

                <div className="rounded-xl border border-[#dcdfd9] bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#28264B]">
                    <Zap className="size-4 animate-pulse text-[#AA0033]" />
                    Traitement RAG en direct
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg p-2 transition-all",
                        pipelineStep >= 1
                          ? "bg-[#28264B]/10 text-[#28264B] font-semibold"
                          : "bg-[#E8EAE7] text-[#4E5174]",
                      )}
                    >
                      {pipelineStep === 1 ? (
                        <Loader2 className="size-3 animate-spin text-[#AA0033]" />
                      ) : pipelineStep > 1 ? (
                        <Check className="size-3 text-emerald-600" />
                      ) : (
                        <Search className="size-3" />
                      )}
                      1. Recherche hybride
                    </div>

                    <div
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg p-2 transition-all",
                        pipelineStep >= 2
                          ? "bg-[#28264B]/10 text-[#28264B] font-semibold"
                          : "bg-[#E8EAE7] text-[#4E5174]",
                      )}
                    >
                      {pipelineStep === 2 ? (
                        <Loader2 className="size-3 animate-spin text-[#AA0033]" />
                      ) : pipelineStep > 2 ? (
                        <Check className="size-3 text-emerald-600" />
                      ) : (
                        <Layers className="size-3" />
                      )}
                      2. Re-ranking
                    </div>

                    <div
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg p-2 transition-all",
                        pipelineStep >= 3
                          ? "bg-[#28264B]/10 text-[#28264B] font-semibold"
                          : "bg-[#E8EAE7] text-[#4E5174]",
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
                    <div className="pt-3 border-t border-[#dcdfd9] text-sm leading-relaxed text-[#28264B]">
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

        {/* Sticky Input Bar at Bottom */}
        <div className="border-t border-[#dcdfd9] bg-white/95 p-4 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="mx-auto flex max-w-4xl items-center gap-2 rounded-xl border border-[#dcdfd9] bg-[#fafbfa] p-1.5 shadow-sm focus-within:border-[#AA0033] focus-within:ring-2 focus-within:ring-[#AA0033]/20 transition-all"
          >
            <Input
              ref={inputRef}
              placeholder={
                currentKb
                  ? `Interroger « ${currentKb.name} »…`
                  : "Posez une question sur vos documents…"
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!kbId || isSending}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm px-3 text-[#28264B] placeholder:text-[#4E5174]/60"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!kbId || isSending || !draft.trim()}
              className="size-9 shrink-0 rounded-lg bg-[#AA0033] text-white hover:bg-[#880029] transition-all cursor-pointer"
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
            </Button>
          </form>
        </div>
      </main>

      {/* ───── 3. Non-Intrusive Floating Source Inspector Modal / Slide-Over ───── */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl border-l border-[#dcdfd9] flex flex-col animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#dcdfd9] flex items-center justify-between bg-[#fafbfa]">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#28264B] text-white font-bold text-xs">
                  {selectedCitation.index}
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#AA0033]">
                    Source Citée #{selectedCitation.index}
                  </h4>
                  <p className="text-xs font-extrabold text-[#28264B] truncate max-w-[260px]">
                    {selectedCitation.documentTitle}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-[#4E5174] hover:bg-[#E8EAE7] rounded-lg"
                onClick={() => setSelectedCitation(null)}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Drawer Content */}
            <div className="p-5 space-y-5 flex-1 overflow-y-auto">
              {/* Document details */}
              <div className="rounded-xl border border-[#dcdfd9] bg-[#fafbfa] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#4E5174]">Document source</span>
                  {selectedCitation.page && (
                    <span className="rounded bg-[#E8EAE7] px-2 py-0.5 text-[11px] font-bold text-[#28264B]">
                      Page {selectedCitation.page}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-[#28264B] flex items-center gap-1.5">
                  <FileText className="size-4 text-[#AA0033]" />
                  {selectedCitation.documentTitle}
                </p>
              </div>

              {/* Chunk Excerpt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#28264B] uppercase tracking-wider">
                    Extrait textuel brut (Chunk) :
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs text-[#28264B] border-[#dcdfd9] hover:bg-[#E8EAE7]"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedCitation.excerpt);
                      toast.success("Extrait copié dans le presse-papier !");
                    }}
                  >
                    <Copy className="mr-1 size-3" />
                    Copier
                  </Button>
                </div>
                <div className="rounded-xl border border-[#AA0033]/20 bg-[#fafbfa] p-4 text-xs font-mono text-[#28264B] leading-relaxed border-l-4 border-l-[#AA0033] shadow-2xs">
                  {selectedCitation.excerpt}
                </div>
              </div>

              {/* Grounding guarantee badge */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  Passage vérifié par le pipeline
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Ce passage a obtenu un score de similarité élevé lors de la fusion RRF et a été
                  validé par le Cross-Encoder pour composer la réponse.
                </p>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#dcdfd9] bg-[#fafbfa] flex justify-end">
              <Button
                onClick={() => setSelectedCitation(null)}
                className="bg-[#28264B] text-white hover:bg-[#34325a] text-xs font-bold"
              >
                Fermer l'aperçu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Formateur Markdown simple et élégant */
function MarkdownFormatted({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-[#28264B]">
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3).trim().split("\n");
          const lang = lines[0] || "text";
          const code = lines.slice(1).join("\n") || lines[0];
          return (
            <div
              key={index}
              className="my-3 overflow-hidden rounded-xl border border-[#4E5174] bg-[#28264B] text-[#E8EAE7] text-xs shadow-md"
            >
              <div className="flex items-center justify-between bg-black/40 px-3.5 py-1.5 text-[11px] font-mono text-[#959EC9]">
                <span>{lang}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    toast.success("Code copié !");
                  }}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <Copy className="size-3" /> Copier
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto font-mono">{code}</pre>
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
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-[#28264B] px-5 py-3.5 text-sm font-medium text-white shadow-md">
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
        "rounded-2xl border p-5 shadow-xs transition-all bg-white",
        notFound ? "border-amber-300 bg-amber-50/20" : "border-[#dcdfd9] hover:border-[#959EC9]",
      )}
    >
      {/* Bot Icon & Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#dcdfd9]/60">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-[#28264B] text-white">
            <Sparkles className="size-3.5 text-[#AA0033]" />
          </div>
          <span className="font-extrabold text-xs text-[#28264B]">SmartRAG Assistant</span>
        </div>

        {notFound && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
            <AlertTriangle className="size-3" /> Hors contexte
          </span>
        )}
      </div>

      {notFound && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs font-semibold text-amber-900">
          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
          Information non trouvée de manière certaine dans les documents de cette base.
        </div>
      )}

      <MarkdownFormatted content={message.content} />

      {/* Citations / Sources sous forme de badges compacts et cliquables */}
      {message.citations && message.citations.length > 0 && (
        <div className="mt-5 pt-3.5 border-t border-[#dcdfd9]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#4E5174] uppercase tracking-wider">
              Sources & Références citées :
            </span>
            <span className="text-[10px] text-[#4E5174]/70">Cliquez pour voir l'extrait</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {message.citations.map((c) => {
              const isSelected = selectedCitation?.index === c.index;
              return (
                <button
                  key={c.index}
                  type="button"
                  onClick={() => onSelectCitation?.(c)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all cursor-pointer",
                    isSelected
                      ? "border-[#AA0033] bg-[#AA0033] text-white font-bold shadow-xs"
                      : "border-[#dcdfd9] bg-[#fafbfa] text-[#28264B] hover:border-[#AA0033] hover:bg-[#E8EAE7]/50 font-medium",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4.5 items-center justify-center rounded-full text-[10px] font-bold",
                      isSelected ? "bg-white text-[#AA0033]" : "bg-[#28264B] text-white",
                    )}
                  >
                    {c.index}
                  </span>
                  <span className="truncate max-w-[180px] sm:max-w-[240px]">{c.documentTitle}</span>
                  {c.page && <span className="opacity-70 text-[10px]">p.{c.page}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer bar avec Copier et Feedback */}
      <div className="mt-4 flex items-center justify-between border-t border-[#dcdfd9]/60 pt-2.5 text-xs text-[#4E5174]">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs text-[#4E5174] hover:text-[#28264B] hover:bg-[#E8EAE7]"
        >
          {copied ? (
            <Check className="mr-1 size-3.5 text-emerald-600" />
          ) : (
            <Copy className="mr-1 size-3.5" />
          )}
          {copied ? "Copié !" : "Copier"}
        </Button>

        {onFeedback ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium">Pertinent ?</span>
            <button
              type="button"
              aria-label="Utile"
              onClick={() => onFeedback("up")}
              className={cn(
                "rounded p-1 transition-colors hover:bg-[#E8EAE7]",
                message.feedback === "up" ? "text-emerald-600 font-bold" : "text-[#4E5174]",
              )}
            >
              <ThumbsUp className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Pas utile"
              onClick={() => onFeedback("down")}
              className={cn(
                "rounded p-1 transition-colors hover:bg-[#E8EAE7]",
                message.feedback === "down" ? "text-red-600 font-bold" : "text-[#4E5174]",
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
