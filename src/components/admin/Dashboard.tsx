"use client";

// ============================================================
// ADMIN DASHBOARD — PAGES LIST
// ============================================================

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { PageEditor } from "./PageEditor";
import { ConnectFrontend } from "./ConnectFrontend";
import type { Id } from "../../../convex/_generated/dataModel";

export function Dashboard() {
  const { user, token, isAdmin, logout } = useAuth();
  const pages = useQuery(api.pages.listAll, token ? { token } : "skip");
  const auditLogs = useQuery(api.auditLog.getRecent, token && isAdmin ? { token, limit: 10 } : "skip");

  const createPage = useMutation(api.pages.create);
  const deletePage = useMutation(api.pages.deletePage);
  const archivePage = useMutation(api.pages.archive);

  const [editingPageId, setEditingPageId] = useState<Id<"pages"> | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPage, setNewPage] = useState({ title: "", slug: "" });
  const [activeTab, setActiveTab] = useState<"pages" | "connect">("pages");

  // If editing a specific page, show the page editor
  if (editingPageId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <PageEditor
          pageId={editingPageId}
          onBack={() => setEditingPageId(null)}
        />
      </div>
    );
  }

  async function handleCreatePage() {
    if (!token || !newPage.title || !newPage.slug) return;
    try {
      const pageId = await createPage({
        token,
        title: newPage.title,
        slug: newPage.slug,
      });
      setShowCreateModal(false);
      setNewPage({ title: "", slug: "" });
      setEditingPageId(pageId);
    } catch (err: any) {
      alert(err.data ?? err.message);
    }
  }

  const statusColors = {
    draft: "bg-yellow-100 text-yellow-800",
    published: "bg-green-100 text-green-800",
    archived: "bg-gray-200 text-gray-600",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">CMS</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Content Manager</h1>
              <p className="text-xs text-gray-500">
                {user?.name} · <span className="capitalize">{user?.role}</span>
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab("pages")}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "pages"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              Pages
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab("connect")}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "connect"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                Connect Frontend
              </button>
            )}
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Connect Frontend Tab */}
        {activeTab === "connect" && isAdmin && <ConnectFrontend />}

        {/* Pages Tab */}
        {activeTab === "pages" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Pages</h2>
              {isAdmin && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  + New Page
                </button>
              )}
            </div>

            {/* Pages Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Slug</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Updated</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pages?.map((page) => (
                    <tr key={page._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditingPageId(page._id)}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {page.title}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        /{page.slug}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[page.status]}`}>
                          {page.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(page._creationTime).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingPageId(page._id)}
                            className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                          >
                            Edit
                          </button>
                          {isAdmin && page.status !== "archived" && (
                            <button
                              onClick={() => archivePage({ token: token!, pageId: page._id })}
                              className="text-xs px-3 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                              Archive
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                if (confirm("Permanently delete this page and all its blocks?")) {
                                  deletePage({ token: token!, pageId: page._id });
                                }
                              }}
                              className="text-xs px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pages?.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                        No pages yet. Create your first page to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Activity (Admin Only) */}
        {activeTab === "pages" && isAdmin && auditLogs && auditLogs.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log._id} className="flex items-center gap-3 text-sm">
                    <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <span className="font-medium text-gray-700">{log.userName}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-600 font-mono text-xs">{log.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Page Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Create New Page</h3>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Page Title</span>
                <input
                  type="text"
                  value={newPage.title}
                  onChange={(e) =>
                    setNewPage({
                      title: e.target.value,
                      slug: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, ""),
                    })
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="About Us"
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Slug</span>
                <input
                  type="text"
                  value={newPage.slug}
                  onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="about-us"
                />
              </label>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePage}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Create Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
