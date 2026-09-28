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
  ChevronDown,
  Activity,
  CheckCircle2,
  Code2,
  ShieldCheck,
  Gauge,
  FileCheck,
  Share2,
  Clock,
  ExternalLink,
  Bot,
  FileSpreadsheet,
  Users,
  Briefcase,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  FolderOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartRAG — La mémoire intelligente de vos documents d'entreprise" },
      {
        name: "description",
        content:
          "Trouvez l'information exacte dans vos PDF, contrats et guides d'entreprise en quelques secondes. Des réponses fiables, sourcées et sans hallucination.",
      },
    ],
  }),
  component: LandingPage,
});

/**
 * Modern, Refined SmartRAG Brand Logo Mark
 */
function SmartRAGLogoMark({ size = 42, className = "" }: { size?: number; className?: string }) {
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
        <rect width="44" height="44" rx="12" fill="#1e1b4b" />
        <rect x="10" y="27" width="16" height="4.5" rx="2.25" fill="#818cf8" fillOpacity="0.8" />
        <rect x="10" y="19.5" width="24" height="4.5" rx="2.25" fill="#e0e7ff" fillOpacity="0.9" />
        <rect x="10" y="12" width="18" height="4.5" rx="2.25" fill="#ffffff" />
        <circle cx="31.5" cy="14.25" r="4" fill="#3b82f6" />
      </svg>
    </div>
  );
}

// Scénarios réels et concrets pour tout utilisateur (métier, RH, finance, technique)
interface DemoScenario {
  id: string;
  department: string;
  iconName: "legal" | "hr" | "finance" | "support";
  query: string;
  docTitle: string;
  docLocation: string;
  docExcerpt: string;
  answerSummary: string;
  keyTakeaway: string;
  responseTime: string;
  confidenceScore: string;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "legal",
    department: "Contrats & Juridique",
    iconName: "legal",
    query: "Quelles sont les conditions de résiliation du contrat et le préavis exigé ?",
    docTitle: "Contrat_Cadre_Prestation_2024.pdf",
    docLocation: "Page 14, Article 8.2 (Résiliation)",
    docExcerpt:
      "« Article 8.2 — Chaque partie peut résilier le présent contrat sous réserve de notifier un préavis écrit de trois (3) mois par lettre recommandée avec accusé de réception, sans pénalité financière après la première année contractuelle. »",
    answerSummary:
      "Le contrat peut être résilié avec un **préavis écrit de 3 mois** adressé par lettre recommandée. Aucune pénalité financière n'est appliquée après la première année de contrat.",
    keyTakeaway: "Préavis de 3 mois • Lettre RAR • 0 € de pénalité après 1 an",
    responseTime: "0.28 s",
    confidenceScore: "99%",
  },
  {
    id: "hr",
    department: "Ressources Humaines",
    iconName: "hr",
    query:
      "Combien de jours de télétravail par semaine sont autorisés et quel est le forfait équipement ?",
    docTitle: "Charte_RH_Teletravail_2024.docx",
    docLocation: "Section 3.1 & 4.2",
    docExcerpt:
      "« Section 3.1 : Les collaborateurs bénéficient d'un forfait de deux (2) jours de télétravail hebdomadaires fixes ou flottants. Section 4.2 : Une indemnité forfaitaire de 450 € TTC est allouée pour l'aménagement ergonomique du poste de travail. »",
    answerSummary:
      "La charte autorise **2 jours de télétravail par semaine** (fixes ou flottants). Les salariés disposent également d'une **indemnité d'équipement de 450 € TTC** pour installer leur poste à domicile.",
    keyTakeaway: "2 jours / semaine • Forfait 450 € TTC remboursé",
    responseTime: "0.22 s",
    confidenceScore: "98%",
  },
  {
    id: "finance",
    department: "Finance & Stratégie",
    iconName: "finance",
    query: "Quel est le résultat prévisionnel EBITDA pour le trimestre et l'objectif de marge ?",
    docTitle: "Rapport_Financier_Annuel.pdf",
    docLocation: "Page 38, Tableau Prévisionnel Q4",
    docExcerpt:
      "« Tableau 3.2.B — Prévisions d'exploitation : EBITDA consolidé prévisionnel fixé à 14,8 M€, soit un taux de marge opérationnelle cible de 21,4 %, sous l'effet de l'optimisation des coûts d'infrastructure. »",
    answerSummary:
      "L'EBITDA prévisionnel est estimé à **14,8 M€**, ce qui correspond à une **marge opérationnelle cible de 21,4 %**, portée par la baisse des coûts d'infrastructure.",
    keyTakeaway: "EBITDA 14,8 M€ • Marge opérationnelle 21,4%",
    responseTime: "0.25 s",
    confidenceScore: "97%",
  },
  {
    id: "support",
    department: "Opérations & Support",
    iconName: "support",
    query: "Quelle est la procédure pour déclarer un incident de sécurité de niveau critique ?",
    docTitle: "Guide_Securite_et_Conformite.pdf",
    docLocation: "Chapitre 5 — Gestion des Crises",
    docExcerpt:
      "« Chapitre 5.1 : Tout incident de sévérité P1 (Critique) doit être signalé sous 15 minutes sur le canal d'urgence #security-alert et faire l'objet d'un ticket d'astreinte auprès du RSSI. »",
    answerSummary:
      "Pour un incident critique (P1), la notification doit être faite en **moins de 15 minutes** sur le canal d'urgence `#security-alert` et escaladée immédiatement auprès du **RSSI** d'astreinte.",
    keyTakeaway: "Alerte < 15 min • Canal #security-alert • Escalade RSSI",
    responseTime: "0.19 s",
    confidenceScore: "100%",
  },
];

