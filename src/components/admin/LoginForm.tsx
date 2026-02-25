"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";

type Tab = "signin" | "signup";

export function LoginForm() {
  const { login } = useAuth();
  const registerMutation = useMutation(api.users.register);

  const [tab, setTab] = useState<Tab>("signin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sign-in state
  const [signIn, setSignIn] = useState({ email: "", password: "" });

  // Sign-up state
  const [signUp, setSignUp] = useState({ name: "", email: "", password: "" });

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(signIn.email.trim().toLowerCase(), signIn.password);
    } catch (err: any) {
      setError(err.data ?? err.message ?? "Invalid email or password");
    }
    setLoading(false);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await registerMutation({
        name: signUp.name.trim(),
        email: signUp.email.trim().toLowerCase(),
        password: signUp.password,
      });
      localStorage.setItem("cms_session_token", result.token);
      if (result.workspaceId) {
        localStorage.setItem("cms_workspace_id", result.workspaceId);
      }
      window.location.reload();
    } catch (err: any) {
      setError(err.data ?? err.message ?? "Registration failed");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-bold">CMS</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            {tab === "signin" ? "Sign in to CMS" : "Create an account"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {tab === "signin"
              ? "Enter your credentials to continue"
              : "Fill in your details to get started"}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => { setTab("signin"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === "signin"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab("signup"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === "signup"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Sign In Form */}
        {tab === "signin" && (
          <form
            onSubmit={handleSignIn}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4"
          >
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                value={signIn.email}
                onChange={(e) => setSignIn({ ...signIn, email: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
                autoComplete="email"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Password</span>
              <input
                type="password"
                value={signIn.password}
                onChange={(e) => setSignIn({ ...signIn, password: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
                autoComplete="current-password"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {tab === "signup" && (
          <form
            onSubmit={handleSignUp}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4"
          >
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Your Name</span>
              <input
                type="text"
                value={signUp.name}
                onChange={(e) => setSignUp({ ...signUp, name: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
                autoComplete="name"
                placeholder="John Smith"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                value={signUp.email}
                onChange={(e) => setSignUp({ ...signUp, email: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Password</span>
              <input
                type="password"
                value={signUp.password}
                onChange={(e) => setSignUp({ ...signUp, password: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Min. 6 characters"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
            <p className="text-xs text-center text-gray-400">
              First account becomes <strong>admin</strong>. Subsequent accounts get <strong>editor</strong> access.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
