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
  Boxes
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartRAG — Plateforme RAG d'Entreprise" },
      {
        name: "description",
        content:
          "Indexation de documents d'entreprise, recherche hybride (vecteur + BM25), re-ranking et génération de réponses assistée par IA avec citations vérifiables.",
      },
    ],
  }),
  component: LandingPage,
});

/**
 * Geometric, High-Visibility SmartRAG Brand Logo Mark
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
        className="shrink-0 drop-shadow-xs"
        aria-label="SmartRAG Logo"
      >
        {/* Background Rounded Squircle */}
        <rect width="44" height="44" rx="12" fill="#0F172A" />
        
        {/* Layer 1: Base knowledge block */}
        <rect x="10" y="27" width="16" height="4.5" rx="2.25" fill="#38BDF8" fillOpacity="0.6" />
        
        {/* Layer 2: Intermediate indexed vectors */}
        <rect x="10" y="19.5" width="24" height="4.5" rx="2.25" fill="#60A5FA" />
        
        {/* Layer 3: Contextual retrieval layer */}
        <rect x="10" y="12" width="18" height="4.5" rx="2.25" fill="#FFFFFF" />
        
        {/* Active focal node */}
        <circle cx="31.5" cy="14.25" r="3.75" fill="#38BDF8" />
      </svg>
    </div>
  );
}

// Realistic enterprise scenarios
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
    latencyMs: 310,
    similarityScore: "0.94",
    chunksFound: 4,
    retrievalStages: [
      { name: "Recherche textuelle (BM25)", score: "0.88", details: "Indexation exacte des termes 'EBITDA', 'Q4 2024', 'marge opérationnelle'." },
      { name: "Recherche vectorielle dense (Embeddings)", score: "0.94", details: "Recherche de similarité cosinus dans la collection financière." },
      { name: "Re-ranking (Cross-Encoder)", score: "0.98", details: "Sélection et réordonnancement des passages les plus pertinents." },
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
    latencyMs: 275,
    similarityScore: "0.91",
    chunksFound: 3,
    retrievalStages: [
      { name: "Recherche textuelle (BM25)", score: "0.85", details: "Correspondance sur les mots-clés 'télétravail international', 'plafond'." },
      { name: "Recherche vectorielle dense (Embeddings)", score: "0.92", details: "Détection du contexte d'éligibilité et de mobilité temporaire." },
      { name: "Re-ranking (Cross-Encoder)", score: "0.97", details: "Isolement de la clause d'application 2024." },
    ],
    answer:
      "Les collaborateurs ayant validé leur période d'essai (minimum **6 mois d'ancienneté**) peuvent effectuer jusqu'à **30 jours ouvrés** par an de télétravail dans l'UE/EEE. Le plafond d'indemnité annuelle d'équipement informatique s'élève à **450 € TTC** sur justificatifs.",
    citationExcerpt:
      "« Section 4.1.3 : La mobilité internationale est plafonnée à 30 jours ouvrés annuels après validation de la hiérarchie. Prise en charge d'équipement à hauteur de 450 € TTC/an. »",
  },
  {
    id: "tech",
    category: "Documentation Technique",
    query: "Comment configurer le renouvellement automatique des certificats TLS avec cert-manager ?",
    docSource: "Guide_Securite_Kubernetes.md",
    docPage: "Chapitre 5.2 / Cert-Manager",
    latencyMs: 290,
    similarityScore: "0.96",
    chunksFound: 3,
    retrievalStages: [
      { name: "Recherche textuelle (BM25)", score: "0.90", details: "Correspondance sur 'cert-manager', 'renewBefore', 'ClusterIssuer'." },
      { name: "Recherche vectorielle dense (Embeddings)", score: "0.96", details: "Extraction de la configuration du manifeste Kubernetes." },
      { name: "Re-ranking (Cross-Encoder)", score: "0.99", details: "Priorisation du bloc YAML de configuration valide." },
    ],
    answer:
      "Dans le manifeste du certificat, spécifiez les champs `duration: 720h` (30 jours) et `renewBefore: 240h` (10 jours). Le contrôleur cert-manager déclenchera automatiquement le renouvellement auprès du `ClusterIssuer` 10 jours avant l'expiration.",
    citationExcerpt:
      "« spec:\n  duration: 720h\n  renewBefore: 240h\n  issuerRef:\n    name: letsencrypt-prod\n    kind: ClusterIssuer »",
  },
];

