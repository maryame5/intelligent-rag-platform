import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Brain,
  Database,
  Shield,
  Zap,
  Sparkles,
  ChevronRight,
  Search,
  MessageSquare,
  BarChart3,
  Check,
  FileText,
  Lock,
  Layers,
  Cpu,
  Server,
  FolderSync,
  ChevronDown,
  Activity,
  Sliders,
  CheckCircle2,
  Code2,
  ShieldCheck,
  Gauge,
  FileCheck,
  Share2,
  Boxes,
  Clock,
  ExternalLink,
  Flame,
  Key,
  Terminal,
  RefreshCw,
  Compass,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartRAG — Plateforme RAG d'Entreprise Hybride & Observable" },
      {
        name: "description",
        content:
          "Plateforme RAG production-ready : Ingestion asynchrone Celery/MinIO, Recherche Hybride pgvector + BM25, Reranking, Citations vérifiables, Évaluation Recall@K/MRR et Observabilité Prometheus.",
      },
    ],
  }),
  component: LandingPage,
});

/**
 * Geometric, High-Visibility SmartRAG Brand Logo Mark using the 5-Color Palette
 */
function SmartRAGLogoMark({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm"
        aria-label="SmartRAG Logo"
      >
        {/* Background Rounded Squircle with Navy #28264B */}
        <rect width="44" height="44" rx="12" fill="#28264B" />
        
        {/* Layer 1: Base knowledge block in Periwinkle #959EC9 */}
        <rect x="10" y="27" width="16" height="4.5" rx="2.25" fill="#959EC9" fillOpacity="0.8" />
        
        {/* Layer 2: Intermediate indexed vectors in Slate #4E5174 */}
        <rect x="10" y="19.5" width="24" height="4.5" rx="2.25" fill="#E8EAE7" fillOpacity="0.9" />
        
        {/* Layer 3: Contextual retrieval layer */}
        <rect x="10" y="12" width="18" height="4.5" rx="2.25" fill="#E8EAE7" />
        
        {/* Active focal node in Crimson Ruby #AA0033 */}
        <circle cx="31.5" cy="14.25" r="4" fill="#AA0033" />
      </svg>
    </div>
  );
}

// Scénarios réels de démonstration interactive
interface DemoScenario {
  id: string;
  category: string;
  query: string;
  docSource: string;
  docPage: string;
  latencyMs: number;
  similarityScore: string;
  chunksFound: number;
  retrievalStages: {
    name: string;
    score: string;
    details: string;
  }[];
  answer: string;
  citationExcerpt: string;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "finance",
    category: "Rapport Financier",
    query: "Quel est l'EBITDA prévisionnel Q4 2024 et quelles sont les hypothèses de marge opérationnelle ?",
    docSource: "Rapport_Financier_Annuel_2024.pdf",
    docPage: "Page 42, Tableau 3.2.B",
    latencyMs: 245,
    similarityScore: "0.94",
    chunksFound: 4,
    retrievalStages: [
      { name: "BM25 Sparse Search", score: "0.89", details: "Indexation inversée sur 'EBITDA', 'Q4 2024', 'marge opérationnelle'." },
      { name: "Dense Vector Search (pgvector)", score: "0.94", details: "Similarité cosinus sur les embeddings 1536-dim." },
      { name: "RRF Fusion & Cross-Encoder Rerank", score: "0.98", details: "Réordonnancement des passages les plus pertinents et filtrage du bruit." },
    ],
    answer:
      "D'après le rapport financier consolidé, l'EBITDA prévisionnel pour le Q4 2024 est fixé à **14,8 M€**, avec une marge opérationnelle cible de **21,4%**, soutenue par l'optimisation des charges d'infrastructure et la progression des souscriptions annuelles.",
    citationExcerpt:
      "« Tableau 3.2.B — Prévisions d'exploitation Q4 : EBITDA cible fixé à 14,8 M€ (marge opérationnelle 21,4%), sous hypothèse de renouvellement des contrats cadres. »",
  },
  {
    id: "hr",
    category: "Politique RH & Mobilité",
    query: "Quelles sont les conditions pour le forfait télétravail international et le plafond de remboursement ?",
    docSource: "Politique_RH_Mobilite_2024.docx",
    docPage: "Section 4.1.3",
    latencyMs: 210,
    similarityScore: "0.92",
    chunksFound: 3,
    retrievalStages: [
      { name: "BM25 Sparse Search", score: "0.85", details: "Correspondance exacte sur 'télétravail international', 'plafond'." },
      { name: "Dense Vector Search (pgvector)", score: "0.92", details: "Recherche sémantique dans la collection des politiques RH." },
      { name: "RRF Fusion & Cross-Encoder Rerank", score: "0.97", details: "Priorisation de la clause en vigueur pour l'année 2024." },
    ],
    answer:
      "Les collaborateurs ayant validé leur période d'essai (minimum **6 mois d'ancienneté**) peuvent effectuer jusqu'à **30 jours ouvrés** par an de télétravail dans l'UE/EEE. Le plafond d'indemnité annuelle d'équipement s'élève à **450 € TTC** sur justificatifs.",
    citationExcerpt:
      "« Section 4.1.3 : La mobilité internationale est plafonnée à 30 jours ouvrés annuels après validation hiérarchique. Prise en charge d'équipement à hauteur de 450 € TTC/an. »",
  },
  {
    id: "tech",
    category: "Architecture & DevOps",
    query: "Comment configurer le renouvellement automatique des certificats TLS avec cert-manager ?",
    docSource: "Guide_Securite_Kubernetes.md",
    docPage: "Chapitre 5.2 / Cert-Manager",
    latencyMs: 230,
    similarityScore: "0.96",
    chunksFound: 3,
    retrievalStages: [
      { name: "BM25 Sparse Search", score: "0.91", details: "Correspondance sur 'cert-manager', 'renewBefore', 'ClusterIssuer'." },
      { name: "Dense Vector Search (pgvector)", score: "0.96", details: "Extraction de la structure YAML du manifeste Kubernetes." },
      { name: "RRF Fusion & Cross-Encoder Rerank", score: "0.99", details: "Validation de la configuration avec Let's Encrypt Production." },
    ],
    answer:
      "Dans le manifeste du certificat, spécifiez les champs `duration: 720h` (30 jours) et `renewBefore: 240h` (10 jours). Le contrôleur cert-manager déclenchera automatiquement le renouvellement auprès du `ClusterIssuer` 10 jours avant l'expiration.",
    citationExcerpt:
      "« spec:\n  duration: 720h\n  renewBefore: 240h\n  issuerRef:\n    name: letsencrypt-prod\n    kind: ClusterIssuer »",
  },
];

