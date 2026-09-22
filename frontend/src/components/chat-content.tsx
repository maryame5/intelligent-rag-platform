import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Loader2, Plus, Trash2, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, type ChatMessage, type ConversationDetail } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ChatContent() {
  const queryClient = useQueryClient();
  const { data: kbs = [] } = useQuery({ queryKey: ["kbs"], queryFn: api.getKnowledgeBases });
  const [kbId, setKbId] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  // État du streaming : null = inactif, string = contenu accumulé
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [streamingUserMsg, setStreamingUserMsg] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Ref pour accumuler les chunks sans closure stale dans onDone
  const streamingBufferRef = useRef<string>("");

  useEffect(() => {
    if (!kbId && kbs.length > 0) setKbId(kbs[0].id);
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

  // Scroll automatique vers le bas à chaque nouveau token
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
      toast.success(variables.rating === "up" ? "Merci pour ce retour positif." : "Merci, c'est noté.");
    },
    onError: (error: Error) => toast.error(error.message || "Échec de l'envoi du feedback."),
  });

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed || isSending || !kbId) return;
    setDraft("");
    setStreamingUserMsg(trimmed);
    setStreamingContent("");
    setIsSending(true);
    streamingBufferRef.current = "";

    api.sendChatMessageStream({
      knowledgeBaseId: kbId,
      conversationId: conversationId ?? undefined,
      message: trimmed,
      onChunk: (text) => {
        streamingBufferRef.current += text;
        setStreamingContent((prev) => (prev ?? "") + text);
      },
      onDone: (result) => {
        const newConversationId = result.conversationId;
        const accumulated = streamingBufferRef.current;

        // Mettre à jour le cache QueryClient avec les vrais messages
        queryClient.setQueryData<ConversationDetail>(["conversation", newConversationId], (old) => {
          const userMsg: ChatMessage = { id: `local-u-${Date.now()}`, role: "user", content: trimmed };
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
            title: trimmed.slice(0, 80),
            createdAt: new Date().toISOString(),
            messages: [userMsg, assistantMsg],
          };
        });

        setConversationId(newConversationId);
        queryClient.invalidateQueries({ queryKey: ["conversations", kbId] });
        // Invalider pour récupérer le vrai message depuis le serveur (avec citations complètes)
        queryClient.invalidateQueries({ queryKey: ["conversation", newConversationId] });
        setStreamingContent(null);
        setStreamingUserMsg(null);
        setIsSending(false);
      },
      onError: (err) => {
        toast.error(err.message || "Échec de l'envoi du message.");
        setStreamingContent(null);
        setStreamingUserMsg(null);
        setIsSending(false);
      },
    });
  };

  const messages: ChatMessage[] = conversation?.messages ?? [];

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] md:grid-cols-[280px_1fr]">
      <aside className="border-r p-3">
        <div className="mb-3">
          <Select
            value={kbId}
            onValueChange={(v) => {
              setKbId(v);
              setConversationId(null);
            }}
          >
            <SelectTrigger>
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
        <Button className="mb-4 w-full" onClick={() => setConversationId(null)} disabled={!kbId}>
          <Plus />
          Nouvelle conversation
        </Button>
        <p className="px-2 pb-2 text-xs font-semibold uppercase text-muted-foreground">Récentes</p>
        {conversations.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group mb-1 flex items-center gap-1 rounded-md hover:bg-secondary",
              conversationId === c.id ? "bg-secondary" : "bg-transparent",
            )}
          >
            <button
              onClick={() => setConversationId(c.id)}
              className="min-w-0 flex-1 p-3 text-left text-sm"
            >
              <span className="block truncate font-medium">{c.title ?? "Conversation"}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(c.createdAt).toLocaleDateString("fr-FR")}
              </span>
            </button>
            <button
              aria-label="Supprimer cette conversation"
              onClick={(e) => {
                e.stopPropagation();
                deleteMutation.mutate(c.id);
              }}
              disabled={deleteMutation.isPending}
              className="mr-1.5 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {kbId && conversations.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">Aucune conversation pour cette base.</p>
        ) : null}
      </aside>

      <section className="flex min-w-0 flex-col">
        <PageHeader
          title={conversation?.title ?? "Nouvelle conversation"}
          description="Réponses ancrées dans les sources autorisées, avec citations."
        />
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 md:p-8">
          {kbs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Créez d'abord une knowledge base pour pouvoir discuter avec vos documents.
            </p>
          ) : null}

          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onFeedback={
                m.role === "assistant" ? (rating) => feedbackMutation.mutate({ messageId: m.id, rating }) : undefined
              }
            />
          ))}

          {/* Bulle en cours de streaming */}
          {streamingUserMsg !== null ? (
            <>
              <MessageBubble message={{ id: "pending-user", role: "user", content: streamingUserMsg }} />
              {streamingContent !== null ? (
                <StreamingBubble content={streamingContent} />
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Recherche dans les documents…
                </div>
              )}
            </>
          ) : null}

          <div ref={bottomRef} />

          <div className="mt-auto flex gap-2 border-t pt-4">
            <Input
              placeholder="Posez une question à vos documents…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) handleSend();
              }}
              disabled={!kbId || isSending}
            />
            <Button aria-label="Envoyer" onClick={handleSend} disabled={!kbId || isSending}>
              {isSending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Bulle animée pendant le streaming — affiche les tokens au fur et à mesure. */
function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="max-w-[92%] border-l-2 border-primary bg-surface p-4 text-sm leading-6">
      <p>
        {content}
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />
      </p>
    </div>
  );
}

function MessageBubble({
  message,
  onFeedback,
}: {
  message: ChatMessage;
  onFeedback?: (rating: "up" | "down") => void;
}) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[80%] rounded-md bg-primary px-4 py-3 text-sm text-primary-foreground">
        {message.content}
      </div>
    );
  }

  const notFound = message.notFound ?? !message.citations;

  return (
    <div
      className={cn(
        "max-w-[92%] border-l-2 p-4 text-sm leading-6",
        notFound ? "border-warning bg-warning/5" : "border-primary bg-surface",
      )}
    >
      {notFound ? (
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-warning">
          <AlertTriangle className="size-3.5" />
          Information non trouvée dans les documents de cette base
        </div>
      ) : null}
      <p>{message.content}</p>
      {message.citations?.map((c) => (
        <div key={c.index} className="mt-3 rounded-md border bg-surface-raised p-3 text-xs">
          <strong>
            [{c.index}] {c.documentTitle}
            {c.page ? `, p. ${c.page}` : ""}
          </strong>
          <p className="mt-1 text-muted-foreground">{c.excerpt}</p>
        </div>
      ))}
      {onFeedback ? (
        <div className="mt-3 flex items-center gap-1 border-t pt-2">
          <span className="mr-1 text-xs text-muted-foreground">Cette réponse était utile ?</span>
          <button
            type="button"
            aria-label="Utile"
            onClick={() => onFeedback("up")}
            className={cn(
              "rounded p-1 transition-colors hover:bg-secondary",
              message.feedback === "up" ? "text-success" : "text-muted-foreground",
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
  );
}
