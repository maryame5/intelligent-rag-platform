/**
 * Mocked data layer.
 * Every screen reads through `src/lib/api.ts`, which is the single place to
 * swap these fixtures for the FastAPI backend (http://localhost:8000).
 */

export type Role = "owner" | "admin" | "editor" | "member";
export type Visibility = "private" | "team" | "workspace";
export type DocStatus = "indexed" | "processing" | "failed" | "queued";
export type JobStatus = "running" | "succeeded" | "failed" | "queued";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  lastActive: string;
  initials: string;
  kbCount: number;
  status: "active" | "invited";
}

export interface KnowledgeBase {
  id: string;
  name: string;
  collection: string;
  description: string;
  visibility: Visibility;
  documents: number;
  chunks: number;
  coverage: number;
  freshnessDays: number;
  updatedAt: string;
  members: string[];
  recallAtK: number;
  precisionAtK: number;
}

export interface DocumentItem {
  id: string;
  kbId: string;
  title: string;
  type: "PDF" | "DOCX" | "MD" | "HTML";
  status: DocStatus;
  sizeKb: number;
  chunks: number;
  tag: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
}

export interface VerifiedAnswer {
  id: string;
  question: string;
  answer: string;
  kbId: string;
  tags: string[];
  verifiedBy: string;
  verifiedAt: string;
  uses: number;
}

export interface Conversation {
  id: string;
  title: string;
  kbId: string;
  project: string;
  pinned: boolean;
  archived: boolean;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface Citation {
  index: number;
  documentTitle: string;
  page: number;
  excerpt: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  notFound?: boolean;
  verified?: boolean;
  citations?: Citation[];
  latencyMs?: number;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  resource: string;
  ip: string;
  at: string;
  severity: "info" | "warning" | "critical";
}

export interface IngestionJob {
  id: string;
  document: string;
  kbId: string;
  status: JobStatus;
  stage: string;
  durationMs: number;
  startedAt: string;
  attempts: number;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scope: "read" | "read/write" | "admin";
  createdAt: string;
  lastUsed: string | null;
}

export interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "connected" | "available" | "coming-soon";
  lastSync: string | null;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  kind: "job" | "access" | "feedback";
}

export const workspace = {
  id: "ws_acme",
  name: "Acme Industries",
  plan: "Business",
  seats: 214,
  createdAt: "2024-11-03",
};

export const members: Member[] = [
  { id: "u1", name: "Maryame Idrissi", email: "maryame@acme.io", role: "owner", lastActive: "il y a 2 min", initials: "MI", kbCount: 12, status: "active" },
  { id: "u2", name: "Julien Marchand", email: "julien@acme.io", role: "admin", lastActive: "il y a 18 min", initials: "JM", kbCount: 9, status: "active" },
  { id: "u3", name: "Sofia Ben Amar", email: "sofia@acme.io", role: "editor", lastActive: "il y a 1 h", initials: "SB", kbCount: 5, status: "active" },
  { id: "u4", name: "Tom Nguyen", email: "tom@acme.io", role: "editor", lastActive: "il y a 3 h", initials: "TN", kbCount: 4, status: "active" },
  { id: "u5", name: "Claire Dubois", email: "claire@acme.io", role: "member", lastActive: "hier", initials: "CD", kbCount: 3, status: "active" },
  { id: "u6", name: "Ahmed Ziani", email: "ahmed@acme.io", role: "member", lastActive: "il y a 2 j", initials: "AZ", kbCount: 2, status: "active" },
  { id: "u7", name: "Lena Petit", email: "lena@acme.io", role: "member", lastActive: "—", initials: "LP", kbCount: 0, status: "invited" },
  { id: "u8", name: "Marc Oliveira", email: "marc@acme.io", role: "editor", lastActive: "—", initials: "MO", kbCount: 0, status: "invited" },
];

export const collections = ["Produit", "RH", "Juridique", "Support"];

