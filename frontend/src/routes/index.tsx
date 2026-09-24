import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brain, Database, Shield, Zap, Sparkles, BookOpen, ChevronRight, Search, MessageSquare, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")(({
  head: () => ({
    meta: [
      { title: "SmartRAG — La plateforme RAG nouvelle génération" },
      { name: "description", content: "Découvrez la puissance de l'IA générative connectée à vos données d'entreprise." },
    ],
  }),
  component: LandingPage,
}));

function LandingPage() {
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-[#fefef3] text-[#262236] flex flex-col font-sans selection:bg-[#3d4f7e]/20 overflow-x-hidden">
      {/* ───── Navigation ───── */}
      <header className="sticky top-0 z-50 w-full bg-[#fefef3]/90 backdrop-blur-xl border-b border-[#3d4f7e]/10">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight group">
            <img src="/icon.png" alt="SmartRAG" className="size-9 rounded-lg object-contain transition-transform group-hover:scale-105" />
            <span className="bg-gradient-to-r from-[#3d4f7e] to-[#262236] bg-clip-text text-transparent">SmartRAG</span>
          </Link>
          <div className="flex items-center gap-3">
            {session ? (
              <Link
                to="/dashboard"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#3d4f7e] px-6 text-sm font-semibold text-white shadow-lg shadow-[#3d4f7e]/20 transition-all hover:bg-[#2d3d66] hover:shadow-xl hover:shadow-[#3d4f7e]/30 hover:-translate-y-0.5"
              >
                Mon espace <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link to="/auth/login" className="text-sm font-medium text-[#3d4f7e] hover:text-[#262236] transition-colors px-3 py-2">
                  Connexion
                </Link>
                <Link
                  to="/auth/register"
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-[#3d4f7e] px-6 text-sm font-semibold text-white shadow-lg shadow-[#3d4f7e]/20 transition-all hover:bg-[#2d3d66] hover:shadow-xl hover:shadow-[#3d4f7e]/30 hover:-translate-y-0.5"
                >
                  Commencer gratuitement <ArrowRight className="size-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ───── Hero Section ───── */}
        <section className="relative py-24 md:py-32 lg:py-40">
          {/* Animated background shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#3d4f7e]/[0.06] blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
            <div className="absolute top-1/2 -left-32 w-[500px] h-[500px] rounded-full bg-[#e18546]/[0.06] blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#3d4f7e]/[0.04] blur-3xl animate-pulse" style={{ animationDuration: "10s" }} />
          </div>

          {/* Dot grid pattern */}
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(#3d4f7e 0.5px, transparent 0.5px)", backgroundSize: "24px 24px", opacity: 0.06 }} />

          <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e18546]/30 bg-[#e18546]/10 px-4 py-1.5 text-sm font-medium text-[#e18546] mb-8 backdrop-blur-sm">
              <Sparkles className="size-4" />
              Recherche sémantique + IA générative
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
              <span className="block">Vos données d'entreprise,</span>
              <span className="bg-gradient-to-r from-[#3d4f7e] via-[#e18546] to-[#3d4f7e] bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient_4s_ease_infinite]">
                intelligentes et accessibles.
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg md:text-xl text-[#262236]/60 leading-relaxed mb-12">
              SmartRAG est la plateforme RAG qui connecte vos documents, comprend vos questions et délivre des réponses précises, sourcées et sécurisées.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={session ? "/dashboard" : "/auth/register"}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#3d4f7e] px-10 text-base font-semibold text-white shadow-xl shadow-[#3d4f7e]/25 transition-all hover:bg-[#2d3d66] hover:shadow-2xl hover:shadow-[#3d4f7e]/30 hover:-translate-y-1"
              >
                {session ? "Accéder au Dashboard" : "Démarrer maintenant"}
                <ArrowRight className="size-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-[#3d4f7e]/20 bg-white/50 backdrop-blur-sm px-10 text-base font-semibold text-[#3d4f7e] transition-all hover:border-[#3d4f7e]/40 hover:bg-white hover:-translate-y-1"
              >
                Découvrir les fonctionnalités
                <ChevronRight className="size-5" />
              </a>
            </div>
          </div>
        </section>

        {/* ───── Trusted bar ───── */}
        <section className="py-8 border-y border-[#3d4f7e]/10 bg-white/50 backdrop-blur-sm">
          <div className="mx-auto max-w-5xl px-6">
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-[#262236]/40 font-medium">
              <span>✓ Open Source</span>
              <span>✓ Déploiement on-premise</span>
              <span>✓ RGPD compliant</span>
              <span>✓ Modèles privés</span>
              <span>✓ API REST complète</span>
            </div>
          </div>
        </section>

        {/* ───── Features Section ───── */}
        <section id="features" className="py-24 md:py-32">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-20">
              <p className="text-sm font-semibold text-[#e18546] uppercase tracking-wider mb-3">Fonctionnalités</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Tout ce dont vous avez besoin</h2>
              <p className="text-lg text-[#262236]/60 max-w-2xl mx-auto">
                Une architecture pensée pour l'entreprise, alliant performance, sécurité et gouvernance de bout en bout.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Database, title: "Vectorisation Avancée", desc: "Moteur de recherche vectoriel avec embeddings de dernière génération pour une précision inégalée.", color: "#3d4f7e" },
                { icon: Shield, title: "Sécurité & Gouvernance", desc: "Contrôle d'accès RBAC, traçabilité complète. Vos données ne servent jamais à entraîner des modèles publics.", color: "#e18546" },
                { icon: Zap, title: "Recherche Hybride", desc: "Combinez recherche vectorielle et BM25 avec reranking intelligent pour des résultats toujours pertinents.", color: "#3d4f7e" },
                { icon: MessageSquare, title: "Chat Contextuel", desc: "Conversations multi-tours avec citations précises et streaming en temps réel.", color: "#e18546" },
                { icon: Search, title: "Pipeline d'Ingestion", desc: "Import automatisé de PDF, DOCX, Markdown et HTML avec chunking et embedding optimisés.", color: "#3d4f7e" },
                { icon: BarChart3, title: "Observabilité", desc: "Métriques de qualité RAG, latence, coût par requête et évaluations automatisées.", color: "#e18546" },
              ].map((f, i) => (
                <div key={i} className="group relative rounded-2xl border border-[#262236]/[0.06] bg-white p-8 transition-all duration-300 hover:shadow-xl hover:shadow-[#3d4f7e]/[0.06] hover:-translate-y-1 hover:border-[#3d4f7e]/20">
                  <div className="mb-5 inline-flex rounded-xl p-3 transition-colors" style={{ backgroundColor: f.color + "12" }}>
                    <f.icon className="size-6" style={{ color: f.color }} />
                  </div>
                  <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                  <p className="text-sm text-[#262236]/60 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── How it works ───── */}
        <section className="py-24 bg-gradient-to-b from-[#3d4f7e]/[0.03] to-transparent">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-[#e18546] uppercase tracking-wider mb-3">Comment ça marche</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Trois étapes simples</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: "01", title: "Importez vos documents", desc: "Glissez-déposez vos fichiers ou connectez vos sources. SmartRAG découpe, vectorise et indexe automatiquement." },
                { step: "02", title: "Posez vos questions", desc: "Interrogez vos données en langage naturel. Le moteur hybride retrouve les passages les plus pertinents." },
                { step: "03", title: "Obtenez des réponses sourcées", desc: "Chaque réponse est accompagnée de citations vérifiables. Évaluez, validez et améliorez en continu." },
              ].map((s, i) => (
                <div key={i} className="relative text-center">
                  <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-[#3d4f7e] text-white font-bold text-lg shadow-lg shadow-[#3d4f7e]/20">
                    {s.step}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-[#262236]/60 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── CTA Section ───── */}
        <section className="py-24">
          <div className="mx-auto max-w-5xl px-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#3d4f7e] via-[#3d4f7e] to-[#262236] p-12 md:p-20 text-center text-white shadow-2xl">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#e18546]/15 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

              <div className="relative z-10">
                <Brain className="mx-auto size-14 mb-6 opacity-90" />
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Prêt à transformer vos connaissances ?</h2>
                <p className="text-white/70 md:text-lg mb-10 max-w-2xl mx-auto">
                  Déployez SmartRAG en quelques minutes et commencez à exploiter la puissance de vos données documentaires.
                </p>
                <Link
                  to={session ? "/dashboard" : "/auth/register"}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-10 text-base font-bold text-[#3d4f7e] shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
                >
                  {session ? "Accéder au Dashboard" : "Déployer maintenant"}
                  <ArrowRight className="size-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ───── Footer ───── */}
      <footer className="border-t border-[#3d4f7e]/10 py-8 bg-white/50">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 font-semibold text-sm text-[#262236]/70">
            <img src="/icon.png" alt="SmartRAG" className="size-5 rounded object-contain" />
            SmartRAG &copy; {new Date().getFullYear()}
          </div>
          <div className="flex gap-6 text-sm text-[#262236]/40">
            <a href="#" className="hover:text-[#3d4f7e] transition-colors">Documentation</a>
            <a href="#" className="hover:text-[#3d4f7e] transition-colors">Confidentialité</a>
            <a href="#" className="hover:text-[#3d4f7e] transition-colors">Conditions</a>
          </div>
        </div>
      </footer>

      {/* Gradient animation keyframes */}
      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 100% center; }
        }
      `}</style>
    </div>
  );
}
