"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if first user needs to be seeded
  const [showSeed, setShowSeed] = useState(false);
  const seedAdmin = useMutation(api.users.seedAdmin);
  const [seedForm, setSeedForm] = useState({ name: "", email: "", password: "" });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.data ?? err.message ?? "Login failed");
    }
    setLoading(false);
  }

  async function handleSeed(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await seedAdmin(seedForm);
      localStorage.setItem("cms_session_token", result.token);
      window.location.reload();
    } catch (err: any) {
      setError(err.data ?? err.message ?? "Setup failed");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-bold">CMS</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            {showSeed ? "Initial Setup" : "Sign in to CMS"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {showSeed
              ? "Create your admin account"
              : "Enter your credentials to continue"
            }
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {showSeed ? (
          <form onSubmit={handleSeed} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Your Name</span>
              <input
                type="text"
                value={seedForm.name}
                onChange={(e) => setSeedForm({ ...seedForm, name: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                value={seedForm.email}
                onChange={(e) => setSeedForm({ ...seedForm, email: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Password</span>
              <input
                type="password"
                value={seedForm.password}
                onChange={(e) => setSeedForm({ ...seedForm, password: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                required
                minLength={6}
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Setting up..." : "Create Admin Account"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                required
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

        <p className="mt-4 text-center text-xs text-gray-400">
          {showSeed ? (
            <button onClick={() => setShowSeed(false)} className="underline hover:text-gray-600">
              Already have an account? Sign in
            </button>
          ) : (
            <button onClick={() => setShowSeed(true)} className="underline hover:text-gray-600">
              First time? Set up admin account
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