export const knowledgeBases: KnowledgeBase[] = [
  { id: "kb_prod_docs", name: "Documentation produit", collection: "Produit", description: "Specs, release notes et guides d'intégration de la suite Acme.", visibility: "workspace", documents: 428, chunks: 12840, coverage: 92, freshnessDays: 6, updatedAt: "2026-09-09", members: ["u1", "u2", "u3", "u4"], recallAtK: 0.91, precisionAtK: 0.78 },
  { id: "kb_api_ref", name: "Référence API", collection: "Produit", description: "OpenAPI, exemples de code et guides de migration v2 → v3.", visibility: "workspace", documents: 156, chunks: 5320, coverage: 88, freshnessDays: 3, updatedAt: "2026-09-10", members: ["u1", "u4"], recallAtK: 0.87, precisionAtK: 0.81 },
  { id: "kb_hr", name: "Procédures RH", collection: "RH", description: "Congés, onboarding, politique de télétravail, avantages.", visibility: "team", documents: 94, chunks: 2210, coverage: 79, freshnessDays: 21, updatedAt: "2026-09-04", members: ["u1", "u3", "u5"], recallAtK: 0.83, precisionAtK: 0.74 },
  { id: "kb_legal", name: "Base légale & conformité", collection: "Juridique", description: "Contrats types, RGPD, DPA, politiques de rétention.", visibility: "private", documents: 61, chunks: 1890, coverage: 71, freshnessDays: 34, updatedAt: "2026-08-28", members: ["u1", "u2"], recallAtK: 0.76, precisionAtK: 0.7 },
  { id: "kb_support", name: "Support client", collection: "Support", description: "Playbooks d'escalade, réponses types, incidents connus.", visibility: "workspace", documents: 312, chunks: 9105, coverage: 95, freshnessDays: 2, updatedAt: "2026-09-10", members: ["u1", "u2", "u5", "u6"], recallAtK: 0.94, precisionAtK: 0.85 },
  { id: "kb_security", name: "Sécurité & SecOps", collection: "Juridique", description: "Runbooks incidents, matrice de risques, questionnaires clients.", visibility: "team", documents: 77, chunks: 2640, coverage: 84, freshnessDays: 11, updatedAt: "2026-09-07", members: ["u1", "u2", "u4"], recallAtK: 0.88, precisionAtK: 0.79 },
];

const docTitles = [
  "Politique de télétravail 2026", "Guide d'onboarding ingénieur", "Contrat cadre fournisseur", "Runbook incident P1",
  "Spécification moteur de recherche", "Notes de version 3.4", "Matrice de conformité RGPD", "Procédure de note de frais",
  "Playbook escalade support", "Architecture de l'ingestion", "Politique de rétention des données", "Guide migration API v3",
  "Charte sécurité poste de travail", "Barème de rémunération", "Modèle de DPA client", "FAQ facturation",
];

export const documents: DocumentItem[] = knowledgeBases.flatMap((kb, kbIdx) =>
  Array.from({ length: 14 }, (_, i) => {
    const n = kbIdx * 14 + i;
    const status: DocStatus =
      n % 17 === 0 ? "failed" : n % 11 === 0 ? "processing" : n % 23 === 0 ? "queued" : "indexed";
    return {
      id: `doc_${kb.id}_${i}`,
      kbId: kb.id,
      title: `${docTitles[n % docTitles.length]}${i > 7 ? ` — annexe ${i - 7}` : ""}`,
      type: (["PDF", "DOCX", "MD", "HTML"] as const)[n % 4]!,
      status,
      sizeKb: 120 + ((n * 137) % 4800),
      chunks: 12 + ((n * 31) % 260),
      tag: ["référence", "procédure", "contrat", "runbook", "archive"][n % 5]!,
      uploadedBy: members[n % 6]!.name,
      uploadedAt: `2026-0${(n % 8) + 1}-${String((n % 27) + 1).padStart(2, "0")}`,
    };
  }),
);

