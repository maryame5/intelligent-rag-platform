/**
 * Data-access layer.
 *
 * Screens never import mock fixtures directly — they call these functions.
 *
 * État de l'intégration (voir docs/sprints/ côté backend pour le détail des
 * endpoints) :
 *  - RÉEL, backé par le FastAPI de http://localhost:8000 : auth (lib/auth.tsx),
 *    knowledge bases (CRUD + renommage), documents, jobs, recherche
 *    (vector/hybrid/rerank), chat (bloquant + streaming SSE), conversations
 *    (list/get/delete), feedback, profil utilisateur, admin (métriques +
 *    feedback négatif + évaluations).
 *  - ENCORE MOCKÉ (pas d'endpoint backend prévu à ce jour) : workspace/membres
 *    d'équipe, collections, réponses vérifiées, activité, intégrations,
 *    notifications, clés API, logs d'audit, séries d'usage/qualité RAG
 *    historiques. Ces fonctions restent volontairement inchangées et
 *    continuent de lire `mock-data.ts` — l'UI qui les consomme porte un badge
 *    "Aperçu" (voir `components/preview-badge.tsx`) pour ne jamais laisser
 *    penser que ces données sont réelles.
 */
import * as mock from "./mock-data";
import { apiRequest, getAccessToken, API_BASE_URL } from "./backend-client";

const delay = <T,>(value: T, ms = 220): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/** Cursor-style pagination helper used by every long list. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}

// ============================================================================
// Knowledge Bases — RÉEL
// ============================================================================

export interface KnowledgeBase {
  id: string;
  name: string;
  createdAt: string;
  /** Rempli séparément (l'API de liste ne renvoie pas le compte) — voir
   * `getKnowledgeBases()`, qui fait un appel par base. Acceptable au volume
   * actuel (quelques dizaines de KB par utilisateur), à revoir si ça scale. */
  documentCount: number;
}

interface BackendKnowledgeBase {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

async function fetchDocumentCount(kbId: string): Promise<number> {
  try {
    const docs = await apiRequest<unknown[]>(`/knowledge-bases/${kbId}/documents?limit=200`);
    return docs.length;
  } catch {
    return 0;
  }
}

function toKnowledgeBase(raw: BackendKnowledgeBase, documentCount = 0): KnowledgeBase {
  return { id: raw.id, name: raw.name, createdAt: raw.created_at, documentCount };
}

export async function getKnowledgeBases(): Promise<KnowledgeBase[]> {
  const list = await apiRequest<BackendKnowledgeBase[]>("/knowledge-bases");
  return Promise.all(
    list.map(async (kb) => toKnowledgeBase(kb, await fetchDocumentCount(kb.id))),
  );
}

export async function getKnowledgeBase(id: string): Promise<KnowledgeBase | null> {
  try {
    const raw = await apiRequest<BackendKnowledgeBase>(`/knowledge-bases/${id}`);
    return toKnowledgeBase(raw, await fetchDocumentCount(id));
  } catch {
    return null;
  }
}

export async function createKnowledgeBase(name: string): Promise<KnowledgeBase> {
  const raw = await apiRequest<BackendKnowledgeBase>("/knowledge-bases", {
    method: "POST",
    body: { name },
  });
  return toKnowledgeBase(raw, 0);
}

export async function deleteKnowledgeBase(kbId: string): Promise<void> {
  await apiRequest(`/knowledge-bases/${kbId}`, { method: "DELETE" });
}

export async function renameKnowledgeBase(kbId: string, name: string): Promise<KnowledgeBase> {
  const raw = await apiRequest<BackendKnowledgeBase>(`/knowledge-bases/${kbId}`, {
    method: "PATCH",
    body: { name },
  });
  return toKnowledgeBase(raw, await fetchDocumentCount(kbId));
}

// ============================================================================
// Documents — RÉEL
// ============================================================================

export type DocStatus = "PROCESSING" | "READY" | "FAILED";

export interface DocumentItem {
  id: string;
  kbId: string;
  title: string;
  mimeType: string;
  sizeBytes: number;
  status: DocStatus;
  createdAt: string;
}

interface BackendDocument {
  id: string;
  knowledge_base_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  status: DocStatus;
  created_at: string;
}

function toDocumentItem(raw: BackendDocument): DocumentItem {
  return {
    id: raw.id,
    kbId: raw.knowledge_base_id,
    title: raw.filename,
    mimeType: raw.mime_type,
    sizeBytes: raw.size_bytes,
    status: raw.status,
    createdAt: raw.created_at,
  };
}

/** Étiquette courte dérivée du MIME type (PDF/DOCX/MD/HTML/TXT), pour l'affichage. */
export function documentTypeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "PDF",
    "text/plain": "TXT",
    "text/markdown": "MD",
    "text/html": "HTML",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  };
  return map[mimeType] ?? mimeType.split("/").pop()?.toUpperCase() ?? "?";
}

