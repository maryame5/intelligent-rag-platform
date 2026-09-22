/**
 * Session handling backed by le backend FastAPI (Sprint 1 : JWT access +
 * refresh, RBAC USER/ADMIN). Remplace l'auth Supabase du gabarit Lovable.
 *
 * Le backend ne connaît que deux rôles (USER/ADMIN) — pas de notion de
 * workspace ni de rôles granulaires (owner/editor/member) comme envisagé dans
 * le prompt de design initial. On mappe :
 *   ADMIN -> "owner" (isAdmin = true, accès au panneau Administration)
 *   USER  -> "editor" (canEdit = true, pas d'accès admin)
 * pour que le reste de l'UI (déjà écrite contre ces 4 rôles) continue de
 * fonctionner sans modification.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest, clearTokens, getAccessToken, setTokens } from "./backend-client";
import type { Role } from "./mock-data";

export interface Session {
  userId: string;
  user: { id: string; name: string; email: string; role: Role; initials: string };
}

interface BackendUser {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
}

interface AuthValue {
  session: Session | null;
  ready: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  canEdit: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function toSession(user: BackendUser): Session {
  const name = user.email.split("@")[0]?.replace(/[._]/g, " ") || "Utilisateur";
  const role: Role = user.role === "ADMIN" ? "owner" : "editor";
  return {
    userId: user.id,
    user: { id: user.id, name, email: user.email, role, initials: initials(name) },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();

  const hydrate = useCallback(async () => {
    if (!getAccessToken()) {
      setSession(null);
      setReady(true);
      return;
    }
    try {
      const user = await apiRequest<BackendUser>("/auth/me");
      setSession(toSession(user));
    } catch {
      clearTokens();
      setSession(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await apiRequest<{ access_token: string; refresh_token: string }>("/auth/login", {
        method: "POST",
        skipAuth: true,
        body: { email, password },
      });
      setTokens(tokens.access_token, tokens.refresh_token);
      await hydrate();
    },
    [hydrate],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      await apiRequest("/auth/register", { method: "POST", skipAuth: true, body: { email, password } });
      // L'inscription ne renvoie pas de token (voir POST /auth/register côté
      // backend) : on enchaîne avec une connexion pour obtenir la session.
      await login(email, password);
    },
    [login],
  );

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    clearTokens();
    setSession(null);
  }, [queryClient]);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      ready,
      signOut,
      login,
      register,
      isAdmin: session?.user.role === "owner",
      canEdit: session !== null,
    }),
    [session, ready, signOut, login, register],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