export const activity: ActivityItem[] = [
  { id: "a1", actor: "Sofia Ben Amar", action: "a importé 12 documents dans", target: "Documentation produit", at: "il y a 14 min" },
  { id: "a2", actor: "Julien Marchand", action: "a vérifié une réponse dans", target: "Support client", at: "il y a 42 min" },
  { id: "a3", actor: "Tom Nguyen", action: "a relancé un job d'ingestion sur", target: "Référence API", at: "il y a 1 h" },
  { id: "a4", actor: "Maryame Idrissi", action: "a modifié les accès de", target: "Base légale & conformité", at: "il y a 3 h" },
  { id: "a5", actor: "Claire Dubois", action: "a signalé une réponse incorrecte dans", target: "Procédures RH", at: "hier" },
  { id: "a6", actor: "Julien Marchand", action: "a créé la knowledge base", target: "Sécurité & SecOps", at: "il y a 2 j" },
];

export const verifiedAnswers: VerifiedAnswer[] = [
  { id: "va1", question: "Combien de jours de télétravail par semaine sont autorisés ?", answer: "Jusqu'à 3 jours par semaine, avec validation du manager et au moins 2 jours de présence sur site.", kbId: "kb_hr", tags: ["RH", "télétravail"], verifiedBy: "Sofia Ben Amar", verifiedAt: "2026-09-02", uses: 148 },
  { id: "va2", question: "Quelle est la procédure d'escalade pour un incident P1 ?", answer: "Ouverture d'un canal dédié, page de l'astreinte sous 5 min, communication client toutes les 30 min jusqu'à mitigation.", kbId: "kb_support", tags: ["support", "incident"], verifiedBy: "Julien Marchand", verifiedAt: "2026-09-08", uses: 96 },
  { id: "va3", question: "Quelle est la durée de rétention des logs applicatifs ?", answer: "90 jours en stockage chaud, 400 jours en archive froide, suppression automatique ensuite.", kbId: "kb_legal", tags: ["RGPD", "rétention"], verifiedBy: "Maryame Idrissi", verifiedAt: "2026-08-21", uses: 61 },
  { id: "va4", question: "Comment migrer de l'API v2 vers la v3 ?", answer: "Basculer l'authentification vers OAuth 2.1, remplacer /search par /retrieve, et mettre à jour la pagination par curseur.", kbId: "kb_api_ref", tags: ["API", "migration"], verifiedBy: "Tom Nguyen", verifiedAt: "2026-09-05", uses: 212 },
  { id: "va5", question: "Quel est le délai de remboursement d'une note de frais ?", answer: "Traitement sous 10 jours ouvrés après validation du manager, versement avec la paie suivante.", kbId: "kb_hr", tags: ["RH", "finance"], verifiedBy: "Sofia Ben Amar", verifiedAt: "2026-07-30", uses: 74 },
  { id: "va6", question: "Le DPA standard couvre-t-il les sous-traitants hors UE ?", answer: "Oui via les clauses contractuelles types, sous réserve d'une analyse d'impact documentée par le DPO.", kbId: "kb_legal", tags: ["juridique", "RGPD"], verifiedBy: "Maryame Idrissi", verifiedAt: "2026-08-14", uses: 38 },
];