// Matrice claire et lisible des fonctionnalités
interface FeatureItem {
  title: string;
  category: "utilisateurs" | "securite" | "technique";
  status: "disponible" | "bientot";
  simpleDesc: string;
  benefit: string;
}

const FEATURE_ITEMS: FeatureItem[] = [
  {
    title: "Recherche en langage naturel",
    category: "utilisateurs",
    status: "disponible",
    simpleDesc: "Posez vos questions comme vous parleriez à un collègue, sans mot-clé complexe.",
    benefit: "Accessible à tous sans formation",
  },
  {
    title: "Citations & Extraits vérifiables",
    category: "utilisateurs",
    status: "disponible",
    simpleDesc:
      "Chaque affirmation affiche le document d'origine, le numéro de page et le passage exact.",
    benefit: "Zéro hallucination, confiance totale",
  },
  {
    title: "Import multi-fichiers instantané",
    category: "utilisateurs",
    status: "disponible",
    simpleDesc:
      "Déposez vos PDF, fichiers Word (.docx), Markdown ou texte brut en un simple glisser-déposer.",
    benefit: "Indexation automatique en arrière-plan",
  },
  {
    title: "Bases documentaires compartimentées",
    category: "securite",
    status: "disponible",
    simpleDesc:
      "Créez des espaces séparés par équipe (RH, Juridique, Finance, Technique) avec droits d'accès.",
    benefit: "Confidentialité garantie par service",
  },
  {
    title: "Validation des réponses expertes",
    category: "securite",
    status: "disponible",
    simpleDesc:
      "Les experts peuvent marquer des réponses comme « Référence vérifiée » pour enrichir la mémoire interne.",
    benefit: "Amélioration continue de la qualité",
  },
  {
    title: "Données 100% privées & Isolées",
    category: "securite",
    status: "disponible",
    simpleDesc: "Vos documents ne sont jamais envoyés pour entraîner des modèles publics d'IA.",
    benefit: "Conformité RGPD et secret des affaires",
  },
  {
    title: "Recherche hybride intelligente",
    category: "technique",
    status: "disponible",
    simpleDesc:
      "Combine la compréhension sémantique profonde (sens) et la recherche textuelle exacte (codes, références).",
    benefit: "Précision maximale même sur les termes rares",
  },
  {
    title: "Clés d'API & Intégrations REST",
    category: "technique",
    status: "disponible",
    simpleDesc:
      "Connectez SmartRAG à vos applications métiers grâce à notre API sécurisée haute performance.",
    benefit: "Automatisation de vos flux de travail",
  },
];