/** Statut backend (PROCESSING/READY/FAILED) -> clé attendue par <StatusBadge>. */
export function documentStatusBadge(status: DocStatus): { status: string; label: string } {
  const map: Record<DocStatus, { status: string; label: string }> = {
    READY: { status: "indexed", label: "Indexé" },
    PROCESSING: { status: "processing", label: "Traitement" },
    FAILED: { status: "failed", label: "Échec" },
  };
  return map[status];
}

export async function getDocuments(kbId: string, limit = 100, offset = 0): Promise<DocumentItem[]> {
  const raw = await apiRequest<BackendDocument[]>(
    `/knowledge-bases/${kbId}/documents?limit=${limit}&offset=${offset}`,
  );
  return raw.map(toDocumentItem);
}

export interface UploadResult {
  document: DocumentItem;
  jobId: string;
}

export async function uploadDocument(kbId: string, file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  const raw = await apiRequest<{ document: BackendDocument; job_id: string }>(
    `/knowledge-bases/${kbId}/documents`,
    { method: "POST", body: formData },
  );
  return { document: toDocumentItem(raw.document), jobId: raw.job_id };
}

export async function deleteDocument(documentId: string): Promise<void> {
  await apiRequest(`/documents/${documentId}`, { method: "DELETE" });
}

export async function getDocument(documentId: string): Promise<DocumentItem> {
  const raw = await apiRequest<BackendDocument>(`/documents/${documentId}`);
  return toDocumentItem(raw);
}

// ============================================================================
// Jobs d'ingestion — RÉEL
// ============================================================================

export type BackendJobStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

export interface IngestionJobStatus {
  id: string;
  documentId: string;
  status: BackendJobStatus;
  errorMessage: string | null;
}

export async function getJob(jobId: string): Promise<IngestionJobStatus> {
  const raw = await apiRequest<{
    id: string;
    document_id: string;
    status: BackendJobStatus;
    error_message: string | null;
  }>(`/jobs/${jobId}`);
  return { id: raw.id, documentId: raw.document_id, status: raw.status, errorMessage: raw.error_message };
}

/**
 * Interroge GET /jobs/{id} jusqu'à SUCCESS/FAILED (ou expiration). Utilisé
 * juste après un upload pour afficher la progression sans que l'utilisateur
 * ait à rafraîchir la page manuellement.
 */
export async function pollJobUntilDone(
  jobId: string,
  { intervalMs = 1500, timeoutMs = 60_000 }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<IngestionJobStatus> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = await getJob(jobId);
    if (job.status === "SUCCESS" || job.status === "FAILED") return job;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Le traitement du document prend plus de temps que prévu.");
}

// ============================================================================
// Recherche (vector/hybrid/rerank) — RÉEL
// ============================================================================

export interface SearchResult {
  chunkId: string;
  documentId: string;
  documentFilename: string;
  page: number | null;
  content: string;
  score: number;
  rank: number;
}

export interface SearchOptions {
  topK?: number;
  mode?: "vector" | "hybrid";
  rerank?: boolean;
  documentId?: string;
}

export async function searchKnowledgeBase(
  kbId: string,
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const raw = await apiRequest<
    Array<{
      chunk_id: string;
      document_id: string;
      document_filename: string;
      page: number | null;
      content: string;
      score: number;
      rank: number;
    }>
  >(`/knowledge-bases/${kbId}/search`, {
    method: "POST",
    body: {
      query,
      top_k: options.topK ?? 5,
      mode: options.mode ?? "vector",
      rerank: options.rerank ?? false,
      document_id: options.documentId,
    },
  });
  return raw.map((r) => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    documentFilename: r.document_filename,
    page: r.page,
    content: r.content,
    score: r.score,
    rank: r.rank,
  }));
}

/**
 * Lance la même question sur les 3 configurations (vector / hybrid / hybrid+
 * rerank) en parallèle — reproduit le comparatif du Sprint 5 avec de vraies
 * données plutôt que les valeurs figées de `mock.comparisonModes`.
 */