// Matrice complète des fonctionnalités réelles : Implémenté vs Roadmap
interface FeatureStatusItem {
  name: string;
  category: "ingestion" | "retrieval" | "generation" | "eval" | "security" | "infra";
  status: "implemented" | "roadmap";
  description: string;
  techStack: string;
}

const FEATURE_STATUS_ITEMS: FeatureStatusItem[] = [
  // ── INGESTION ──
  {
    name: "Upload multi-formats & Validation",
    category: "ingestion",
    status: "implemented",
    description: "Support complet PDF, TXT, MD, DOCX avec validation de types MIME et détection anti-usurpation.",
    techStack: "FastAPI + Pypdf / python-docx",
  },
  {
    name: "Stockage d'objets S3 sécurisé",
    category: "ingestion",
    status: "implemented",
    description: "Stockage isolé des documents originaux avec génération de buckets et clés déterministes.",
    techStack: "MinIO S3 Compatible Storage",
  },
  {
    name: "Pipeline de chunking & Nettoyage",
    category: "ingestion",
    status: "implemented",
    description: "Découpage récursif avec chevauchement (overlap), nettoyage d'espaces et extraction de métadonnées.",
    techStack: "Chunker custom + Regex normalizer",
  },
  {
    name: "Ingestion asynchrone & Jobs en temps réel",
    category: "ingestion",
    status: "implemented",
    description: "Traitement en tâche de fond pour les gros volumes, retry automatique et suivi de statut par job ID.",
    techStack: "Celery Workers + Redis Broker",
  },
  {
    name: "OCR avancé & Reconnaissance de tableaux",
    category: "ingestion",
    status: "roadmap",
    description: "Extraction de texte sur scans basse résolution, formulaires manuscrits et tableaux complexes.",
    techStack: "Tesseract OCR / LayoutLMv3",
  },
  {
    name: "Connecteurs Cloud automatiques",
    category: "ingestion",
    status: "roadmap",
    description: "Synchronisation périodique avec Google Drive, Notion API, Confluence, Microsoft SharePoint et S3.",
    techStack: "Connecteurs OAuth2 + Sync Webhooks",
  },

  // ── RETRIEVAL ──
  {
    name: "Recherche Vectorielle Dense",
    category: "retrieval",
    status: "implemented",
    description: "Indexation des embeddings et recherche par similarité cosinus avec filtrage par collection et Top-K.",
    techStack: "PostgreSQL + pgvector (HNSW / IVFFlat)",
  },
  {
    name: "Recherche Textuelle Lexicale BM25",
    category: "retrieval",
    status: "implemented",
    description: "Index inversé pour capturer les codes exacts, acronymes et références techniques.",
    techStack: "BM25 Okapi Algorithm",
  },
  {
    name: "Fusion RRF (Reciprocal Rank Fusion)",
    category: "retrieval",
    status: "implemented",
    description: "Combinaison optimale et pondérée des scores vectoriels et textuels sans distorsion d'échelle.",
    techStack: "Reciprocal Rank Fusion Service",
  },
  {
    name: "Reranker Cross-Encoder & LLM Reranking",
    category: "retrieval",
    status: "implemented",
    description: "Réordonnancement précis des passages candidats avec mécanisme de repli sécurisé en cas de timeout.",
    techStack: "Cross-Encoder / LLM scoring",
  },
  {
    name: "Cache Redis pour Embeddings & Requêtes",
    category: "retrieval",
    status: "implemented",
    description: "Mise en cache des vecteurs et des requêtes fréquentes pour réduire la latence à < 20ms.",
    techStack: "Redis in-memory cache",
  },
  {
    name: "Agentic Multi-Hop RAG & SQL Tools",
    category: "retrieval",
    status: "roadmap",
    description: "Raisonnement multi-étapes pour les questions croisées et requêtes SQL en langage naturel.",
    techStack: "LangGraph / Tool-Calling Agents",
  },

  // ── GENERATION ──
  {
    name: "Génération Grounded avec Citations",
    category: "generation",
    status: "implemented",
    description: "Réponses strictes s'appuyant sur le contexte extrait avec citations d'extraits et références de pages.",
    techStack: "OpenRouter / GLM 5.2 / GPT-4o",
  },
  {
    name: "Réécriture de Requête & Multi-tour",
    category: "generation",
    status: "implemented",
    description: "Reformulation contextuelle basée sur l'historique de conversation pour désambiguïser les pronoms.",
    techStack: "Contextual Query Rewriter",
  },
  {
    name: "Refus Déterministe Hors-Contexte",
    category: "generation",
    status: "implemented",
    description: "Détection automatique de manque d'information et refus propre sans hallucination.",
    techStack: "Confidence Gate & Refusal Guardrails",
  },
  {
    name: "Streaming SSE (Server-Sent Events)",
    category: "generation",
    status: "implemented",
    description: "Génération fluide en streaming avec émission progressive du texte et des métadonnées de source.",
    techStack: "FastAPI StreamingResponse + SSE",
  },
  {
    name: "A/B Testing de Prompts & Modèles",
    category: "generation",
    status: "roadmap",
    description: "Comparaison à l'aveugle de différents templates de prompt et LLMs avec feedback utilisateur.",
    techStack: "AB Testing Engine + Analytics",
  },

  // ── EVALUATION & OBSERVABILITY ──
  {
    name: "Métriques de Retrieval (Recall@K, MRR)",
    category: "eval",
    status: "implemented",
    description: "Évaluation de la pertinence de recherche avec Recall@K, Precision@K et Mean Reciprocal Rank.",
    techStack: "Eval Runner + Dataset Loader",
  },
  {
    name: "LLM-as-a-Judge (Faithfulness)",
    category: "eval",
    status: "implemented",
    description: "Contrôle automatique de fidélité de la réponse par rapport au contexte fourni (hallucination detection).",
    techStack: "Automated LLM Judge Service",
  },
  {
    name: "Métriques Prometheus & Grafana",
    category: "eval",
    status: "implemented",
    description: "Export des métriques de latence de retrieval, génération, taux d'erreurs et requêtes par seconde.",
    techStack: "Prometheus Client + Grafana Dashboards",
  },
  {
    name: "Logs Structurés JSON",
    category: "eval",
    status: "implemented",
    description: "Formatage unifié des logs avec corrélation des request IDs pour le débogage en production.",
    techStack: "Python structlog / JSON handler",
  },

  // ── SECURITY & GOVERNANCE ──
  {
    name: "Authentification JWT & Refresh Tokens",
    category: "security",
    status: "implemented",
    description: "Gestion des sessions avec rotation des tokens, hachage bcrypt et révocation sécurisée.",
    techStack: "FastAPI Security + JWT + Passlib",
  },
  {
    name: "Contrôle d'Accès par Rôle (RBAC)",
    category: "security",
    status: "implemented",
    description: "Rôles Admin, Manager et User avec permissions granulaires par base de connaissances.",
    techStack: "PostgreSQL RBAC Schema",
  },
  {
    name: "Gestion des Clés d'API & Workspaces",
    category: "security",
    status: "implemented",
    description: "Création de clés d'API avec préfixe sécurisé, révocation instantanée et isolation des espaces.",
    techStack: "API Key Auth Middleware",
  },
  {
    name: "Réponses Vérifiées & Feedback Loop",
    category: "security",
    status: "implemented",
    description: "Validation manuelle des réponses expertes qui deviennent prioritaires pour les questions futures.",
    techStack: "Verified Answers Knowledge Store",
  },
  {
    name: "SSO Entreprise (SAML 2.0 / Okta / Azure AD)",
    category: "security",
    status: "roadmap",
    description: "Intégration d'annuaires d'entreprise avec authentification unique et provisioning SCIM.",
    techStack: "SAML 2.0 / OpenID Connect",
  },
  {
    name: "Déploiement Kubernetes & Helm Charts",
    category: "infra",
    status: "roadmap",
    description: "Packaging de production avec autoscaling horizontal (HPA) pour Celery et FastAPI.",
    techStack: "Kubernetes + Helm + Keda",
  },
];