export function LandingPage() {
  const { session } = useAuth();
  const [activeScenarioId, setActiveScenarioId] = useState("legal");
  const [filterCategory, setFilterCategory] = useState<
    "all" | "utilisateurs" | "securite" | "technique"
  >("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "disponible" | "bientot">("all");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const currentScenario =
    DEMO_SCENARIOS.find((s) => s.id === activeScenarioId) || DEMO_SCENARIOS[0];

  const filteredFeatures = FEATURE_ITEMS.filter((f) => {
    const matchCat = filterCategory === "all" || f.category === filterCategory;
    const matchStat = filterStatus === "all" || f.status === filterStatus;
    return matchCat && matchStat;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col font-sans selection:bg-[#6366f1]/20 selection:text-[#1e1b4b] overflow-x-hidden antialiased">
      {/* ───── Subtle Brand Ambient Lighting ───── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-gradient-to-b from-indigo-200/40 via-blue-100/30 to-transparent blur-3xl opacity-70" />
        <div className="absolute top-1/3 right-0 w-[450px] h-[450px] bg-sky-200/30 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-[450px] h-[450px] bg-indigo-200/20 rounded-full blur-[120px] pointer-events-none" />
      </div>

      {/* ───── Header / Navigation ───── */}
      <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-3.5 group">
              <SmartRAGLogoMark
                size={42}
                className="transition-transform duration-200 group-hover:scale-105"
              />
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  Smart<span className="text-indigo-600">RAG</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                  Assistant Documentaire Entreprise
                </span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-600">
              <a href="#demo" className="hover:text-indigo-600 transition-colors">
                Démonstration
              </a>
              <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">
                Comment ça marche
              </a>
              <a href="#benefits" className="hover:text-indigo-600 transition-colors">
                Avantages Métier
              </a>
              <a href="#features" className="hover:text-indigo-600 transition-colors">
                Fonctionnalités
              </a>
              <a href="#faq" className="hover:text-indigo-600 transition-colors">
                Questions Fréquentes
              </a>
            </nav>
          </div>

          {/* Header Action CTAs */}
          <div className="flex items-center gap-3">
            {session ? (
              <Link
                to="/dashboard"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition-all duration-150 hover:bg-indigo-700 shadow-sm"
              >
                Mon espace <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-sm font-semibold text-slate-700 hover:text-indigo-600 px-3 py-2 transition-colors"
                >
                  Se connecter
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition-all duration-150 hover:bg-indigo-700 shadow-sm hover:shadow"
                >
                  Essayer maintenant <ArrowRight className="size-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10">
        {/* ───── Hero Section ───── */}
        <section className="relative px-6 pt-16 pb-20 lg:pt-24 lg:pb-28 text-center max-w-5xl mx-auto">
          {/* Trust Pill */}
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200/80 px-4 py-1.5 text-xs font-semibold text-indigo-800 mb-8 shadow-2xs">
            <span className="flex size-2 rounded-full bg-indigo-600 animate-pulse" />
            <span>La plateforme documentaire intelligente pour toute l'entreprise</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Trouvez la bonne information dans vos documents en{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 bg-clip-text text-transparent">
              1 seconde chrono.
            </span>
          </h1>

          {/* Clear, Human Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto font-normal leading-relaxed">
            Importez vos <strong>PDF, contrats, politiques RH et guides internes</strong>. SmartRAG
            répond avec précision aux questions de vos équipes en citant toujours l'extrait et la
            page exacte du document d'origine.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to={session ? "/dashboard" : "/auth"}
              className="inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-indigo-600 px-8 text-base font-bold text-white shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all duration-200"
            >
              <span>Accéder à la plateforme</span>
              <ArrowRight className="size-5" />
            </Link>

            <a
              href="#demo"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 text-base font-bold text-slate-800 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition-all duration-200"
            >
              <Eye className="size-4 text-indigo-600" />
              <span>Voir la démo interactive</span>
            </a>
          </div>

          {/* Key Value Badges */}
          <div className="mt-12 pt-8 border-t border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>Zéro hallucination</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4 text-indigo-600 shrink-0" />
              <span>Citations de pages précises</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4 text-blue-600 shrink-0" />
              <span>100% Données privées</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>Multi-formats (PDF, Word, TXT)</span>
            </div>
          </div>
        </section>

        {/* ───── Interactive Demo Showcase ───── */}
        <section id="demo" className="py-16 px-6 max-w-6xl mx-auto scroll-mt-24">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              Démonstration Interactive
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Voyez comment SmartRAG traite une question en direct
            </h2>
            <p className="text-slate-600 text-sm mt-2 max-w-2xl mx-auto">
              Choisissez un exemple métier ci-dessous pour voir la question posée, le document
              retrouvé et la réponse certifiée.
            </p>
          </div>

          {/* Scenario Picker Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
            {DEMO_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                onClick={() => setActiveScenarioId(sc.id)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                  activeScenarioId === sc.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                }`}
              >
                {sc.id === "legal" && <Shield className="size-3.5" />}
                {sc.id === "hr" && <Users className="size-3.5" />}
                {sc.id === "finance" && <BarChart3 className="size-3.5" />}
                {sc.id === "support" && <Briefcase className="size-3.5" />}
                <span>{sc.department}</span>
              </button>
            ))}
          </div>

          {/* Interactive Card Canvas */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Top Toolbar */}
            <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex size-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-700">Document actif :</span>
                <span className="font-mono text-indigo-900 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {currentScenario.docTitle}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">
                  Temps de réponse :{" "}
                  <strong className="text-slate-800 font-mono">
                    {currentScenario.responseTime}
                  </strong>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
                  <Check className="size-3" /> Confiance {currentScenario.confidenceScore}
                </span>
              </div>
            </div>

            {/* Split View: Question & Document Search VS Answer */}
            <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              {/* Left Column: User Question & Found Document Excerpt */}
              <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Question de l'utilisateur
                  </span>
                  <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm font-semibold text-slate-800 flex items-start gap-3">
                    <MessageSquare className="size-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>« {currentScenario.query} »</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                      <Search className="size-3.5" />
                      Extrait source retrouvé automatiquement
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {currentScenario.docLocation}
                    </span>
                  </div>
                  <div className="rounded-xl bg-amber-50/60 border border-amber-200/80 p-4 text-xs font-normal text-slate-800 italic leading-relaxed">
                    {currentScenario.docExcerpt}
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Le moteur scanne uniquement les documents autorisés de votre entreprise.
                  </span>
                </div>
              </div>

              {/* Right Column: Grounded Answer & Highlights */}
              <div className="p-6 sm:p-8 bg-slate-50/50 flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-emerald-600" />
                      Réponse générée certifiée
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Vérifiée à 100%
                    </span>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-2xs text-sm text-slate-800 leading-relaxed">
                    <p
                      dangerouslySetInnerHTML={{
                        __html: currentScenario.answerSummary.replace(
                          /\*\*(.*?)\*\*/g,
                          '<strong class="text-indigo-950 font-bold bg-indigo-50 px-1 py-0.5 rounded">$1</strong>',
                        ),
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-indigo-50/80 border border-indigo-100 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 block mb-1">
                    Points clés retenus :
                  </span>
                  <p className="text-xs font-semibold text-indigo-800">
                    {currentScenario.keyTakeaway}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Link
                    to="/chat"
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    Tester avec vos propres documents →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── How It Works (Simple 3-Step Process) ───── */}
        <section id="how-it-works" className="py-16 px-6 bg-slate-100/60 border-y border-slate-200">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                Simplicité & Rapidité
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                Comment ça marche en 3 étapes simples
              </h2>
              <p className="text-slate-600 text-sm mt-2 max-w-xl mx-auto">
                Aucune compétence technique n'est requise. Déposez vos documents et posez vos
                questions en quelques secondes.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-2xs relative flex flex-col justify-between">
                <div>
                  <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-extrabold text-lg mb-5 border border-indigo-100">
                    1
                  </div>
                  <h3 className="font-bold text-base text-slate-900">Déposez vos documents</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Glissez-déposez vos fichiers PDF, Word (.docx), fiches de paie, manuels de
                    procédures ou notes textuelles dans vos bases dédiées.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
                  <FolderOpen className="size-3.5" /> Formats PDF, DOCX, TXT, MD
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-2xs relative flex flex-col justify-between">
                <div>
                  <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-extrabold text-lg mb-5 border border-blue-100">
                    2
                  </div>
                  <h3 className="font-bold text-base text-slate-900">L'IA organise et mémorise</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    SmartRAG découpe intelligemment le texte en passages clés et prépare un index de
                    recherche sans altérer vos fichiers d'origine.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                  <Cpu className="size-3.5" /> Traitement 100% automatique
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-2xs relative flex flex-col justify-between">
                <div>
                  <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-extrabold text-lg mb-5 border border-emerald-100">
                    3
                  </div>
                  <h3 className="font-bold text-base text-slate-900">
                    Posez vos questions & Obtenez les sources
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Discutez en français ou en anglais. Obtenez une synthèse claire avec le lien
                    direct vers la page exacte du document source.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="size-3.5" /> Réponses prouvées et auditables
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── Key Business Benefits ───── */}
        <section id="benefits" className="py-20 px-6 max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              Pourquoi Choisir SmartRAG ?
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Conçu pour résoudre les vrais défis des équipes
            </h2>
            <p className="text-slate-600 text-sm mt-2 max-w-xl mx-auto">
              Découvrez les bénéfices concrets pour votre productivité quotidienne et la sécurité de
              votre savoir interne.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs hover:shadow-sm transition-shadow">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-4">
                <Clock className="size-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Fin des heures de recherche</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Vos collaborateurs ne perdent plus 30 minutes à feuilleter un PDF de 200 pages. La
                réponse arrive en une fraction de seconde.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs hover:shadow-sm transition-shadow">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-4">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Confiance absolue & Preuves</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Contrairement aux chatbots généralistes qui peuvent inventer, SmartRAG ne répond
                qu'à partir de vos vrais documents avec citations.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs hover:shadow-sm transition-shadow">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-4">
                <Lock className="size-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">
                Données souveraines & Sécurisées
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Vos documents et requêtes restent strictement confidentiels. Aucun partage public,
                aucune réutilisation pour l'entraînement d'IA tierces.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs hover:shadow-sm transition-shadow">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 mb-4">
                <Users className="size-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Cloisonnement par département</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Organisez vos bases par équipe (Finance, RH, Commercial, Technique). Chaque
                utilisateur n'accède qu'aux documents auxquels il a droit.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs hover:shadow-sm transition-shadow">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-4">
                <FileCheck className="size-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">
                Validation des réponses expertes
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Marquez une réponse approuvée en un clic pour que les prochaines questions
                identiques bénéficient instantanément de la réponse officielle.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs hover:shadow-sm transition-shadow">
              <div className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 mb-4">
                <Code2 className="size-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Intégrable via API REST</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Intégrez facilement la recherche documentaire dans vos outils internes, Intranet,
                CRM ou portails clients grâce à nos clés d'API.
              </p>
            </div>
          </div>
        </section>

        {/* ───── Feature Matrix: Real & Clear ───── */}
        <section id="features" className="py-16 px-6 bg-slate-50 border-t border-slate-200">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                Transparence Totale
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                Fonctionnalités de la Plateforme
              </h2>
              <p className="text-slate-600 text-sm mt-2 max-w-xl mx-auto">
                Consultez ce qui est opérationnel immédiatement et ce qui est planifié dans notre
                feuille de route.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterStatus === "all"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Toutes ({FEATURE_ITEMS.length})
                </button>
                <button
                  onClick={() => setFilterStatus("disponible")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    filterStatus === "disponible"
                      ? "bg-emerald-600 text-white"
                      : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  }`}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  Disponible ({FEATURE_ITEMS.filter((f) => f.status === "disponible").length})
                </button>
                <button
                  onClick={() => setFilterStatus("bientot")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    filterStatus === "bientot"
                      ? "bg-amber-600 text-white"
                      : "text-amber-700 bg-amber-50 hover:bg-amber-100"
                  }`}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  Bientôt ({FEATURE_ITEMS.filter((f) => f.status === "bientot").length})
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-semibold">Catégorie :</span>
                <select
                  value={filterCategory}
                  onChange={(e) =>
                    setFilterCategory(
                      e.target.value as "all" | "utilisateurs" | "securite" | "technique",
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Toutes les catégories</option>
                  <option value="utilisateurs">Pour les utilisateurs</option>
                  <option value="securite">Sécurité & Gouvernance</option>
                  <option value="technique">Sous le capot / Technique</option>
                </select>
              </div>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between hover:border-indigo-300 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {feat.category === "utilisateurs" && "Expérience Métier"}
                        {feat.category === "securite" && "Sécurité & Contrôle"}
                        {feat.category === "technique" && "Moteur & Performance"}
                      </span>
                      {feat.status === "disponible" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                          <Check className="size-3" /> Disponible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                          <Clock className="size-3" /> Roadmap
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">{feat.title}</h4>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {feat.simpleDesc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-indigo-700 font-semibold">
                    <span>{feat.benefit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── FAQ Section ───── */}
        <section id="faq" className="py-20 px-6 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              Questions Fréquentes
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Tout ce que vous devez savoir
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Des réponses claires sur la sécurité, les formats et l'utilisation de SmartRAG.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Comment SmartRAG garantit-il qu'il n'invente rien (zéro hallucination) ?",
                a: "SmartRAG utilise une architecture stricte de vérification documentaire (RAG). Avant de formuler une réponse, le système extrait les passages exacts de vos documents. Si l'information n'est pas présente dans vos fichiers, le système vous l'indique clairement au lieu d'inventer une réponse.",
              },
              {
                q: "Quels types de documents puis-je importer ?",
                a: "Vous pouvez importer directement des fichiers PDF, des documents Word (.docx), des fichiers Markdown (.md) et des fichiers texte (.txt). Les tableaux et listes structurées sont automatiquement pris en compte.",
              },
              {
                q: "Mes documents restent-ils strictement confidentiels ?",
                a: "Oui, absolument. Vos données sont isolées dans votre espace d'entreprise sécurisé. Elles ne sont ni partagées, ni revendues, ni utilisées pour entraîner des modèles publics d'intelligence artificielle.",
              },
              {
                q: "Peut-on séparer les documents sensibles (ex: RH vs Technique) ?",
                a: "Oui. Vous pouvez créer autant de bases de connaissances que nécessaire (ex: Base RH, Base Finance, Base Juridique) et attribuer les droits d'accès correspondants aux membres de votre équipe.",
              },
              {
                q: "Faut-il installer un logiciel sur mon ordinateur ?",
                a: "Non. SmartRAG est 100% accessible via votre navigateur web moderne, sans installation requise.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`size-4 text-slate-400 transition-transform duration-200 shrink-0 ml-4 ${
                      openFaq === i ? "rotate-180 text-indigo-600" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ───── Final CTA Banner ───── */}
        <section className="px-6 pb-20 max-w-6xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-xl border border-indigo-900/40">
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Prêt à libérer la connaissance de votre entreprise ?
              </h2>
              <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
                Rejoignez vos collaborateurs et testez la recherche intelligente sur vos premiers
                documents dès aujourd'hui.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to={session ? "/dashboard" : "/auth"}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 px-8 text-sm font-bold text-white shadow-md transition-all duration-200"
                >
                  <span>Commencer gratuitement</span>
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/chat"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 px-7 text-sm font-bold text-slate-200 transition-all duration-200"
                >
                  <MessageSquare className="size-4 text-indigo-400" />
                  <span>Tester le chat</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ───── Footer ───── */}
      <footer className="border-t border-slate-200 bg-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <SmartRAGLogoMark size={32} />
            <span className="font-bold text-slate-800">SmartRAG</span>
            <span>— Plateforme d'Assistance Documentaire Sécurisée</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/chat" className="hover:text-indigo-600 transition-colors font-medium">
              Chat Documentaire
            </Link>
            <Link to="/dashboard" className="hover:text-indigo-600 transition-colors font-medium">
              Tableau de bord
            </Link>
            <Link to="/auth" className="hover:text-indigo-600 transition-colors font-medium">
              Connexion
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