export const conversations: Conversation[] = [
  {
    id: "c1",
    title: "Politique de télétravail — cas particuliers",
    kbId: "kb_hr",
    project: "Questions RH",
    pinned: true,
    archived: false,
    updatedAt: "il y a 12 min",
    messages: [
      { id: "m1", role: "user", content: "Un salarié en contrat d'alternance peut-il faire du télétravail ?" },
      {
        id: "m2",
        role: "assistant",
        content:
          "Oui. Les alternants peuvent télétravailler jusqu'à 2 jours par semaine [1], à condition que le tuteur soit présent sur site les jours restants [2]. Le premier mois d'intégration se fait intégralement en présentiel.",
        latencyMs: 1840,
        verified: true,
        citations: [
          { index: 1, documentTitle: "Politique de télétravail 2026", page: 4, excerpt: "Les alternants et stagiaires bénéficient d'un maximum de deux jours de télétravail hebdomadaires.", score: 0.91 },
          { index: 2, documentTitle: "Guide d'onboarding ingénieur", page: 11, excerpt: "La présence du tuteur est requise sur les jours de présentiel de l'alternant.", score: 0.84 },
        ],
      },
    ],
  },
  {
    id: "c2",
    title: "Escalade incident P1 chez un client grand compte",
    kbId: "kb_support",
    project: "Support N2",
    pinned: false,
    archived: false,
    updatedAt: "il y a 2 h",
    messages: [
      { id: "m3", role: "user", content: "Quel SLA s'applique pour un P1 sur le plan Enterprise ?" },
      {
        id: "m4",
        role: "assistant",
        content: "Première réponse en 15 minutes, mise à jour toutes les 30 minutes, et rétablissement visé sous 4 heures [1].",
        latencyMs: 1320,
        citations: [
          { index: 1, documentTitle: "Playbook escalade support", page: 2, excerpt: "Plan Enterprise : first response 15 min, updates every 30 min, target restoration 4 h.", score: 0.95 },
        ],
      },
    ],
  },
  {
    id: "c3",
    title: "Clauses de résiliation anticipée",
    kbId: "kb_legal",
    project: "Juridique",
    pinned: false,
    archived: false,
    updatedAt: "hier",
    messages: [
      { id: "m5", role: "user", content: "Quel préavis pour une résiliation anticipée d'un contrat cadre signé en 2019 ?" },
      { id: "m6", role: "assistant", content: "Cette information n'est pas présente dans les documents indexés de cette knowledge base.", notFound: true, latencyMs: 980 },
    ],
  },
  { id: "c4", title: "Migration API v3 — plan de bascule", kbId: "kb_api_ref", project: "Produit", pinned: true, archived: false, updatedAt: "il y a 3 j", messages: [] },
  { id: "c5", title: "Questionnaire sécurité client — réponses", kbId: "kb_security", project: "Produit", pinned: false, archived: true, updatedAt: "il y a 9 j", messages: [] },
];

export const auditLogs: AuditLog[] = Array.from({ length: 42 }, (_, i) => {
  const kinds = [
    { action: "auth.login", resource: "session", severity: "info" as const },
    { action: "document.delete", resource: "doc_prod_docs_4", severity: "warning" as const },
    { action: "permission.change", resource: "kb_legal", severity: "critical" as const },
    { action: "kb.create", resource: "kb_security", severity: "info" as const },
    { action: "data.export", resource: "workspace", severity: "critical" as const },
    { action: "apikey.revoke", resource: "key_ing_7f2", severity: "warning" as const },
  ];
  const k = kinds[i % kinds.length]!;
  return {
    id: `log_${i}`,
    actor: members[i % 6]!.email,
    action: k.action,
    resource: k.resource,
    ip: `10.4.${i % 12}.${(i * 7) % 250}`,
    at: `2026-09-${String(10 - (i % 10)).padStart(2, "0")} ${String((i * 3) % 24).padStart(2, "0")}:${String((i * 17) % 60).padStart(2, "0")}`,
    severity: k.severity,
  };
});

export const ingestionJobs: IngestionJob[] = Array.from({ length: 24 }, (_, i) => {
  const status: JobStatus = i % 9 === 0 ? "failed" : i % 7 === 0 ? "running" : i % 11 === 0 ? "queued" : "succeeded";
  return {
    id: `job_${1000 + i}`,
    document: docTitles[i % docTitles.length]!,
    kbId: knowledgeBases[i % knowledgeBases.length]!.id,
    status,
    stage: status === "running" ? ["parsing", "chunking", "embedding"][i % 3]! : status === "failed" ? "embedding" : "done",
    durationMs: 2400 + ((i * 811) % 42000),
    startedAt: `2026-09-10 ${String((i * 2) % 24).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}`,
    attempts: status === "failed" ? 2 : 1,
  };
});

export const apiKeys: ApiKey[] = [
  { id: "k1", name: "Production ingestion", prefix: "rag_live_7f2c", scope: "read/write", createdAt: "2026-03-11", lastUsed: "il y a 4 min" },
  { id: "k2", name: "Analytics read-only", prefix: "rag_live_a91b", scope: "read", createdAt: "2026-05-02", lastUsed: "il y a 2 h" },
  { id: "k3", name: "Staging sandbox", prefix: "rag_test_33de", scope: "read/write", createdAt: "2026-07-19", lastUsed: null },
];

