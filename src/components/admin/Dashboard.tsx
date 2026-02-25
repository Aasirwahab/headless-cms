"use client";

// ============================================================
// ADMIN DASHBOARD — PAGES LIST
// ============================================================

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { PageEditor } from "./PageEditor";
import { ConnectFrontend } from "./ConnectFrontend";
import type { Id } from "../../../convex/_generated/dataModel";

import { EntityManager } from "./EntityManager";
import { SiteSettingsManager } from "./SiteSettingsManager";
import type { Project, Service, Testimonial, FAQ } from "@/types/cms";

export function Dashboard() {
  const { user, token, isAdmin, logout } = useAuth();
  const pages = useQuery(api.pages.listAll, token ? { token } : "skip");
  const projects = useQuery(api.projects.listAll, token ? { token } : "skip");
  const services = useQuery(api.services.listAll, token ? { token } : "skip");
  const testimonials = useQuery(api.testimonials.listAll, token ? { token } : "skip");
  const faqs = useQuery(api.faqs.listAll, token ? { token } : "skip");
  const auditLogs = useQuery(api.auditLog.getRecent, token && isAdmin ? { token, limit: 10 } : "skip");

  const createPage = useMutation(api.pages.create);
  const deletePage = useMutation(api.pages.deletePage);
  const archivePage = useMutation(api.pages.archive);

  // Dynamic Mutations
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const deleteProject = useMutation(api.projects.deleteProject);

  const createService = useMutation(api.services.create);
  const updateService = useMutation(api.services.update);
  const deleteService = useMutation(api.services.deleteService);

  const createTestimonial = useMutation(api.testimonials.create);
  const updateTestimonial = useMutation(api.testimonials.update);
  const deleteTestimonial = useMutation(api.testimonials.deleteTestimonial);

  const createFAQ = useMutation(api.faqs.create);
  const updateFAQ = useMutation(api.faqs.update);
  const deleteFAQ = useMutation(api.faqs.deleteFaq);

  const [editingPageId, setEditingPageId] = useState<Id<"pages"> | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPage, setNewPage] = useState({ title: "", slug: "" });
  const [activeTab, setActiveTab] = useState<"pages" | "projects" | "services" | "testimonials" | "faqs" | "settings" | "connect">("pages");

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

  const navItems = [
    { id: "pages", label: "Pages" },
    { id: "projects", label: "Projects" },
    { id: "services", label: "Services" },
    { id: "testimonials", label: "Testimonials" },
    { id: "faqs", label: "FAQs" },
    { id: "settings", label: "Settings" }
  ] as const;

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
          <nav className="flex gap-6 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === item.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                {item.label}
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => setActiveTab("connect")}
                className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "connect"
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

      <div className="max-w-6xl mx-auto p-6 space-y-8 pb-20">
        {/* Connect Frontend Tab */}
        {activeTab === "connect" && isAdmin && <ConnectFrontend />}

        {/* Home/Pages Tab */}
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
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-nowrap">Updated</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 text-nowrap">Actions</th>
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
                        <div className="flex justify-end gap-2 text-nowrap">
                          <button
                            onClick={() => setEditingPageId(page._id)}
                            className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                          >
                            Edit
                          </button>
                          {isAdmin && page.status !== "archived" && (
                            <button
                              onClick={async () => {
                                try {
                                  await archivePage({ token: token!, pageId: page._id });
                                  toast.success("Page archived.");
                                } catch (err: any) {
                                  toast.error(err.data ?? err.message);
                                }
                              }}
                              className="text-xs px-3 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                              Archive
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={async () => {
                                if (confirm("Permanently delete this page and all its blocks?")) {
                                  try {
                                    await deletePage({ token: token!, pageId: page._id });
                                    toast.success("Page deleted.");
                                  } catch (err: any) {
                                    toast.error(err.data ?? err.message);
                                  }
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

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <EntityManager<Project>
            title="Projects"
            items={projects}
            isAdmin={isAdmin}
            fields={[
              { key: "title", label: "Project Title", type: "text" },
              { key: "slug", label: "Slug", type: "text" },
              { key: "category", label: "Category", type: "text" },
              { key: "location", label: "Location", type: "text" },
              { key: "year", label: "Year", type: "text" },
              { key: "imageUrl", label: "Cover Image URL", type: "text" },
              { key: "description", label: "Description", type: "textarea" },
              { key: "brief", label: "Brief", type: "textarea" },
              { key: "solution", label: "Solution", type: "textarea" },
              { key: "outcome", label: "Outcome", type: "textarea" },
              { key: "size", label: "Size", type: "text" },
              { key: "stage", label: "Stage", type: "text" },
              { key: "isPublished", label: "Is Published", type: "checkbox" },
            ]}
            onSave={async (data) => {
              const { _id, _creationTime, ...fields } = data;
              if (_id) {
                await updateProject({ token: token!, projectId: _id, ...fields });
              } else {
                await createProject({ token: token!, ...fields });
              }
            }}
            onDelete={async (id) => {
              await deleteProject({ token: token!, projectId: id });
            }}
            renderItem={(item) => (
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">{item.title}</span>
                <span className="text-xs text-gray-500 font-mono capitalize">{item.category} · {item.location}</span>
              </div>
            )}
          />
        )}

        {/* Services Tab */}
        {activeTab === "services" && (
          <EntityManager<Service>
            title="Services"
            items={services}
            isAdmin={isAdmin}
            fields={[
              { key: "title", label: "Service Title", type: "text" },
              { key: "slug", label: "Slug", type: "text" },
              { key: "description", label: "Description", type: "textarea" },
              { key: "deliverables", label: "Deliverables", type: "list" },
              { key: "timeline", label: "Timeline", type: "text" },
              { key: "isPublished", label: "Is Published", type: "checkbox" },
            ]}
            onSave={async (data) => {
              const { _id, _creationTime, ...fields } = data;
              if (_id) {
                await updateService({ token: token!, serviceId: _id, ...fields });
              } else {
                await createService({ token: token!, ...fields });
              }
            }}
            onDelete={async (id) => {
              await deleteService({ token: token!, serviceId: id });
            }}
            renderItem={(item) => (
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">{item.title}</span>
                <span className="text-xs text-gray-500">{item.description?.slice(0, 100)}...</span>
              </div>
            )}
          />
        )}

        {/* Testimonials Tab */}
        {activeTab === "testimonials" && (
          <EntityManager<Testimonial>
            title="Testimonials"
            items={testimonials}
            isAdmin={isAdmin}
            fields={[
              { key: "author", label: "Author Name", type: "text" },
              { key: "role", label: "Author Role", type: "text" },
              { key: "quote", label: "Quote", type: "textarea" },
              { key: "project", label: "Project Name", type: "text" },
              { key: "isPublished", label: "Is Published", type: "checkbox" },
            ]}
            onSave={async (data) => {
              const { _id, _creationTime, ...fields } = data;
              if (_id) {
                await updateTestimonial({ token: token!, testimonialId: _id, ...fields });
              } else {
                await createTestimonial({ token: token!, ...fields });
              }
            }}
            onDelete={async (id) => {
              await deleteTestimonial({ token: token!, testimonialId: id });
            }}
            renderItem={(item) => (
              <div className="flex flex-col italic text-gray-600">
                "{item.quote.slice(0, 80)}..."
                <span className="mt-1 font-bold text-gray-900 not-italic"> - {item.author} ({item.project})</span>
              </div>
            )}
          />
        )}

        {/* FAQs Tab */}
        {activeTab === "faqs" && (
          <EntityManager<FAQ>
            title="FAQs"
            items={faqs}
            isAdmin={isAdmin}
            fields={[
              { key: "question", label: "Question", type: "textarea" },
              { key: "answer", label: "Answer", type: "textarea" },
              { key: "category", label: "Category", type: "text" },
              { key: "isPublished", label: "Is Published", type: "checkbox" },
            ]}
            onSave={async (data) => {
              const { _id, _creationTime, ...fields } = data;
              if (_id) {
                await updateFAQ({ token: token!, faqId: _id, ...fields });
              } else {
                await createFAQ({ token: token!, ...fields });
              }
            }}
            onDelete={async (id) => {
              await deleteFAQ({ token: token!, faqId: id });
            }}
            renderItem={(item) => (
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">{item.question}</span>
                <span className="text-xs text-gray-500">{item.answer.slice(0, 120)}...</span>
              </div>
            )}
          />
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && <SiteSettingsManager />}

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