export async function compareRetrievalModes(kbId: string, query: string) {
  const [vectorOnly, hybrid, hybridRerank] = await Promise.all([
    searchKnowledgeBase(kbId, query, { mode: "vector", topK: 3 }),
    searchKnowledgeBase(kbId, query, { mode: "hybrid", topK: 3 }),
    searchKnowledgeBase(kbId, query, { mode: "hybrid", rerank: true, topK: 3 }),
  ]);
  return [
    { mode: "Vector-only", results: vectorOnly },
    { mode: "Hybride", results: hybrid },
    { mode: "Hybride + reranker", results: hybridRerank },
  ];
}

// ============================================================================
// Chat & conversations — RÉEL
// ============================================================================

export interface Citation {
  index: number;
  documentTitle: string;
  page: number | null;
  excerpt: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  notFound?: boolean | undefined;
  citations?: Citation[] | undefined;
  feedback?: "up" | "down" | null | undefined;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  createdAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  kbId: string;
  messages: ChatMessage[];
}

interface BackendCitation {
  chunk_id: string;
  document_id: string;
  document_filename: string;
  page: number | null;
  score: number;
  excerpt: string;
}

function toCitations(raw: BackendCitation[] | null | undefined): Citation[] | undefined {
  if (!raw || raw.length === 0) return undefined;
  return raw.map((c, i) => ({
    index: i + 1,
    documentTitle: c.document_filename,
    page: c.page,
    excerpt: c.excerpt,
    score: c.score,
  }));
}

export async function getConversationsForKb(kbId: string, limit = 50): Promise<ConversationSummary[]> {
  const raw = await apiRequest<Array<{ id: string; title: string | null; created_at: string }>>(
    `/knowledge-bases/${kbId}/conversations?limit=${limit}`,
  );
  return raw.map((c) => ({ id: c.id, title: c.title, createdAt: c.created_at }));
}

export async function getConversation(conversationId: string): Promise<ConversationDetail> {
  const raw = await apiRequest<{
    id: string;
    knowledge_base_id: string;
    title: string | null;
    created_at: string;
    messages: Array<{
      id: string;
      role: "USER" | "ASSISTANT";
      content: string;
      citations: BackendCitation[] | null;
      created_at: string;
      feedback: "up" | "down" | null;
    }>;
  }>(`/conversations/${conversationId}`);

  return {
    id: raw.id,
    kbId: raw.knowledge_base_id,
    title: raw.title,
    createdAt: raw.created_at,
    messages: raw.messages.map((m) => ({
      id: m.id,
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
      citations: toCitations(m.citations),
      feedback: m.feedback,
    })),
  };
}

export async function submitFeedback(
  messageId: string,
  rating: "up" | "down",
  comment?: string,
): Promise<void> {
  await apiRequest(`/messages/${messageId}/feedback`, {
    method: "POST",
    body: { rating, comment },
  });
}

export async function deleteFeedback(messageId: string): Promise<void> {
  await apiRequest(`/messages/${messageId}/feedback`, { method: "DELETE" });
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await apiRequest(`/conversations/${conversationId}`, { method: "DELETE" });
}

export interface SendMessageResult {
  conversationId: string;
  messageId: string;
  answer: string;
  grounded: boolean;
  citations?: Citation[] | undefined;
}

export async function sendChatMessage(params: {
  knowledgeBaseId: string;
  conversationId?: string | undefined;
  message: string;
}): Promise<SendMessageResult> {
  const raw = await apiRequest<{
    conversation_id: string;
    message_id: string;
    answer: string;
    citations: BackendCitation[];
    grounded: boolean;
  }>("/chat", {
    method: "POST",
    body: {
      knowledge_base_id: params.knowledgeBaseId,
      conversation_id: params.conversationId,
      message: params.message,
    },
  });
  return {
    conversationId: raw.conversation_id,
    messageId: raw.message_id,
    answer: raw.answer,
    grounded: raw.grounded,
    citations: toCitations(raw.citations),
  };
}

type ChatStreamEvent =
  | { type: "answer_chunk"; content: string }
  | {
      type: "done";
      conversation_id: string;
      message_id?: string;
      grounded: boolean;
      citations?: BackendCitation[];
    }
  | { type: "error"; message: string };