export function LandingPage() {
  const { session } = useAuth();
  const [activeScenarioId, setActiveScenarioId] = useState("finance");
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "implemented" | "roadmap">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  const activeScenario = DEMO_SCENARIOS.find((s) => s.id === activeScenarioId) || DEMO_SCENARIOS[0];

  const filteredFeatures = FEATURE_STATUS_ITEMS.filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  const implementedCount = FEATURE_STATUS_ITEMS.filter((f) => f.status === "implemented").length;
  const roadmapCount = FEATURE_STATUS_ITEMS.filter((f) => f.status === "roadmap").length;

  return (
    <div className="min-h-screen bg-[#fafbfa] text-[#28264B] flex flex-col font-sans selection:bg-[#AA0033]/20 selection:text-[#28264B] overflow-x-hidden antialiased">
      {/* ───── Subtle Brand Ambient Lighting with Palette Colors ───── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-to-b from-[#959EC9]/20 via-[#E8EAE7]/40 to-transparent blur-3xl" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#AA0033]/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/3 left-0 w-[500px] h-[500px] bg-[#28264B]/5 rounded-full blur-[140px] pointer-events-none" />
      </div>

      {/* ───── Header / Navigation ───── */}
      <header className="sticky top-0 z-50 w-full bg-[#fafbfa]/90 backdrop-blur-md border-b border-[#dcdfd9] transition-all">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-3.5 group">
              <SmartRAGLogoMark size={44} className="transition-transform duration-200 group-hover:scale-105" />
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-[#28264B]">
                  Smart<span className="text-[#AA0033]">RAG</span>
                </span>
                <span className="text-[10px] font-bold text-[#4E5174] tracking-wider uppercase">
                  Enterprise RAG Engine
                </span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-[#4E5174]">
              <a href="#demo" className="hover:text-[#AA0033] transition-colors">
                Démonstration
              </a>
              <a href="#status-matrix" className="hover:text-[#AA0033] transition-colors flex items-center gap-1.5">
                <span>Statut Réel</span>
                <span className="bg-[#AA0033]/10 text-[#AA0033] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#AA0033]/20">
                  {implementedCount} OK
                </span>
              </a>
              <a href="#pipeline" className="hover:text-[#AA0033] transition-colors">
                Architecture
              </a>
              <a href="#features" className="hover:text-[#AA0033] transition-colors">
                Fonctionnalités
              </a>
              <a href="#comparison" className="hover:text-[#AA0033] transition-colors">
                Comparatif
              </a>
              <a href="#api" className="hover:text-[#AA0033] transition-colors">
                API & Stack
              </a>
              <a href="#faq" className="hover:text-[#AA0033] transition-colors">
                FAQ
              </a>
            </nav>
          </div>

          {/* Header Action CTAs */}
          <div className="flex items-center gap-3">
            {session ? (
              <Link
                to="/dashboard"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#28264B] px-5 text-sm font-semibold text-white transition-all duration-150 hover:bg-[#34325a] shadow-xs"
              >
                Mon espace <ArrowRight className="size-4 text-[#959EC9]" />
              </Link>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="hidden sm:inline-flex text-sm font-semibold text-[#4E5174] hover:text-[#28264B] transition-colors px-3.5 py-2"
                >
                  Connexion
                </Link>
                <Link
                  to="/auth/register"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#AA0033] px-5 text-sm font-bold text-white transition-all duration-150 hover:bg-[#880029] shadow-sm hover:shadow-[#AA0033]/25"
                >
                  Démarrer <ChevronRight className="size-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10">
        {/* ───── Hero Section ───── */}
        <section className="relative pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="mx-auto max-w-5xl px-6 text-center">
            {/* Version & Status Pill */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[#dcdfd9] bg-[#E8EAE7]/70 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-[#28264B] mb-8 shadow-2xs">
              <span className="flex size-2 rounded-full bg-[#AA0033] animate-pulse" />
              <span className="font-bold">SmartRAG Production Platform</span>
              <span className="text-[#959EC9]">•</span>
              <span className="text-[#4E5174] font-medium">Recherche Hybride pgvector + BM25 & Celery Async</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#28264B] leading-[1.14] mb-6">
              Connectez vos documents d'entreprise.{" "}
              <span className="text-[#AA0033] block sm:inline">
                Obtenez des réponses sourcées et vérifiables.
              </span>
            </h1>

            {/* Subtitle with Real Architecture Context */}
            <p className="mx-auto max-w-3xl text-lg sm:text-xl text-[#4E5174] leading-relaxed mb-10 font-normal">
              Plateforme RAG complète et modulaire : ingestion asynchrone MinIO/Celery, recherche hybride combinant similarité vectorielle cosinus et BM25, reranking cross-encoder, citations précises avec pages et évaluation continue de fidélité.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center mb-12">
              <Link
                to={session ? "/dashboard" : "/auth/register"}
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#28264B] px-8 text-base font-bold text-white transition-all duration-150 hover:bg-[#34325a] shadow-md hover:shadow-lg"
              >
                {session ? "Accéder à l'espace" : "Explorer l'espace de travail"}
                <ArrowRight className="size-4 text-[#959EC9]" />
              </Link>
              <a
                href="#demo"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#dcdfd9] bg-white px-7 text-base font-semibold text-[#28264B] transition-all duration-150 hover:bg-[#E8EAE7]/50 hover:border-[#959EC9]"
              >
                <Sparkles className="size-4 text-[#AA0033]" />
                Tester la démo interactive
              </a>
            </div>

            {/* Key Fact Badges using Palette Tones */}
            <div className="flex flex-wrap items-center justify-center gap-y-2.5 gap-x-8 text-xs sm:text-sm font-medium text-[#4E5174]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#AA0033]" />
                <span>Zero Data Training (100% privé)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#AA0033]" />
                <span>Citations & Extraits vérifiables</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#AA0033]" />
                <span>Contrôle RBAC & Clés d'API</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#AA0033]" />
                <span>Évaluation automatique Recall@K</span>
              </div>
            </div>
          </div>
        </section>

        {/* ───── INTERACTIVE DEMO / PLAYGROUND ───── */}
        <section id="demo" className="py-14 md:py-20 scroll-mt-24 bg-[#f2f4f2] border-y border-[#dcdfd9]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-10">
              <span className="text-xs font-bold text-[#AA0033] uppercase tracking-wider mb-2 block">
                Démonstration Interactive
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#28264B] tracking-tight">
                Traitement en direct par le pipeline hybride
              </h2>
              <p className="text-sm sm:text-base text-[#4E5174] max-w-xl mx-auto mt-2">
                Sélectionnez un cas d'usage pour observer la recherche dense, sparse BM25, la fusion RRF, le reranking et la réponse citée.
              </p>
            </div>

            {/* Playground Box */}
            <div className="rounded-2xl border border-[#dcdfd9] bg-white shadow-xl overflow-hidden">
              {/* Presets Header Bar */}
              <div className="border-b border-[#dcdfd9] bg-[#E8EAE7]/80 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[#4E5174] mr-1 hidden sm:inline">Exemples réels :</span>
                  {DEMO_SCENARIOS.map((scenario) => {
                    const isActive = scenario.id === activeScenarioId;
                    return (
                      <button
                        key={scenario.id}
                        onClick={() => setActiveScenarioId(scenario.id)}
                        className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? "bg-[#28264B] text-white shadow-xs"
                            : "bg-white text-[#4E5174] hover:bg-[#fafbfa] border border-[#dcdfd9] hover:text-[#28264B]"
                        }`}
                      >
                        {scenario.category}
                      </button>
                    );
                  })}
                </div>

                {/* Telemetry info */}
                <div className="flex items-center gap-3 text-xs font-mono text-[#4E5174]">
                  <span className="flex items-center gap-1.5 bg-white text-[#AA0033] px-2.5 py-1 rounded-md border border-[#AA0033]/30 font-semibold shadow-2xs">
                    <Zap className="size-3 text-[#AA0033]" /> ~{activeScenario.latencyMs} ms
                  </span>
                  <span className="flex items-center gap-1.5 bg-white text-[#28264B] px-2.5 py-1 rounded-md border border-[#959EC9] font-semibold shadow-2xs">
                    <Gauge className="size-3 text-[#959EC9]" /> Similarité {activeScenario.similarityScore}
                  </span>
                </div>
              </div>

              {/* Demo Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#dcdfd9]">
                {/* Left Side: Pipeline Steps (5 cols) */}
                <div className="lg:col-span-5 p-6 bg-[#fafbfa] flex flex-col justify-between">
                  <div>
                    {/* User Question */}
                    <div className="mb-6">
                      <label className="text-[11px] font-bold text-[#4E5174] uppercase tracking-wider block mb-2">
                        Question posée
                      </label>
                      <div className="rounded-lg border border-[#dcdfd9] bg-white p-3.5 text-sm font-medium text-[#28264B] shadow-2xs flex items-start gap-2.5">
                        <MessageSquare className="size-4 text-[#AA0033] shrink-0 mt-0.5" />
                        <span>{activeScenario.query}</span>
                      </div>
                    </div>

                    {/* Pipeline Stages */}
                    <div>
                      <label className="text-[11px] font-bold text-[#4E5174] uppercase tracking-wider block mb-2.5">
                        Étapes de recherche & Fusion
                      </label>
                      <div className="space-y-2.5">
                        {activeScenario.retrievalStages.map((stage, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-[#dcdfd9] bg-white p-3 text-xs flex flex-col gap-1 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#28264B] flex items-center gap-1.5">
                                <span className="flex size-4 items-center justify-center rounded-full bg-[#28264B] text-[10px] font-bold text-white">
                                  {idx + 1}
                                </span>
                                {stage.name}
                              </span>
                              <span className="font-mono text-[#AA0033] bg-[#AA0033]/10 px-1.5 py-0.5 rounded text-[11px] font-bold">
                                {stage.score}
                              </span>
                            </div>
                            <p className="text-[#4E5174] text-[11px] pl-5.5">{stage.details}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Document Reference */}
                  <div className="mt-6 pt-4 border-t border-[#dcdfd9] flex items-center justify-between text-xs text-[#4E5174]">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-[#28264B]" />
                      <div>
                        <p className="font-bold text-[#28264B]">{activeScenario.docSource}</p>
                        <p className="text-[11px] text-[#4E5174]">{activeScenario.docPage}</p>
                      </div>
                    </div>
                    <span className="bg-[#E8EAE7] text-[#28264B] px-2 py-0.5 rounded text-[11px] font-medium border border-[#dcdfd9]">
                      {activeScenario.chunksFound} passages indexés
                    </span>
                  </div>
                </div>

                {/* Right Side: Answer & Grounding (7 cols) */}
                <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-white">
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-[#28264B] text-white">
                          <Brain className="size-4 text-[#959EC9]" />
                        </div>
                        <span className="font-bold text-sm text-[#28264B]">Réponse générée (Grounded)</span>
                      </div>
                      <span className="text-xs font-mono text-[#AA0033] bg-[#AA0033]/10 border border-[#AA0033]/20 px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-[#AA0033]" />
                        100% Citée
                      </span>
                    </div>

                    {/* Answer Display */}
                    <div className="rounded-xl border border-[#dcdfd9] bg-[#fafbfa] p-4 text-sm text-[#28264B] leading-relaxed mb-5 shadow-2xs">
                      {activeScenario.answer}
                    </div>

                    {/* Grounding Excerpt */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#28264B] mb-2">
                        <FileCheck className="size-4 text-[#AA0033]" />
                        <span>Passage brut extrait du document source :</span>
                      </div>
                      <div className="rounded-lg bg-[#E8EAE7]/60 border border-[#dcdfd9] p-3.5 text-xs font-mono text-[#28264B] leading-relaxed italic border-l-4 border-l-[#AA0033]">
                        {activeScenario.citationExcerpt}
                      </div>
                    </div>
                  </div>

                  {/* Footer inside playground */}
                  <div className="mt-6 pt-4 border-t border-[#dcdfd9] flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] text-[#4E5174]">
                      Moteur : <span className="font-bold text-[#28264B]">BM25 + pgvector + Rerank Cross-Encoder</span>
                    </div>
                    <Link
                      to={session ? "/dashboard" : "/auth/register"}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#AA0033] hover:text-[#880029] transition-colors"
                    >
                      Essayer avec vos propres fichiers <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── FEATURE IMPLEMENTATION MATRIX (REEL & ROADMAP) ───── */}
        <section id="status-matrix" className="py-20 md:py-24 bg-white scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-12">
              <span className="text-xs font-bold text-[#AA0033] uppercase tracking-wider mb-2 block">
                Transparence Technique & Feuille de Route
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#28264B]">
                État réel des fonctionnalités de la plateforme
              </h2>
              <p className="text-base text-[#4E5174] max-w-2xl mx-auto mt-3">
                Consultez ce qui est <strong>100% implémenté, testé et déployé</strong> dans notre codebase vs ce qui est planifié dans notre roadmap future.
              </p>
            </div>

            {/* Filter Pills Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-[#f2f4f2] p-3 rounded-xl border border-[#dcdfd9]">
              {/* Status Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-[#28264B] text-white shadow-xs"
                      : "bg-white text-[#4E5174] hover:text-[#28264B] border border-[#dcdfd9]"
                  }`}
                >
                  Toutes ({FEATURE_STATUS_ITEMS.length})
                </button>
                <button
                  onClick={() => setStatusFilter("implemented")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === "implemented"
                      ? "bg-[#AA0033] text-white shadow-xs"
                      : "bg-white text-[#4E5174] hover:text-[#AA0033] border border-[#dcdfd9]"
                  }`}
                >
                  <span className="size-2 rounded-full bg-[#15803d]" />
                  Opérationnel ({implementedCount})
                </button>
                <button
                  onClick={() => setStatusFilter("roadmap")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === "roadmap"
                      ? "bg-[#4E5174] text-white shadow-xs"
                      : "bg-white text-[#4E5174] hover:text-[#4E5174] border border-[#dcdfd9]"
                  }`}
                >
                  <span className="size-2 rounded-full bg-[#b45309]" />
                  À implémenter / Roadmap ({roadmapCount})
                </button>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-[#4E5174] hidden sm:inline">Module :</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-[#dcdfd9] bg-white px-3 py-1.5 font-semibold text-[#28264B] focus:border-[#AA0033] focus:outline-none"
                >
                  <option value="all">Tous les modules</option>
                  <option value="ingestion">Ingestion & MinIO</option>
                  <option value="retrieval">Recherche & Reranking</option>
                  <option value="generation">Génération & Citations</option>
                  <option value="eval">Évaluation & Observabilité</option>
                  <option value="security">Sécurité & RBAC</option>
                  <option value="infra">Infrastructure & DevOps</option>
                </select>
              </div>
            </div>

            {/* Grid of Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredFeatures.map((item, idx) => {
                const isImpl = item.status === "implemented";
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                      isImpl
                        ? "bg-white border-[#dcdfd9] hover:border-[#959EC9]"
                        : "bg-[#fafbfa] border-dashed border-[#959EC9]/70 hover:border-[#4E5174]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isImpl
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              isImpl ? "bg-emerald-600" : "bg-amber-500"
                            }`}
                          />
                          {isImpl ? "Implémenté (Prêt)" : "Roadmap future"}
                        </span>
                        <span className="text-[10px] font-mono text-[#4E5174] uppercase tracking-wider">
                          {item.category}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-[#28264B] mb-2">{item.name}</h3>
                      <p className="text-xs text-[#4E5174] leading-relaxed mb-4">{item.description}</p>
                    </div>

                    <div className="pt-3 border-t border-[#dcdfd9] flex items-center justify-between text-[11px]">
                      <span className="font-mono font-medium text-[#4E5174] truncate max-w-[200px]">
                        {item.techStack}
                      </span>
                      {isImpl ? (
                        <Check className="size-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Clock className="size-4 text-amber-600 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───── ARCHITECTURE IN 4 STEPS ───── */}
        <section id="pipeline" className="py-20 md:py-24 scroll-mt-20 bg-[#f2f4f2] border-t border-[#dcdfd9]">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-16">
              <span className="text-xs font-bold text-[#AA0033] uppercase tracking-wider mb-2 block">
                Architecture Technique
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#28264B] mb-3">
                Fonctionnement du pipeline RAG de production
              </h2>
              <p className="text-base text-[#4E5174] max-w-2xl mx-auto leading-relaxed">
                Une chaîne de traitement robuste en 4 étapes pour transformer vos documents bruts en connaissances indexées et vérifiables.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: "01",
                  icon: FolderSync,
                  title: "Découpage & MinIO",
                  desc: "Extraction du texte brut, validation de sécurité et découpage en segments (chunks) avec stockage MinIO S3.",
                },
                {
                  step: "02",
                  icon: Layers,
                  title: "Indexation Hybride",
                  desc: "Génération simultanée des vecteurs denses pgvector et de l'index BM25 lexical pour capturer sens et mots exacts.",
                },
                {
                  step: "03",
                  icon: Sliders,
                  title: "Fusion RRF & Reranking",
                  desc: "Combinaison Reciprocal Rank Fusion et réordonnancement Cross-Encoder pour éliminer le bruit documentaire.",
                },
                {
                  step: "04",
                  icon: ShieldCheck,
                  title: "Génération avec Citations",
                  desc: "Le LLM formule la réponse en s'appuyant strictement sur les passages et cite explicitement les pages sources.",
                },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#dcdfd9] bg-white p-6 shadow-xs flex flex-col justify-between hover:border-[#959EC9] transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-[#28264B] text-white font-bold text-sm">
                        {step.step}
                      </span>
                      <step.icon className="size-5 text-[#AA0033]" />
                    </div>
                    <h3 className="font-bold text-base text-[#28264B] mb-2">{step.title}</h3>
                    <p className="text-xs sm:text-sm text-[#4E5174] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── TABBED FEATURES ───── */}
        <section id="features" className="py-20 md:py-24 bg-white scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-12">
              <span className="text-xs font-bold text-[#AA0033] uppercase tracking-wider mb-2 block">
                Fonctionnalités Clés
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#28264B]">
                Outils pour vos équipes et vos ingénieurs
              </h2>
            </div>

            {/* Feature Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {[
                { label: "Chat & Citations", icon: MessageSquare },
                { label: "Permissions & Rôles", icon: Shield },
                { label: "Métriques & Évaluation", icon: BarChart3 },
                { label: "API REST & Webhooks", icon: Code2 },
              ].map((tab, i) => {
                const isActive = activeFeatureTab === i;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveFeatureTab(i)}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#28264B] text-white shadow-xs"
                        : "bg-[#E8EAE7]/70 text-[#4E5174] hover:bg-[#E8EAE7] border border-[#dcdfd9]"
                    }`}
                  >
                    <tab.icon className={`size-4 ${isActive ? "text-[#AA0033]" : "text-[#4E5174]"}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="rounded-2xl border border-[#dcdfd9] bg-[#fafbfa] p-6 md:p-10 shadow-sm">
              {activeFeatureTab === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-[#28264B] mb-3">
                      Dialogue assisté avec citations vérifiables
                    </h3>
                    <p className="text-sm text-[#4E5174] leading-relaxed mb-5">
                      Les utilisateurs peuvent interroger leurs documents en langage naturel. Chaque réponse inclut les liens vers les extraits exacts pour faciliter la vérification humaine.
                    </p>
                    <ul className="space-y-2.5 text-sm text-[#28264B]">
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-[#AA0033] shrink-0" />
                        Historique multi-tours pour affiner la recherche
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-[#AA0033] shrink-0" />
                        Affichage des passages sources et du score de pertinence
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-[#AA0033] shrink-0" />
                        Réponses en streaming pour un affichage instantané
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-xl bg-white border border-[#dcdfd9] p-5 shadow-xs space-y-3">
                    <div className="text-xs text-[#4E5174] font-mono pb-2 border-b border-[#dcdfd9]">
                      Session #402 — Base Finance & RH
                    </div>
                    <div className="text-xs text-[#28264B] bg-[#fafbfa] p-3 rounded-lg border border-[#dcdfd9] leading-relaxed">
                      « La politique de télétravail international autorise jusqu'à 30 jours ouvrés par an sous réserve d'ancienneté de 6 mois. [Doc: Accord_RH_2024.pdf] »
                    </div>
                    <div className="text-[11px] text-[#AA0033] bg-[#AA0033]/10 p-2.5 rounded-lg border border-[#AA0033]/20 font-medium">
                      Extrait source : « Art 4.1.3 : La mobilité internationale temporaire est accessible sous réserve de validation managériale. »
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-[#28264B] mb-3">
                      Gestion des accès et isolation des bases
                    </h3>
                    <p className="text-sm text-[#4E5174] leading-relaxed mb-5">
                      Définissez des espaces de connaissances séparés pour chaque équipe (Juridique, Finance, Ingénierie) avec des droits de lecture et d'administration distincts.
                    </p>
                    <ul className="space-y-2.5 text-sm text-[#28264B]">
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-[#AA0033] shrink-0" />
                        Cloisonnement strict des documents par collection
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-[#AA0033] shrink-0" />
                        Rôles administrateur, éditeur et lecteur
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-[#AA0033] shrink-0" />
                        Journalisation des requêtes pour l'audit interne
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-xl bg-[#28264B] text-white p-5 font-mono text-xs shadow-xs space-y-2">
                    <div className="text-[#959EC9] font-semibold">// Configuration d'accès par collection</div>
                    <div className="text-[#E8EAE7]">
                      {`{
  "collection": "documents_juridiques",
  "allowed_roles": ["legal_team", "compliance_officer"],
  "allow_export": false,
  "audit_logging": true
}`}
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-[#28264B] mb-3">
                      Évaluation continue & Observabilité
                    </h3>
                    <p className="text-sm text-[#4E5174] leading-relaxed mb-5">
                      Mesurez la performance avec notre suite d'évaluation intégrée (Recall@K, MRR, Faithfulness LLM-Judge) et visualisez les métriques Prometheus en temps réel.
                    </p>
                    <ul className="space-y-2.5 text-sm text-[#28264B]">
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-[#AA0033] shrink-0" />
                        Recall@K & Precision@K automatiques
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-[#AA0033] shrink-0" />
                        Détection automatique d'hallucinations par LLM Judge
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-[#AA0033] shrink-0" />
                        Export Prometheus & Dashboards Grafana pré-configurés
                      </li>
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-xl border border-[#dcdfd9] text-center shadow-2xs">
                      <p className="text-xs font-bold text-[#4E5174] uppercase">Recall@5 Moyen</p>
                      <p className="text-2xl font-extrabold text-[#28264B] my-1">94.2%</p>
                      <p className="text-[11px] text-[#AA0033] font-semibold">Hybride BM25 + Vector</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-[#dcdfd9] text-center shadow-2xs">
                      <p className="text-xs font-bold text-[#4E5174] uppercase">Faithfulness Score</p>
                      <p className="text-2xl font-extrabold text-[#28264B] my-1">0.96 / 1.0</p>
                      <p className="text-[11px] text-emerald-700 font-semibold">LLM-as-a-Judge</p>
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-[#28264B] mb-3">
                      Intégration par API REST FastAPI
                    </h3>
                    <p className="text-sm text-[#4E5174] leading-relaxed mb-5">
                      Connectez SmartRAG à vos outils métiers via des endpoints REST documentés OpenAPI pour interroger vos bases ou déclencher des indexations automatiques.
                    </p>
                    <ul className="space-y-2.5 text-sm text-[#28264B]">
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-[#AA0033] shrink-0" />
                        Endpoints pour l'ingestion de fichiers et la recherche
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-[#AA0033] shrink-0" />
                        Authentification par clé d'API et jeton JWT
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-[#AA0033] shrink-0" />
                        Support du streaming SSE (Server-Sent Events)
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-xl bg-[#28264B] text-white p-4 font-mono text-xs overflow-x-auto shadow-xs">
                    <div className="text-[#959EC9] mb-2">// Requête de recherche sur une base</div>
                    <div className="text-[#E8EAE7]">
                      {`POST /api/chat/query
Headers: { "Authorization": "Bearer rag_sk_..." }
Body: {
  "knowledgeBaseId": "kb_finance_2024",
  "query": "Quel est le résultat net ?",
  "topK": 4,
  "hybrid": true
}`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ───── COMPARISON TABLE ───── */}
        <section id="comparison" className="py-20 md:py-24 bg-[#f2f4f2] border-t border-[#dcdfd9] scroll-mt-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center mb-14">
              <span className="text-xs font-bold text-[#AA0033] uppercase tracking-wider mb-2 block">
                Comparatif des Approches
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#28264B] mb-3">
                SmartRAG comparé aux méthodes classiques
              </h2>
              <p className="text-base text-[#4E5174] max-w-xl mx-auto">
                Pourquoi l'hybridation (vecteur + mots-clés BM25 + re-ranking) offre une meilleure précision sur les documents d'entreprise.
              </p>
            </div>

            <div className="rounded-xl border border-[#dcdfd9] bg-white shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#dcdfd9] bg-[#E8EAE7]/70">
                      <th className="p-4 sm:p-5 text-xs sm:text-sm font-bold text-[#28264B]">Critère</th>
                      <th className="p-4 sm:p-5 text-xs sm:text-sm font-bold text-[#AA0033] bg-[#AA0033]/5">
                        SmartRAG Hybride
                      </th>
                      <th className="p-4 sm:p-5 text-xs sm:text-sm font-semibold text-[#4E5174]">
                        RAG Vectoriel Seul
                      </th>
                      <th className="p-4 sm:p-5 text-xs sm:text-sm font-semibold text-[#4E5174]">
                        Recherche Mots-Clés
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dcdfd9] text-xs sm:text-sm">
                    {[
                      {
                        label: "Méthode d'indexation",
                        smartrag: "Dense (pgvector) + Sparse (BM25)",
                        naive: "Vecteurs uniquement",
                        keyword: "Index textuel seul",
                      },
                      {
                        label: "Termes exacts & références",
                        smartrag: "Très précis (grâce au BM25)",
                        naive: "Parfois ignorés par la sémantique",
                        keyword: "Précis sur mots exacts",
                      },
                      {
                        label: "Re-ranking",
                        smartrag: "Cross-Encoder + LLM Rerank",
                        naive: "Aucun re-ranking",
                        keyword: "Score lexical basique",
                      },
                      {
                        label: "Citations des sources",
                        smartrag: "Directes avec passage et page",
                        naive: "Génériques ou manquantes",
                        keyword: "Liens documents bruts",
                      },
                      {
                        label: "Contrôle des accès",
                        smartrag: "Par base de connaissances et RBAC",
                        naive: "Généralement non intégré",
                        keyword: "Permissions de fichiers",
                      },
                      {
                        label: "Évaluation intégrée",
                        smartrag: "Recall@K, MRR + LLM Judge",
                        naive: "Non disponible",
                        keyword: "Non disponible",
                      },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#fafbfa] transition-colors">
                        <td className="p-4 sm:p-5 font-semibold text-[#28264B]">{row.label}</td>
                        <td className="p-4 sm:p-5 font-bold text-[#AA0033] bg-[#AA0033]/5 flex items-center gap-1.5">
                          <Check className="size-4 text-[#AA0033] shrink-0" />
                          <span>{row.smartrag}</span>
                        </td>
                        <td className="p-4 sm:p-5 text-[#4E5174]">{row.naive}</td>
                        <td className="p-4 sm:p-5 text-[#4E5174]">{row.keyword}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ───── API & TECHNICAL STACK ───── */}
        <section id="api" className="py-20 md:py-24 bg-white scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6">
                <span className="text-xs font-bold text-[#AA0033] uppercase tracking-wider mb-2 block">
                  Infrastructure & Stack
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#28264B] mb-4">
                  Construit sur les meilleurs composants open-source
                </h2>
                <p className="text-base text-[#4E5174] leading-relaxed mb-6">
                  Une architecture modulaire et conteneurisée, testée en continu et prête pour le déploiement sur votre infrastructure privée ou cloud.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="rounded-lg border border-[#dcdfd9] bg-[#fafbfa] p-4">
                    <Server className="size-5 text-[#28264B] mb-2" />
                    <h4 className="font-bold text-sm text-[#28264B] mb-1">FastAPI & Python 3.11</h4>
                    <p className="text-xs text-[#4E5174]">API asynchrone haute performance et validation Pydantic v2.</p>
                  </div>
                  <div className="rounded-lg border border-[#dcdfd9] bg-[#fafbfa] p-4">
                    <Database className="size-5 text-[#28264B] mb-2" />
                    <h4 className="font-bold text-sm text-[#28264B] mb-1">PostgreSQL & pgvector</h4>
                    <p className="text-xs text-[#4E5174]">Indexation vectorielle et relationnelle robuste avec ACID.</p>
                  </div>
                  <div className="rounded-lg border border-[#dcdfd9] bg-[#fafbfa] p-4">
                    <Boxes className="size-5 text-[#28264B] mb-2" />
                    <h4 className="font-bold text-sm text-[#28264B] mb-1">Celery + Redis</h4>
                    <p className="text-xs text-[#4E5174]">Traitement asynchrone des uploads et cache d'embeddings.</p>
                  </div>
                  <div className="rounded-lg border border-[#dcdfd9] bg-[#fafbfa] p-4">
                    <Activity className="size-5 text-[#28264B] mb-2" />
                    <h4 className="font-bold text-sm text-[#28264B] mb-1">Prometheus & Grafana</h4>
                    <p className="text-xs text-[#4E5174]">Métriques de latence, RPS et dashboards de surveillance.</p>
                  </div>
                </div>
              </div>

              {/* Code Snippet Box */}
              <div className="lg:col-span-6">
                <div className="rounded-2xl bg-[#28264B] p-6 text-white shadow-xl space-y-4 border border-[#4E5174]">
                  <div className="flex items-center justify-between border-b border-[#4E5174] pb-3 text-xs font-mono">
                    <span className="text-[#959EC9] flex items-center gap-2">
                      <Terminal className="size-4 text-[#AA0033]" /> FastAPI Endpoint
                    </span>
                    <span className="text-[#E8EAE7]/60">POST /api/retrieval/search</span>
                  </div>
                  <pre className="text-xs font-mono text-[#E8EAE7] leading-relaxed overflow-x-auto">
{`# Recherche Hybride avec RRF Fusion
response = await client.post(
    "/api/retrieval/search",
    headers={"Authorization": f"Bearer {api_key}"},
    json={
        "knowledge_base_id": "kb_finance_2024",
        "query": "Quel est le résultat net consolidé ?",
        "mode": "hybrid",       # dense + bm25
        "rerank": True,          # cross-encoder
        "top_k": 4
    }
)
# Result: {
#   "documents": [...],
#   "scores": {"dense": 0.94, "bm25": 0.89, "rrf": 0.98},
#   "latency_ms": 245
# }`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── FAQ SECTION ───── */}
        <section id="faq" className="py-20 md:py-24 bg-[#f2f4f2] border-t border-[#dcdfd9] scroll-mt-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center mb-12">
              <span className="text-xs font-bold text-[#AA0033] uppercase tracking-wider mb-2 block">
                Foire Aux Questions
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#28264B]">
                Questions Fréquentes
              </h2>
            </div>

            <div className="space-y-3">
              {[
                {
                  q: "Qu'est-ce qui différencie SmartRAG d'un RAG basique ?",
                  a: "SmartRAG intègre nativement une recherche hybride (dense vectorielle + sparse BM25) combinée par Reciprocal Rank Fusion (RRF) et un re-ranker Cross-Encoder. Il inclut également le traitement asynchrone Celery/Redis, une suite d'évaluation (Recall@K, MRR, LLM Judge) et des métriques Prometheus.",
                },
                {
                  q: "Quelles fonctionnalités sont actuellement opérationnelles ?",
                  a: "L'authentification JWT & RBAC, l'ingestion MinIO (PDF, TXT, MD, DOCX), le chunking, la recherche hybride pgvector + BM25, le re-ranking, les citations directes, l'évaluation de qualité et les dashboards Grafana sont 100% implémentés et testés.",
                },
                {
                  q: "Quelles sont les prochaines fonctionnalités en cours (Roadmap) ?",
                  a: "Le backlog futur comprend l'OCR avancé pour documents manuscrits, les connecteurs directs Cloud (Google Drive, Notion, Confluence), le SSO SAML 2.0 / Okta et les Helm Charts pour déploiement Kubernetes.",
                },
                {
                  q: "Mes données documentaires sont-elles utilisées pour l'entraînement d'IA ?",
                  a: "Non. Aucune donnée d'entreprise n'est partagée ni utilisée pour l'entraînement de modèles tiers. Toutes les indexations restent isolées dans votre base de données PostgreSQL chiffrée.",
                },
              ].map((item, index) => {
                const isOpen = faqOpenIndex === index;
                return (
                  <div
                    key={index}
                    className="rounded-xl border border-[#dcdfd9] bg-white overflow-hidden shadow-2xs"
                  >
                    <button
                      onClick={() => setFaqOpenIndex(isOpen ? null : index)}
                      className="w-full flex items-center justify-between p-5 text-left font-bold text-sm sm:text-base text-[#28264B] cursor-pointer hover:bg-[#fafbfa] transition-colors"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`size-4 text-[#4E5174] transition-transform duration-200 shrink-0 ml-4 ${
                          isOpen ? "rotate-180 text-[#AA0033]" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="p-5 pt-0 text-xs sm:text-sm text-[#4E5174] leading-relaxed border-t border-[#dcdfd9] bg-[#fafbfa]">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───── FINAL CTA ───── */}
        <section className="py-20 md:py-24 bg-white">
          <div className="mx-auto max-w-5xl px-6">
            <div className="rounded-2xl bg-[#28264B] p-10 md:p-14 text-center text-white shadow-2xl relative overflow-hidden border border-[#4E5174]">
              {/* Subtle Ruby & Periwinkle gradient highlights */}
              <div className="absolute -top-24 -right-24 size-72 rounded-full bg-[#AA0033]/25 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-[#959EC9]/20 blur-3xl" />

              <div className="relative z-10 max-w-2xl mx-auto">
                <SmartRAGLogoMark size={56} className="mx-auto mb-6" />
                <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight text-white">
                  Prêt à exploiter vos documents d'entreprise ?
                </h2>
                <p className="text-[#E8EAE7]/80 text-base mb-8 leading-relaxed">
                  Créez une base de connaissances, importez vos premiers documents et posez vos questions avec citations immédiates.
                </p>
                <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center">
                  <Link
                    to={session ? "/dashboard" : "/auth/register"}
                    className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#AA0033] px-8 text-base font-bold text-white transition-all duration-150 hover:bg-[#880029] shadow-lg hover:shadow-[#AA0033]/30"
                  >
                    {session ? "Accéder à mon espace" : "Créer un compte"}
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    to="/auth/login"
                    className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#34325a] border border-[#4E5174] px-7 text-base font-semibold text-white hover:bg-[#403d6d] transition-all"
                  >
                    Se connecter
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ───── Footer ───── */}
      <footer className="border-t border-[#dcdfd9] py-12 bg-[#fafbfa] text-xs sm:text-sm text-[#4E5174]">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2 space-y-3">
            <Link to="/" className="flex items-center gap-3">
              <SmartRAGLogoMark size={36} />
              <span className="font-extrabold text-base tracking-tight text-[#28264B]">
                Smart<span className="text-[#AA0033]">RAG</span>
              </span>
            </Link>
            <p className="text-xs text-[#4E5174] max-w-sm leading-relaxed">
              Plateforme RAG de production : Ingestion MinIO/Celery, recherche hybride pgvector + BM25, reranking et citations vérifiables.
            </p>
          </div>

          {/* Nav Links */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#28264B]">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#demo" className="hover:text-[#AA0033] transition-colors">Démonstration</a></li>
              <li><a href="#status-matrix" className="hover:text-[#AA0033] transition-colors">Statut Réel</a></li>
              <li><a href="#pipeline" className="hover:text-[#AA0033] transition-colors">Architecture</a></li>
              <li><a href="#features" className="hover:text-[#AA0033] transition-colors">Fonctionnalités</a></li>
              <li><a href="#comparison" className="hover:text-[#AA0033] transition-colors">Comparatif</a></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#28264B]">Sécurité & Qualité</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#pipeline" className="hover:text-[#AA0033] transition-colors">pgvector + BM25</a></li>
              <li><a href="#pipeline" className="hover:text-[#AA0033] transition-colors">Évaluation Recall@K</a></li>
              <li><a href="#pipeline" className="hover:text-[#AA0033] transition-colors">Observabilité Prometheus</a></li>
              <li><a href="#faq" className="hover:text-[#AA0033] transition-colors">Questions fréquentes</a></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#28264B]">Accès</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/auth/login" className="hover:text-[#AA0033] transition-colors">Connexion</Link></li>
              <li><Link to="/auth/register" className="hover:text-[#AA0033] transition-colors">Création de compte</Link></li>
              <li><Link to="/dashboard" className="hover:text-[#AA0033] transition-colors">Tableau de bord</Link></li>
            </ul>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 pt-6 border-t border-[#dcdfd9] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#4E5174]">
          <p>© {new Date().getFullYear()} SmartRAG. Tous droits réservés.</p>
          <p className="font-mono text-[11px]">FastAPI • pgvector • Celery • MinIO • BM25 • RRF</p>
        </div>
      </footer>
    </div>
  );
}
