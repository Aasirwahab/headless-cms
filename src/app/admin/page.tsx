"use client";

// ============================================================
// /admin — CMS Dashboard Entry Point
// ============================================================
// Handles auth state: shows login if not authenticated,
// shows dashboard if authenticated.
// ============================================================

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/admin/LoginForm";
import { Dashboard } from "@/components/admin/Dashboard";

function AdminContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return <Dashboard />;
}

export default function AdminPage() {
  return (
    <AuthProvider>
      <AdminContent />
    </AuthProvider>
  );
}
