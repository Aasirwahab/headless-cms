"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { User } from "@/types/cms";

type AuthContextType = {
  user: User | null;
  token: string | null;
  workspaceId: Id<"workspaces"> | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isEditor: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "cms_session_token";
const WORKSPACE_KEY = "cms_workspace_id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<Id<"workspaces"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedWorkspace = localStorage.getItem(WORKSPACE_KEY) as Id<"workspaces"> | null;
    setToken(storedToken);
    setWorkspaceId(storedWorkspace);
    setIsLoading(false);
  }, []);

  const user = useQuery(api.users.me, token ? { token } : "skip") as User | null;

  const loginMutation = useMutation(api.users.login);
  const logoutMutation = useMutation(api.users.logout);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation({ email, password });
      localStorage.setItem(TOKEN_KEY, result.token);
      if (result.workspaceId) {
        localStorage.setItem(WORKSPACE_KEY, result.workspaceId);
      }
      setToken(result.token);
      setWorkspaceId(result.workspaceId as Id<"workspaces"> | null);
    },
    [loginMutation]
  );

  const logout = useCallback(async () => {
    if (token) await logoutMutation({ token });
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(WORKSPACE_KEY);
    setToken(null);
    setWorkspaceId(null);
  }, [token, logoutMutation]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        workspaceId,
        isLoading,
        login,
        logout,
        isAdmin: user?.role === "admin",
        isEditor: user?.role === "admin" || user?.role === "editor",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