/**
 * Variante streaming de sendChatMessage : consomme le SSE de /chat/stream.
 * Appelle `onChunk` pour chaque token, puis `onDone` avec le résultat final
 * (conversation_id, message_id, grounded, citations).
 * En cas d'erreur serveur ou réseau, appelle `onError`.
 */
export async function sendChatMessageStream(params: {
  knowledgeBaseId: string;
  conversationId?: string | undefined;
  message: string;
  onChunk: (text: string) => void;
  onDone: (result: SendMessageResult) => void;
  onError: (err: Error) => void;
}): Promise<void> {
  const token = getAccessToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        knowledge_base_id: params.knowledgeBaseId,
        conversation_id: params.conversationId ?? null,
        message: params.message,
      }),
    });
  } catch (err) {
    params.onError(err instanceof Error ? err : new Error(String(err)));
    return;
  }

  if (!response.ok) {
    params.onError(new Error(`Erreur ${response.status} du serveur.`));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    params.onError(new Error("Flux SSE non disponible."));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let evt: ChatStreamEvent;
      try {
        evt = JSON.parse(line.slice(6)) as ChatStreamEvent;
      } catch {
        continue;
      }
      if (evt.type === "answer_chunk") {
        params.onChunk(evt.content);
      } else if (evt.type === "done") {
        params.onDone({
          conversationId: evt.conversation_id,
          messageId: evt.message_id ?? "",
          answer: "", // accumulé côté composant via onChunk
          grounded: evt.grounded,
          citations: toCitations(evt.citations),
        });
      } else if (evt.type === "error") {
        params.onError(new Error(evt.message));
        return;
      }
    }
  }
}

// ============================================================================
// Administration — RÉEL (compteurs + lancement d'évaluation)
// ============================================================================

export interface AdminCounts {
  totalUsers: number;
  totalKnowledgeBases: number;
  totalDocuments: number;
  totalFeedbackUp: number;
  totalFeedbackDown: number;
}

export async function getAdminCounts(): Promise<AdminCounts> {
  const raw = await apiRequest<{
    total_users: number;
    total_knowledge_bases: number;
    total_documents: number;
    total_feedback_up: number;
    total_feedback_down: number;
  }>("/admin/metrics");
  return {
    totalUsers: raw.total_users,
    totalKnowledgeBases: raw.total_knowledge_bases,
    totalDocuments: raw.total_documents,
    totalFeedbackUp: raw.total_feedback_up,
    totalFeedbackDown: raw.total_feedback_down,
  };
}

export interface AdminFeedbackItem {
  feedbackId: string;
  rating: "up" | "down";
  comment: string | null;
  createdAt: string;
  messageId: string;
  messageContent: string;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  userEmail: string;
}

export async function getAdminFeedback(rating?: "up" | "down"): Promise<AdminFeedbackItem[]> {
  const query = rating ? `?rating=${rating}` : "";
  const raw = await apiRequest<
    Array<{
      feedback_id: string;
      rating: "up" | "down";
      comment: string | null;
      created_at: string;
      message_id: string;
      message_content: string;
      knowledge_base_id: string;
      knowledge_base_name: string;
      user_email: string;
    }>
  >(`/admin/feedback${query}`);
  return raw.map((f) => ({
    feedbackId: f.feedback_id,
    rating: f.rating,
    comment: f.comment,
    createdAt: f.created_at,
    messageId: f.message_id,
    messageContent: f.message_content,
    knowledgeBaseId: f.knowledge_base_id,
    knowledgeBaseName: f.knowledge_base_name,
    userEmail: f.user_email,
  }));
}

export interface EvaluationRunOptions {
  knowledgeBaseId: string;
  datasetName?: string;
  topK?: number;
  mode?: "vector" | "hybrid";
  rerank?: boolean;
  runGeneration?: boolean;
}

export interface EvaluationSummary {
  datasetName: string;
  datasetVersion: string;
  totalQuestions: number;
  errors: number;
  meanRecallAtK: number | null;
  meanPrecisionAtK: number | null;
  mrr: number;
  meanFaithfulness: number | null;
  meanAnswerRelevance: number | null;
  meanLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number;
}

