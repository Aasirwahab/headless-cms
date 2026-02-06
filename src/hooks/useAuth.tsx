"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { User } from "@/types/cms";

// ============================================================
// AUTH CONTEXT
// ============================================================
// Manages session token in localStorage + reactive user query.
// Wraps the entire CMS admin in <AuthProvider>.
// ============================================================

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isEditor: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "cms_session_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    setToken(stored);
    setIsLoading(false);
  }, []);

  // Reactive user query — re-runs when token changes
  const user = useQuery(api.users.me, token ? { token } : "skip") as User | null;

  const loginMutation = useMutation(api.users.login);
  const logoutMutation = useMutation(api.users.logout);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation({ email, password });
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
    },
    [loginMutation]
  );

  const logout = useCallback(async () => {
    if (token) {
      await logoutMutation({ token });
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, [token, logoutMutation]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
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