export const integrations: Integration[] = [
  { id: "i1", name: "Upload manuel", category: "Fichiers", description: "Import de PDF, DOCX, Markdown et HTML par glisser-déposer.", status: "connected", lastSync: "il y a 14 min" },
  { id: "i2", name: "API & Webhooks", category: "Plateforme", description: "Ingestion programmatique et notifications d'événements.", status: "connected", lastSync: "il y a 4 min" },
  { id: "i3", name: "Google Drive", category: "Fichiers", description: "Synchronisation continue de dossiers partagés.", status: "coming-soon", lastSync: null },
  { id: "i4", name: "Slack", category: "Communication", description: "Indexation de canaux et réponses directement dans Slack.", status: "coming-soon", lastSync: null },
  { id: "i5", name: "Confluence", category: "Documentation", description: "Import d'espaces et pages avec suivi des versions.", status: "coming-soon", lastSync: null },
  { id: "i6", name: "SharePoint", category: "Fichiers", description: "Connexion aux bibliothèques de documents Microsoft 365.", status: "coming-soon", lastSync: null },
];

export const notifications: NotificationItem[] = [
  { id: "n1", title: "Traitement terminé", body: "« Guide migration API v3 » est indexé (86 chunks).", at: "il y a 6 min", read: false, kind: "job" },
  { id: "n2", title: "Nouvel accès", body: "Julien vous a ajoutée à la KB Sécurité & SecOps.", at: "il y a 1 h", read: false, kind: "access" },
  { id: "n3", title: "Réponse signalée", body: "Une réponse que vous avez vérifiée a été signalée comme incorrecte.", at: "il y a 5 h", read: false, kind: "feedback" },
  { id: "n4", title: "Job échoué", body: "L'ingestion de « Contrat cadre fournisseur » a échoué à l'étape embedding.", at: "hier", read: true, kind: "job" },
];

export const usageSeries = Array.from({ length: 14 }, (_, i) => ({
  day: `${i + 1}/09`,
  queries: 320 + Math.round(Math.sin(i / 2) * 90) + i * 12,
  latencyP95: 1400 + Math.round(Math.cos(i / 3) * 220),
  cost: 12 + Math.round(Math.sin(i / 1.7) * 4) + i * 0.4,
  errorRate: Math.max(0.2, 1.8 + Math.sin(i / 2.4) * 1.1),
}));

export const ragQuality = [
  { experiment: "baseline · vector-only", faithfulness: 0.78, relevance: 0.74, recall: 0.71, latencyMs: 980 },
  { experiment: "hybrid BM25 + vector", faithfulness: 0.85, relevance: 0.83, recall: 0.86, latencyMs: 1240 },
  { experiment: "hybrid + reranker", faithfulness: 0.92, relevance: 0.9, recall: 0.91, latencyMs: 1810 },
  { experiment: "chunk 512 / overlap 64", faithfulness: 0.88, relevance: 0.86, recall: 0.88, latencyMs: 1320 },
];

export const comparisonModes = [
  {
    mode: "Vector-only",
    latencyMs: 940,
    confidence: 0.61,
    answer: "Les alternants peuvent télétravailler, la politique ne précise pas de limite spécifique pour ce statut.",
    sources: ["Politique de télétravail 2026 (p.2)"],
  },
  {
    mode: "Hybride",
    latencyMs: 1260,
    confidence: 0.79,
    answer: "Les alternants peuvent télétravailler jusqu'à 2 jours par semaine selon la politique 2026.",
    sources: ["Politique de télétravail 2026 (p.4)", "FAQ facturation (p.1)"],
  },
  {
    mode: "Hybride + reranker",
    latencyMs: 1820,
    confidence: 0.93,
    answer:
      "Les alternants peuvent télétravailler jusqu'à 2 jours par semaine, avec présence du tuteur les jours sur site et un premier mois intégralement en présentiel.",
    sources: ["Politique de télétravail 2026 (p.4)", "Guide d'onboarding ingénieur (p.11)"],
  },
];
