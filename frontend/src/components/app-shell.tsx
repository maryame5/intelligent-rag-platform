import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Blocks,
  BookOpen,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Gauge,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  Database,
  Sparkles,
  Layers,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/config";

function useTheme() {
  const [light, setLight] = useState(true);
  useEffect(() => {
    const stored = localStorage.getItem("rag.theme");
    const isDark = stored === "dark";
    setLight(!isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    setLight((prev) => {
      const nextLight = !prev;
      localStorage.setItem("rag.theme", nextLight ? "light" : "dark");
      document.documentElement.classList.toggle("dark", !nextLight);
      return nextLight;
    });
  };
  return { light, toggle };
}

function SmartRAGBrandMark({ size = 32 }: { size?: number }) {
  return <img src="/logo.png" width={size} height={size} alt="" className="shrink-0 rounded-lg" />;
}

const nav = [
  { to: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { to: "/chat", label: "Conversations", icon: MessagesSquare },
  { to: "/verified", label: "Réponses vérifiées", icon: ShieldCheck },
  { to: "/team", label: "Équipe & accès", icon: Users },
  { to: "/integrations", label: "Intégrations", icon: Blocks },
];

export function AppShell({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { session, ready, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { light, toggle } = useTheme();

  // Gestion du workspace actif
  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: api.getWorkspaces,
  });
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(
    () => localStorage.getItem("rag.activeWorkspaceId") || "",
  );

  useEffect(() => {
    if (workspaces.length > 0) {
      if (!activeWorkspaceId || !workspaces.some((w) => w.id === activeWorkspaceId)) {
        const firstId = workspaces[0].id;
        setActiveWorkspaceId(firstId);
        localStorage.setItem("rag.activeWorkspaceId", firstId);
      }
    }
  }, [workspaces, activeWorkspaceId]);

  const handleSelectWorkspace = (wsId: string) => {
    setActiveWorkspaceId(wsId);
    localStorage.setItem("rag.activeWorkspaceId", wsId);
    queryClient.invalidateQueries({ queryKey: ["kbs"] });
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const { data: kbs = [] } = useQuery({
    queryKey: ["kbs", activeWorkspaceId],
    queryFn: () => api.getKnowledgeBases(activeWorkspaceId || undefined),
  });
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: api.getNotifications,
  });
  const unread = notifications.filter((n) => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (ready && !session) navigate({ to: "/auth", replace: true });
  }, [ready, session, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key?.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready || !session) {
    return <div className="min-h-screen bg-background" />;
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* ───── Left Enterprise Sidebar ───── */}
      <aside
        className={cn(
          "sticky top-0 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 z-30 shadow-xs",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <SmartRAGBrandMark size={34} />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-slate-900">{APP_NAME}</p>
                <p className="truncate text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Studio Documentaire
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* Workspace Switcher */}
        {!collapsed && workspaces.length > 0 && (
          <div className="px-3 pt-3 pb-1 border-b border-slate-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 transition-all hover:bg-slate-100 cursor-pointer shadow-2xs">
                  <div className="flex items-center gap-2 truncate">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-marine text-[11px] font-bold text-papier">
                      {activeWorkspace?.name?.slice(0, 1).toUpperCase() || "W"}
                    </div>
                    <div className="text-left truncate">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {activeWorkspace?.name || "Workspace"}
                      </p>
                      <p className="text-[10px] font-medium text-slate-500">Workspace actif</p>
                    </div>
                  </div>
                  <ChevronDown className="size-3.5 shrink-0 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-58 bg-white border border-slate-200 shadow-lg rounded-xl p-1"
              >
                <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Changer de Workspace
                </DropdownMenuLabel>
                {workspaces.map((ws) => (
                  <DropdownMenuItem
                    key={ws.id}
                    onSelect={() => handleSelectWorkspace(ws.id)}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-2.5 py-2 text-xs cursor-pointer",
                      ws.id === activeWorkspaceId
                        ? "bg-brume font-bold text-marine"
                        : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <span className="truncate">{ws.name}</span>
                    {ws.id === activeWorkspaceId && (
                      <span className="text-marine font-bold">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem
                  onSelect={() => navigate({ to: "/team" })}
                  className="rounded-lg px-2.5 py-2 text-xs font-semibold text-marine hover:bg-slate-50 cursor-pointer"
                >
                  <Users className="size-3.5 mr-2" /> Gérer les workspaces
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-6">
          <div>
            {!collapsed && (
              <p className="px-2 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Navigation
              </p>
            )}
            <ul className="space-y-1">
              {nav.map((item) => {
                const active = isActive(item.to, item.exact);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to as never}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer",
                        active
                          ? "bg-marine text-papier shadow-xs font-bold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon
                        className={cn("size-4 shrink-0", active ? "text-white" : "text-slate-500")}
                      />
                      {!collapsed ? <span>{item.label}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Knowledge Bases Section */}
          {!collapsed && (
            <div>
              <div className="flex items-center justify-between px-2 pb-2">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Bases de Connaissances
                </span>
                <Link
                  to="/knowledge-bases"
                  className="text-[10px] font-bold text-marine hover:underline"
                >
                  Voir tout
                </Link>
              </div>
              <ul className="space-y-1">
                {kbs.map((kb) => {
                  const isCurrentKb = pathname.includes(kb.id);
                  return (
                    <li key={kb.id}>
                      <Link
                        to="/knowledge-bases/$kbId"
                        params={{ kbId: kb.id }}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                          isCurrentKb
                            ? "bg-brume text-marine font-bold border border-marine/20"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <BookOpen className="size-3.5 shrink-0 text-marine" />
                          <span className="truncate">{kb.name}</span>
                        </div>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                          {kb.documentCount}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Administration */}
          {isAdmin && (
            <div>
              {!collapsed && (
                <p className="px-2 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Administration
                </p>
              )}
              <Link
                to="/admin"
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                  isActive("/admin")
                    ? "bg-marine text-papier shadow-xs font-bold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
                title={collapsed ? "Observabilité" : undefined}
              >
                <Gauge className="size-4 shrink-0 text-orbite" />
                {!collapsed ? "Observabilité" : null}
              </Link>
            </div>
          )}
        </nav>

        {/* Bottom Sidebar Footer */}
        <div className="border-t border-slate-200 p-2 space-y-1">
          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
              isActive("/settings")
                ? "bg-slate-900 text-white shadow-xs font-bold"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
            title={collapsed ? "Paramètres" : undefined}
          >
            <Settings className="size-4 shrink-0" />
            {!collapsed ? "Paramètres" : null}
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            title={collapsed ? "Déplier" : "Replier"}
          >
            {collapsed ? (
              <ChevronsRight className="size-4 text-marine" />
            ) : (
              <ChevronsLeft className="size-4" />
            )}
            {!collapsed ? "Replier le menu" : null}
          </button>
        </div>
      </aside>

      {/* ───── Main App Container ───── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top App Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md shadow-2xs">
          {/* Quick Search */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-10 w-full max-w-md items-center gap-2.5 rounded-xl border border-brume bg-brume px-3.5 text-xs font-medium text-slate-500 transition-all hover:border-marine hover:bg-white cursor-pointer shadow-2xs"
          >
            <Search className="size-4 text-marine" />
            <span>Rechercher dans tout l'espace…</span>
            <kbd className="ml-auto rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] text-slate-500 shadow-2xs">
              ⌘K
            </kbd>
          </button>

          {/* Engine Status Badge */}
          <div className="hidden lg:flex items-center gap-2 ml-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-700 shadow-2xs">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Moteur Hybride RAG Actif
            </span>
          </div>

          {/* Right Header Actions */}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Changer de thème"
              className="size-9 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {light ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </Button>

            {/* Notifications Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative size-9 text-slate-600 hover:bg-slate-100 rounded-lg"
                  aria-label="Notifications"
                >
                  <Bell className="size-4" />
                  {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-marine font-mono text-[9px] font-bold text-papier">
                      {unread}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-88 p-0 bg-white border border-slate-200 shadow-xl rounded-xl"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Notifications
                  </span>
                  <span className="text-xs text-slate-500">
                    {unread} non lue{unread > 1 ? "s" : ""}
                  </span>
                </div>
                <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <li className="px-4 py-6 text-center text-xs text-slate-500">
                      Aucune notification
                    </li>
                  ) : (
                    notifications.map((n) => (
                      <li
                        key={n.id}
                        onClick={() => {
                          if (!n.read) markReadMutation.mutate(n.id);
                        }}
                        className={cn(
                          "cursor-pointer px-4 py-3 transition-colors hover:bg-slate-50",
                          !n.read && "bg-brume/40 font-medium",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900">{n.title}</p>
                          <span className="shrink-0 text-[10px] text-slate-500">
                            {new Date(n.createdAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600">{n.description}</p>
                      </li>
                    ))
                  )}
                </ul>
              </PopoverContent>
            </Popover>

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 transition-all hover:bg-slate-100 cursor-pointer shadow-2xs">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-marine text-xs font-bold text-papier">
                    {session.user.initials}
                  </span>
                  <span className="hidden sm:inline font-bold">{session.user.name}</span>
                  <ChevronDown className="size-3.5 text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-white border border-slate-200 shadow-xl rounded-xl p-1.5"
              >
                <DropdownMenuLabel className="p-2.5">
                  <p className="text-sm font-bold text-slate-900">{session.user.name}</p>
                  <p className="text-xs font-normal text-slate-500">{session.user.email}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="rounded-md bg-brume border border-marine/20 px-2 py-0.5 text-[10px] font-bold text-marine">
                      Rôle : {session.user.role}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem
                  onSelect={() => navigate({ to: "/settings" })}
                  className="rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
                >
                  <Settings className="size-4 mr-2 text-slate-500" /> Paramètres du compte
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    signOut();
                    navigate({ to: "/auth", replace: true });
                  }}
                  className="rounded-lg text-xs font-semibold text-braise hover:bg-orbite-soft cursor-pointer"
                >
                  <LogOut className="size-4 mr-2 text-braise" /> Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Body */}
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