export function LandingPage() {
  const { session } = useAuth();
  const [activeScenarioId, setActiveScenarioId] = useState("finance");
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  const activeScenario = DEMO_SCENARIOS.find((s) => s.id === activeScenarioId) || DEMO_SCENARIOS[0];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-blue-500/20 selection:text-slate-900 overflow-x-hidden antialiased">
      {/* ───── Clean Subtle Ambient Light ───── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-blue-50/70 via-slate-50/40 to-transparent blur-2xl" />
      </div>

      {/* ───── Header / Navigation ───── */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-3.5 group">
              <SmartRAGLogoMark size={44} className="transition-transform duration-200 group-hover:scale-105" />
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  Smart<span className="text-blue-600">RAG</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                  Platforme d'entreprise
                </span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-600">
              <a href="#demo" className="hover:text-blue-600 transition-colors">
                Démonstration
              </a>
              <a href="#pipeline" className="hover:text-blue-600 transition-colors">
                Architecture
              </a>
              <a href="#features" className="hover:text-blue-600 transition-colors">
                Fonctionnalités
              </a>
              <a href="#comparison" className="hover:text-blue-600 transition-colors">
                Comparatif
              </a>
              <a href="#security" className="hover:text-blue-600 transition-colors">
                Sécurité & RGPD
              </a>
              <a href="#faq" className="hover:text-blue-600 transition-colors">
                FAQ
              </a>
            </nav>
          </div>

          {/* Header Action CTAs */}
          <div className="flex items-center gap-3">
            {session ? (
              <Link
                to="/dashboard"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition-all duration-150 hover:bg-slate-800 shadow-xs"
              >
                Mon espace <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors px-3.5 py-2"
                >
                  Connexion
                </Link>
                <Link
                  to="/auth/register"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white transition-all duration-150 hover:bg-blue-700 shadow-xs"
                >
                  Commencer <ChevronRight className="size-4" />
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
            {/* Version & Focus Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-700 mb-8 shadow-2xs">
              <span className="flex size-2 rounded-full bg-blue-600" />
              <span>SmartRAG v2.4</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 font-normal">Recherche hybride vectorielle + lexicale BM25</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12] mb-6">
              Connectez vos documents d'entreprise.{" "}
              <span className="text-blue-600 block sm:inline">
                Obtenez des réponses sourcées et vérifiables.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mx-auto max-w-3xl text-lg sm:text-xl text-slate-600 leading-relaxed mb-10 font-normal">
              SmartRAG indexe vos bases documentaires (PDF, Word, Markdown, bases de données) et combine recherche sémantique et re-ranking pour vous fournir des réponses avec citations directes vers les passages sources.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center mb-12">
              <Link
                to={session ? "/dashboard" : "/auth/register"}
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-900 px-8 text-base font-bold text-white transition-all duration-150 hover:bg-slate-800 shadow-sm"
              >
                {session ? "Accéder à l'espace" : "Créer un compte"}
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#demo"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-7 text-base font-semibold text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:text-slate-900"
              >
                <Sparkles className="size-4 text-blue-600" />
                Voir la démonstration
              </a>
            </div>

            {/* Key Fact Badges */}
            <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-8 text-xs sm:text-sm font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <Check className="size-4 text-emerald-600" />
                <span>Aucun entraînement public sur vos données</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-4 text-emerald-600" />
                <span>Citations avec pages et extraits sources</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-4 text-emerald-600" />
                <span>Contrôle d'accès par rôle (RBAC)</span>
              </div>
            </div>
          </div>
        </section>

        {/* ───── INTERACTIVE DEMO / PLAYGROUND ───── */}
        <section id="demo" className="py-12 md:py-16 scroll-mt-24 bg-slate-50 border-y border-slate-200">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-10">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 block">
                Démonstration Interactive
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Comment le pipeline traite une question
              </h2>
              <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto mt-2">
                Sélectionnez un exemple pour visualiser les étapes de recherche et le résultat généré avec sa source.
              </p>
            </div>

            {/* Playground Box */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
              {/* Presets Header Bar */}
              <div className="border-b border-slate-200 bg-slate-100/70 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 mr-1 hidden sm:inline">Exemples :</span>
                  {DEMO_SCENARIOS.map((scenario) => {
                    const isActive = scenario.id === activeScenarioId;
                    return (
                      <button
                        key={scenario.id}
                        onClick={() => setActiveScenarioId(scenario.id)}
                        className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                        }`}
                      >
                        {scenario.category}
                      </button>
                    );
                  })}
                </div>

                {/* Telemetry info */}
                <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
                  <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200 font-medium">
                    <Zap className="size-3" /> ~{activeScenario.latencyMs} ms
                  </span>
                  <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 font-medium">
                    <Gauge className="size-3" /> Similarité {activeScenario.similarityScore}
                  </span>
                </div>
              </div>

              {/* Demo Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                {/* Left Side: Steps (5 cols) */}
                <div className="lg:col-span-5 p-6 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    {/* User Question */}
                    <div className="mb-6">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Question posée
                      </label>
                      <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-sm font-medium text-slate-900 shadow-2xs flex items-start gap-2.5">
                        <MessageSquare className="size-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>{activeScenario.query}</span>
                      </div>
                    </div>

                    {/* Pipeline Stages */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
                        Étapes de recherche
                      </label>
                      <div className="space-y-2.5">
                        {activeScenario.retrievalStages.map((stage, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-slate-200 bg-white p-3 text-xs flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span className="flex size-4 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                                  {idx + 1}
                                </span>
                                {stage.name}
                              </span>
                              <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                Score : {stage.score}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px] pl-5.5">{stage.details}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Document Reference */}
                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-slate-700" />
                      <div>
                        <p className="font-semibold text-slate-800">{activeScenario.docSource}</p>
                        <p className="text-[11px] text-slate-500">{activeScenario.docPage}</p>
                      </div>
                    </div>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                      {activeScenario.chunksFound} passages indexés
                    </span>
                  </div>
                </div>

                {/* Right Side: Answer & Grounding (7 cols) */}
                <div className="lg:col-span-7 p-6 flex flex-col justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-md bg-blue-600 text-white">
                          <Brain className="size-3.5" />
                        </div>
                        <span className="font-bold text-sm text-slate-900">Réponse générée</span>
                      </div>
                      <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-600" />
                        Sourcée
                      </span>
                    </div>

                    {/* Answer Display */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800 leading-relaxed mb-5 shadow-2xs">
                      {activeScenario.answer}
                    </div>

                    {/* Grounding Excerpt */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                        <FileCheck className="size-4 text-blue-600" />
                        <span>Passage extrait du document d'origine :</span>
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-xs font-mono text-slate-700 leading-relaxed italic border-l-4 border-l-blue-600">
                        {activeScenario.citationExcerpt}
                      </div>
                    </div>
                  </div>

                  {/* Footer inside playground */}
                  <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-500">
                      Moteur : <span className="font-semibold text-slate-700">Recherche Hybride + Re-ranking</span>
                    </div>
                    <Link
                      to={session ? "/dashboard" : "/auth/register"}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Essayer avec vos documents <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── Supported Connectors & Formats ───── */}
        <section className="py-12 bg-white">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">
              Formats et sources documentaires supportés
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
              {[
                { name: "Documents PDF", sub: "OCR & Tableaux" },
                { name: "Word & Office", sub: "DOCX, XLSX, PPTX" },
                { name: "Markdown & Text", sub: "MD, TXT, HTML" },
                { name: "Notion / Confluence", sub: "Pages & Espaces" },
                { name: "Bases de données", sub: "PostgreSQL, MySQL" },
                { name: "Drive & Cloud", sub: "S3, Google Drive" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <p className="font-bold text-xs text-slate-900">{item.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── ARCHITECTURE IN 4 STEPS ───── */}
        <section id="pipeline" className="py-20 md:py-24 scroll-mt-20 bg-slate-50 border-t border-slate-200">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-16">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 block">
                Architecture Technique
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-3">
                Fonctionnement du pipeline RAG
              </h2>
              <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Une chaîne de traitement claire pour transformer vos documents bruts en connaissances exploitables et vérifiables.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: "01",
                  icon: FolderSync,
                  title: "Découpage & Ingestion",
                  desc: "Extraction du texte et découpage en segments (chunks) respectant la structure des paragraphes et des tableaux.",
                },
                {
                  step: "02",
                  icon: Layers,
                  title: "Indexation Hybride",
                  desc: "Génération simultanée d'embeddings vectoriels denses et d'un index textuel BM25 pour capturer à la fois le sens et les mots-clés exacts.",
                },
                {
                  step: "03",
                  icon: Sliders,
                  title: "Re-ranking des Passages",
                  desc: "Évaluation croisée des meilleurs résultats pour éliminer le bruit et conserver uniquement les fragments pertinents.",
                },
                {
                  step: "04",
                  icon: ShieldCheck,
                  title: "Génération avec Citations",
                  desc: "Le modèle formule la réponse en s'appuyant sur le contexte sélectionné et en référençant explicitement les sources.",
                },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm">
                        {step.step}
                      </span>
                      <step.icon className="size-5 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-base text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{step.desc}</p>
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
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 block">
                Fonctionnalités
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                Outils pour vos équipes et vos développeurs
              </h2>
            </div>

            {/* Feature Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {[
                { label: "Chat & Citations", icon: MessageSquare },
                { label: "Permissions & Rôles", icon: Shield },
                { label: "Métriques & Qualité", icon: BarChart3 },
                { label: "API REST", icon: Code2 },
              ].map((tab, i) => {
                const isActive = activeFeatureTab === i;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveFeatureTab(i)}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    <tab.icon className="size-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 md:p-10">
              {activeFeatureTab === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">
                      Dialogue assisté avec citations vérifiables
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-5">
                      Les utilisateurs peuvent interroger leurs documents en langage naturel. Chaque réponse inclut les liens vers les extraits exacts pour faciliter la vérification humaine.
                    </p>
                    <ul className="space-y-2.5 text-sm text-slate-700">
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-blue-600 shrink-0" />
                        Historique multi-tours pour affiner la recherche
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-blue-600 shrink-0" />
                        Affichage des passages sources et du score de pertinence
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-blue-600 shrink-0" />
                        Réponses en streaming pour un affichage instantané
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
                    <div className="text-xs text-slate-500 font-mono pb-2 border-b border-slate-100">
                      Session #402 — Base Finance & RH
                    </div>
                    <div className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                      « La politique de télétravail international autorise jusqu'à 30 jours ouvrés par an sous réserve d'ancienneté de 6 mois. [Doc: Accord_RH_2024.pdf] »
                    </div>
                    <div className="text-[11px] text-blue-700 bg-blue-50/80 p-2.5 rounded-lg border border-blue-100">
                      Extrait source : « Art 4.1.3 : La mobilité internationale temporaire est accessible sous réserve de validation managériale. »
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">
                      Gestion des accès et isolation des bases
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-5">
                      Définissez des espaces de connaissances séparés pour chaque équipe (Juridique, Finance, Ingénierie) avec des droits de lecture et d'administration distincts.
                    </p>
                    <ul className="space-y-2.5 text-sm text-slate-700">
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-blue-600 shrink-0" />
                        Cloisonnement strict des documents par collection
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-blue-600 shrink-0" />
                        Rôles administrateur, éditeur et lecteur
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-blue-600 shrink-0" />
                        Journalisation des requêtes pour l'audit interne
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-xl bg-slate-900 text-slate-100 p-5 font-mono text-xs shadow-xs space-y-2">
                    <div className="text-blue-400 font-semibold">// Configuration d'accès par collection</div>
                    <div className="text-slate-300">
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
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">
                      Suivi des requêtes et latence
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-5">
                      Visualisez le nombre de requêtes traitées, la latence moyenne du pipeline et le nombre de documents indexés dans chaque base.
                    </p>
                    <ul className="space-y-2.5 text-sm text-slate-700">
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-blue-600 shrink-0" />
                        Mesure de la latence de recherche et de génération
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-blue-600 shrink-0" />
                        Statistiques d'utilisation par base de connaissances
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-blue-600 shrink-0" />
                        Identification des questions sans documents correspondants
                      </li>
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase">Latence médiane</p>
                      <p className="text-2xl font-extrabold text-slate-900 my-1">~290 ms</p>
                      <p className="text-[11px] text-emerald-600 font-medium">Recherche & Re-ranking</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase">Similarité moyenne</p>
                      <p className="text-2xl font-extrabold text-slate-900 my-1">0.93</p>
                      <p className="text-[11px] text-blue-600 font-medium">Embeddings denses</p>
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">
                      Intégration par API REST
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-5">
                      Connectez SmartRAG à vos outils métiers via des endpoints REST documentés pour interroger vos bases ou déclencher des indexations automatiques.
                    </p>
                    <ul className="space-y-2.5 text-sm text-slate-700">
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-blue-600 shrink-0" />
                        Endpoints pour l'ingestion de fichiers et la recherche
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-blue-600 shrink-0" />
                        Authentification par clé d'API et jeton JWT
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-blue-600 shrink-0" />
                        Support du streaming SSE (Server-Sent Events)
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-xl bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto shadow-xs">
                    <div className="text-slate-400 mb-2">// Requête de recherche sur une base</div>
                    <div className="text-blue-300">
                      {`POST /api/query
Headers: { "Authorization": "Bearer key_..." }
Body: {
  "knowledgeBaseId": "kb_finance_2024",
  "query": "Quel est le résultat net ?",
  "topK": 3
}`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ───── COMPARISON TABLE ───── */}
        <section id="comparison" className="py-20 md:py-24 bg-slate-50 border-t border-slate-200 scroll-mt-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center mb-14">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 block">
                Comparatif des Approches
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-3">
                SmartRAG comparé aux méthodes classiques
              </h2>
              <p className="text-base text-slate-600 max-w-xl mx-auto">
                Pourquoi l'hybridation (vecteur + mots-clés + re-ranking) offre une meilleure précision sur les documents d'entreprise.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/60">
                      <th className="p-4 sm:p-5 text-xs sm:text-sm font-bold text-slate-900">Critère</th>
                      <th className="p-4 sm:p-5 text-xs sm:text-sm font-bold text-blue-700 bg-blue-50/50">
                        SmartRAG Hybride
                      </th>
                      <th className="p-4 sm:p-5 text-xs sm:text-sm font-semibold text-slate-600">
                        RAG Vectoriel Seul
                      </th>
                      <th className="p-4 sm:p-5 text-xs sm:text-sm font-semibold text-slate-600">
                        Recherche Mots-Clés
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                    {[
                      {
                        label: "Méthode d'indexation",
                        smartrag: "Dense (Vecteurs) + Sparse (BM25)",
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
                        smartrag: "Cross-Encoder dédié",
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
                        smartrag: "Par base de connaissances et rôle",
                        naive: "Généralement non intégré",
                        keyword: "Permissions de fichiers",
                      },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 sm:p-5 font-semibold text-slate-900">{row.label}</td>
                        <td className="p-4 sm:p-5 font-bold text-blue-700 bg-blue-50/30 flex items-center gap-1.5">
                          <Check className="size-4 text-emerald-600 shrink-0" />
                          <span>{row.smartrag}</span>
                        </td>
                        <td className="p-4 sm:p-5 text-slate-600">{row.naive}</td>
                        <td className="p-4 sm:p-5 text-slate-500">{row.keyword}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ───── SECURITY & RGPD ───── */}
        <section id="security" className="py-20 md:py-24 bg-white scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 block">
                  Confidentialité & Sécurité
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4">
                  Protection des données d'entreprise
                </h2>
                <p className="text-base text-slate-600 leading-relaxed mb-6">
                  Vos documents restent votre propriété exclusive. La plateforme est conçue pour respecter les exigences de confidentialité et de conformité réglementaire.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <Lock className="size-5 text-slate-800 mb-2" />
                    <h4 className="font-bold text-sm text-slate-900 mb-1">Chiffrement standard</h4>
                    <p className="text-xs text-slate-600">Données protégées au repos (AES-256) et en transit (TLS 1.3).</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <Server className="size-5 text-slate-800 mb-2" />
                    <h4 className="font-bold text-sm text-slate-900 mb-1">Hébergement maîtrisé</h4>
                    <p className="text-xs text-slate-600">Déploiement sur cloud européen ou infrastructure dédiée.</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <ShieldCheck className="size-5 text-slate-800 mb-2" />
                    <h4 className="font-bold text-sm text-slate-900 mb-1">Conformité RGPD</h4>
                    <p className="text-xs text-slate-600">Contrôle des durées de rétention et suppression sur demande.</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <Cpu className="size-5 text-slate-800 mb-2" />
                    <h4 className="font-bold text-sm text-slate-900 mb-1">Modèles au choix</h4>
                    <p className="text-xs text-slate-600">Utilisation d'APIs privées ou de modèles open-source hébergés.</p>
                  </div>
                </div>
              </div>

              {/* Information Panel */}
              <div className="lg:col-span-6">
                <div className="rounded-2xl bg-slate-900 p-8 text-white shadow-xl space-y-5 border border-slate-800">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-emerald-400 border border-slate-700">
                    <span className="size-2 rounded-full bg-emerald-400" />
                    Politique de confidentialité
                  </div>
                  <h3 className="text-xl font-bold text-white">Engagement sur vos données</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Aucune des données importées dans vos bases de connaissances ne sert à l'entraînement de modèles d'intelligence artificielle tiers.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-emerald-400" />
                      Isolation des données par organisation
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-emerald-400" />
                      Contrôle des accès basé sur les identités utilisateurs
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-emerald-400" />
                      Suppression intégrale des index à la fermeture du compte
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── FAQ SECTION ───── */}
        <section id="faq" className="py-20 md:py-24 bg-slate-50 border-t border-slate-200 scroll-mt-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center mb-12">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 block">
                Foire Aux Questions
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Questions Fréquentes
              </h2>
            </div>

            <div className="space-y-3">
              {[
                {
                  q: "Comment fonctionne la recherche hybride ?",
                  a: "La recherche hybride combine deux méthodes complémentaires : la recherche vectorielle (qui comprend le sens global et les synonymes) et la recherche textuelle BM25 (qui repère les mots-clés exacts, numéros de référence et acronymes). Les résultats sont ensuite réordonnés par un modèle de re-ranking.",
                },
                {
                  q: "Quels sont les formats de fichiers acceptés ?",
                  a: "SmartRAG accepte les fichiers PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), Markdown (.md), HTML et fichiers texte (.txt), ainsi que l'import de pages Notion ou Confluence.",
                },
                {
                  q: "Où sont stockées mes données et les vecteurs ?",
                  a: "Vos documents et embeddings vectoriels sont hébergés dans une base de données isolée et chiffrée selon les paramètres choisis lors du déploiement (cloud européen ou installation locale).",
                },
                {
                  q: "Comment tester la solution ?",
                  a: "Vous pouvez vous inscrire gratuitement, créer votre première base de connaissances et téléverser des documents pour tester la recherche et la génération de réponses.",
                },
              ].map((item, index) => {
                const isOpen = faqOpenIndex === index;
                return (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                  >
                    <button
                      onClick={() => setFaqOpenIndex(isOpen ? null : index)}
                      className="w-full flex items-center justify-between p-5 text-left font-bold text-sm sm:text-base text-slate-900 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`size-4 text-slate-500 transition-transform duration-200 shrink-0 ml-4 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="p-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
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
            <div className="rounded-2xl bg-slate-900 p-10 md:p-14 text-center text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 max-w-2xl mx-auto">
                <SmartRAGLogoMark size={56} className="mx-auto mb-6" />
                <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight text-white">
                  Prêt à exploiter vos documents d'entreprise ?
                </h2>
                <p className="text-slate-300 text-base mb-8 leading-relaxed">
                  Créez une base de connaissances, importez vos premiers documents et posez vos questions avec citations immédiates.
                </p>
                <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center">
                  <Link
                    to={session ? "/dashboard" : "/auth/register"}
                    className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 text-base font-bold text-white transition-all duration-150 hover:bg-blue-700 shadow-sm"
                  >
                    {session ? "Accéder à mon espace" : "Créer un compte"}
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    to="/auth/login"
                    className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-7 text-base font-semibold text-white hover:bg-slate-700 transition-all"
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
      <footer className="border-t border-slate-200 py-12 bg-slate-50 text-xs sm:text-sm text-slate-600">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2 space-y-3">
            <Link to="/" className="flex items-center gap-3">
              <SmartRAGLogoMark size={36} />
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                Smart<span className="text-blue-600">RAG</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Plateforme RAG d'entreprise : indexation hybride de documents, re-ranking de passages et génération de réponses avec citations vérifiables.
            </p>
          </div>

          {/* Nav Links */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#demo" className="hover:text-blue-600 transition-colors">Démonstration</a></li>
              <li><a href="#pipeline" className="hover:text-blue-600 transition-colors">Architecture</a></li>
              <li><a href="#features" className="hover:text-blue-600 transition-colors">Fonctionnalités</a></li>
              <li><a href="#comparison" className="hover:text-blue-600 transition-colors">Comparatif</a></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">Sécurité</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#security" className="hover:text-blue-600 transition-colors">RGPD & Données</a></li>
              <li><a href="#security" className="hover:text-blue-600 transition-colors">Chiffrement AES-256</a></li>
              <li><a href="#faq" className="hover:text-blue-600 transition-colors">Questions fréquentes</a></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">Accès</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/auth/login" className="hover:text-blue-600 transition-colors">Connexion</Link></li>
              <li><Link to="/auth/register" className="hover:text-blue-600 transition-colors">Création de compte</Link></li>
            </ul>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} SmartRAG. Tous droits réservés.</p>
          <p>Recherche Hybride Vectorielle & BM25</p>
        </div>
      </footer>
    </div>
  );
}
