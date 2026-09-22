import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

function useTheme() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("rag.theme") === "light";
    setLight(stored);
    document.documentElement.classList.toggle("light", stored);
  }, []);
  const toggle = () => {
    setLight((prev) => {
      const next = !prev;
      localStorage.setItem("rag.theme", next ? "light" : "dark");
      document.documentElement.classList.toggle("light", next);
      return next;
    });
  };
  return { light, toggle };
}

const nav = [
  { to: "/", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { to: "/chat", label: "Conversations", icon: MessagesSquare },
  { to: "/verified", label: "Réponses vérifiées", icon: ShieldCheck },
  { to: "/team", label: "Équipe & accès", icon: Users },
  { to: "/integrations", label: "Intégrations", icon: Blocks },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { session, ready, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { light, toggle } = useTheme();
  const { data: kbs = [] } = useQuery({ queryKey: ["kbs"], queryFn: api.getKnowledgeBases });
  const { data: notifications = [] } = useQuery({ queryKey: ["notifications"], queryFn: api.getNotifications });
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (ready && !session) navigate({ to: "/auth", replace: true });
  }, [ready, session, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
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

  const isActive = (to: string, exact?: boolean) => (exact ? pathname === to : pathname.startsWith(to));

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
          collapsed ? "w-[62px]" : "w-64",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-xs font-bold text-primary-foreground">
            AI
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Acme Industries</p>
              <p className="truncate text-[11px] text-muted-foreground">Workspace · plan Business</p>
            </div>
          ) : null}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-0.5">
            {nav.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to as never}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                    isActive(item.to, item.exact)
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  {!collapsed ? item.label : null}
                </Link>
              </li>
            ))}
          </ul>

          {!collapsed ? (
            <div className="mt-5">
              <div className="flex items-center justify-between px-2.5 pb-1.5">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Knowledge bases
                </span>
                <Link to="/knowledge-bases" className="text-[11px] text-muted-foreground hover:text-foreground">
                  Tout voir
                </Link>
              </div>
              <ul className="space-y-0.5">
                {kbs.map((kb) => (
                  <li key={kb.id}>
                    <Link
                      to="/knowledge-bases/$kbId"
                      params={{ kbId: kb.id }}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                        pathname.includes(kb.id)
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                      )}
                    >
                      <BookOpen className="size-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{kb.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {isAdmin ? (
            <div className="mt-5">
              {!collapsed ? (
                <p className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Administration
                </p>
              ) : null}
              <Link
                to="/admin"
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  isActive("/admin")
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )}
              >
                <Gauge className="size-4 shrink-0" />
                {!collapsed ? "Observabilité" : null}
              </Link>
            </div>
          ) : null}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              isActive("/settings")
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60",
            )}
          >
            <Settings className="size-4 shrink-0" />
            {!collapsed ? "Paramètres" : null}
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60"
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            {!collapsed ? "Replier" : null}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40"
          >
            <Search className="size-4" />
            Rechercher dans tout le workspace…
            <kbd className="ml-auto rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Changer de thème">
              {light ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="size-4" />
                  {unread > 0 ? (
                    <span className="absolute top-1.5 right-1.5 flex size-3.5 items-center justify-center rounded-full bg-primary font-mono text-[9px] text-primary-foreground">
                      {unread}
                    </span>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-88 p-0">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="text-sm font-medium">Notifications</span>
                  <span className="text-xs text-muted-foreground">{unread} non lues</span>
                </div>
                <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                  {notifications.map((n) => (
                    <li key={n.id} className={cn("px-3 py-2.5", !n.read && "bg-primary/5")}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{n.title}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{n.at}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
                    {session.user.initials}
                  </span>
                  <span className="hidden sm:inline">{session.user.name}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <p className="text-sm">{session.user.name}</p>
                  <p className="text-xs font-normal text-muted-foreground">{session.user.email}</p>
                  <StatusBadge status="role" label={session.user.role} tone="accent" className="mt-2" />
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
                  <Settings className="size-4" /> Paramètres
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    signOut();
                    navigate({ to: "/auth", replace: true });
                  }}
                >
                  <LogOut className="size-4" /> Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