export async function runEvaluation(options: EvaluationRunOptions): Promise<EvaluationSummary> {
  const raw = await apiRequest<{
    dataset_name: string;
    dataset_version: string;
    total_questions: number;
    errors: number;
    mean_recall_at_k: number | null;
    mean_precision_at_k: number | null;
    mrr: number;
    mean_faithfulness: number | null;
    mean_answer_relevance: number | null;
    mean_latency_ms: number;
    p95_latency_ms: number;
    error_rate: number;
  }>("/admin/evaluations/run", {
    method: "POST",
    body: {
      knowledge_base_id: options.knowledgeBaseId,
      dataset_name: options.datasetName ?? "sample_benchmark_v1",
      top_k: options.topK ?? 5,
      mode: options.mode ?? "vector",
      rerank: options.rerank ?? false,
      run_generation: options.runGeneration ?? true,
    },
  });
  return {
    datasetName: raw.dataset_name,
    datasetVersion: raw.dataset_version,
    totalQuestions: raw.total_questions,
    errors: raw.errors,
    meanRecallAtK: raw.mean_recall_at_k,
    meanPrecisionAtK: raw.mean_precision_at_k,
    mrr: raw.mrr,
    meanFaithfulness: raw.mean_faithfulness,
    meanAnswerRelevance: raw.mean_answer_relevance,
    meanLatencyMs: raw.mean_latency_ms,
    p95LatencyMs: raw.p95_latency_ms,
    errorRate: raw.error_rate,
  };
}

// ============================================================================
// Profil utilisateur — RÉEL
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
}

export async function getMe(): Promise<UserProfile> {
  const raw = await apiRequest<{
    id: string;
    email: string;
    role: string;
    display_name: string | null;
  }>("/auth/me");
  return { id: raw.id, email: raw.email, role: raw.role, displayName: raw.display_name };
}

export async function updateMe(displayName: string): Promise<UserProfile> {
  const raw = await apiRequest<{
    id: string;
    email: string;
    role: string;
    display_name: string | null;
  }>("/auth/me", { method: "PATCH", body: { display_name: displayName } });
  return { id: raw.id, email: raw.email, role: raw.role, displayName: raw.display_name };
}

// ============================================================================
// DONNÉES DE DÉMONSTRATION — pas d'endpoint backend à ce jour.
// Toute vue qui affiche ces données porte un <PreviewBadge /> (voir
// components/preview-badge.tsx) pour rester honnête sur ce qui est réel.
// ============================================================================

export const api = {
  getKnowledgeBases,
  getKnowledgeBase,
  createKnowledgeBase,
  deleteKnowledgeBase,
  renameKnowledgeBase,
  getDocuments,
  uploadDocument,
  deleteDocument,
  getDocument,
  getJob,
  pollJobUntilDone,
  searchKnowledgeBase,
  compareRetrievalModes,
  getConversationsForKb,
  getConversation,
  deleteConversation,
  sendChatMessage,
  sendChatMessageStream,
  submitFeedback,
  deleteFeedback,
  getAdminCounts,
  getAdminFeedback,
  runEvaluation,
  getMe,
  updateMe,

  // --- mocké, non backé ---
  getWorkspace: () => delay(mock.workspace),
  getMembers: () => delay(mock.members),
  getCollections: () => delay(mock.collections),
  getConversations: () => delay(mock.conversations), // recherche globale (palette ⌘K) : pas d'endpoint "toutes conversations" côté backend
  getVerifiedAnswers: () => delay(mock.verifiedAnswers),
  getActivity: () => delay(mock.activity),
  getNotifications: () => delay(mock.notifications),
  getIntegrations: () => delay(mock.integrations),
  getApiKeys: () => delay(mock.apiKeys),
  getAuditLogs: () => delay(mock.auditLogs),
  getComparison: () => delay(mock.comparisonModes, 700),
  getJobs: () => delay(mock.ingestionJobs), // fil d'ingestion "démo" du tableau de bord — pas encore de flux temps réel côté backend
  // Métriques riches (séries temporelles, coût, qualité agrégée dans le
  // temps) : pas de persistance historique côté backend (Prometheus existe
  // mais n'est pas interrogé depuis le frontend) — reste mocké.
  getMetrics: () =>
    delay({
      series: mock.usageSeries,
      quality: mock.ragQuality,
      queriesThisWeek: 4820,
      answeredRate: 0.87,
      indexedDocuments: mock.documents.length * 9,
      monthlyCost: 412.6,
      latencyP95: 1810,
      errorRate: 1.4,
      throughput: 38,
      costPerQuery: 0.0086,
    }),
};

export type { Member, Role, Visibility } from "./mock-data";
