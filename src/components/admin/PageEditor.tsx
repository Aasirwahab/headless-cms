"use client";

// ============================================================
// PAGE EDITOR (Admin Dashboard)
// ============================================================
// Full editing view for a single page. Features:
//   - Page metadata (title, slug, SEO)
//   - Ordered block list with drag-to-reorder potential
//   - Add new blocks (admin only)
//   - Publish / unpublish controls (admin only)
//   - Real-time preview indicator
// ============================================================

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { BlockEditor } from "./BlockEditor";
import type { Id } from "../../../convex/_generated/dataModel";
import type { BlockContent } from "@/types/cms";

type PageEditorProps = {
  pageId: Id<"pages">;
  onBack: () => void;
};

const DEFAULT_BLOCK_CONTENT: Record<string, BlockContent> = {
  hero: {
    type: "hero",
    heading: "New Hero Section",
    subheading: "Add your subheading here",
    alignment: "center",
  },
  text: {
    type: "text",
    body: "<p>Start writing your content here...</p>",
  },
  image: {
    type: "image",
    src: "https://placehold.co/1200x600",
    alt: "Placeholder image",
  },
  cta: {
    type: "cta",
    heading: "Ready to get started?",
    buttonText: "Get Started",
    buttonLink: "/contact",
    variant: "primary",
  },
};

export function PageEditor({ pageId, onBack }: PageEditorProps) {
  const { token, isAdmin } = useAuth();

  // ⚡ Real-time page data — auto-updates when any block changes
  const page = useQuery(api.pages.getForEdit, token ? { token, pageId } : "skip");

  const updateMeta = useMutation(api.pages.updateMeta);
  const publishPage = useMutation(api.pages.publish);
  const unpublishPage = useMutation(api.pages.unpublish);
  const addBlock = useMutation(api.blocks.addBlock);
  const deleteBlock = useMutation(api.blocks.deleteBlock);
  const duplicateBlock = useMutation(api.blocks.duplicateBlock);
  const reorderBlocks = useMutation(api.pages.reorderBlocks);

  const [metaForm, setMetaForm] = useState<{
    title: string;
    slug: string;
    seoTitle: string;
    seoDescription: string;
    ogImage: string;
  } | null>(null);

  // Initialize form when page loads
  if (page && !metaForm) {
    setMetaForm({
      title: page.title,
      slug: page.slug,
      seoTitle: page.seo?.title ?? "",
      seoDescription: page.seo?.description ?? "",
      ogImage: page.seo?.ogImage ?? "",
    });
  }

  if (page === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full" />
      </div>
    );
  }

  if (!page || !metaForm) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Page not found</p>
        <button onClick={onBack} className="mt-4 text-blue-600 underline">
          Go back
        </button>
      </div>
    );
  }

  async function handleSaveMeta() {
    if (!token || !metaForm) return;
    try {
      await updateMeta({
        token,
        pageId,
        title: metaForm.title,
        slug: metaForm.slug,
        seo: {
          title: metaForm.seoTitle,
          description: metaForm.seoDescription,
          ogImage: metaForm.ogImage,
        },
      });
      toast.success("Page settings saved.");
    } catch (err: any) {
      toast.error(err.data ?? err.message);
    }
  }

  async function handleAddBlock(type: string) {
    if (!token) return;
    await addBlock({
      token,
      pageId,
      content: DEFAULT_BLOCK_CONTENT[type] as any,
      layout: { width: "medium", padding: "md" },
    });
  }

  async function handleMoveBlock(fromIndex: number, direction: "up" | "down") {
    if (!token || !page) return;
    const newOrder = [...page.blockOrder];
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= newOrder.length) return;
    [newOrder[fromIndex], newOrder[toIndex]] = [newOrder[toIndex], newOrder[fromIndex]];
    await reorderBlocks({ token, pageId, blockOrder: newOrder });
  }

  const statusColors = {
    draft: "bg-yellow-100 text-yellow-800",
    published: "bg-green-100 text-green-800",
    archived: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to pages
          </button>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[page.status]}`}>
            {page.status}
          </span>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {page.status === "draft" && (
              <button
                onClick={() => publishPage({ token: token!, pageId })}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Publish
              </button>
            )}
            {page.status === "published" && (
              <button
                onClick={() => unpublishPage({ token: token!, pageId })}
                className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Unpublish
              </button>
            )}
          </div>
        )}
      </div>

      {/* Page Metadata */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Page Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 uppercase">Title</span>
            <input
              type="text"
              value={metaForm.title}
              onChange={(e) => setMetaForm({ ...metaForm, title: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 uppercase">
              Slug {!isAdmin && <span className="text-gray-400">(admin only)</span>}
            </span>
            <input
              type="text"
              value={metaForm.slug}
              onChange={(e) => setMetaForm({ ...metaForm, slug: e.target.value })}
              disabled={!isAdmin}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
            />
          </label>
        </div>

        {/* SEO */}
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
            SEO Settings ▾
          </summary>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 uppercase">SEO Title</span>
              <input
                type="text"
                value={metaForm.seoTitle}
                onChange={(e) => setMetaForm({ ...metaForm, seoTitle: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Custom title for search engines"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 uppercase">SEO Description</span>
              <textarea
                value={metaForm.seoDescription}
                onChange={(e) => setMetaForm({ ...metaForm, seoDescription: e.target.value })}
                rows={2}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Meta description for search engines"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 uppercase">OG Image</span>
              <input
                type="text"
                value={metaForm.ogImage}
                onChange={(e) => setMetaForm({ ...metaForm, ogImage: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </label>
          </div>
        </details>

        <button
          onClick={handleSaveMeta}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
        >
          Save Page Settings
        </button>
      </div>

      {/* Blocks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Content Blocks ({page.blocks.length})
          </h2>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">Real-time sync active</span>
          </div>
        </div>

        {page.blocks.filter((b): b is NonNullable<typeof b> => b !== null).map((block, index) => (
          <div key={block._id} className="relative">
            {/* Reorder buttons */}
            {isAdmin && (
              <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                <button
                  onClick={() => handleMoveBlock(index, "up")}
                  disabled={index === 0}
                  className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-xs"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMoveBlock(index, "down")}
                  disabled={index === page.blocks.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-xs"
                >
                  ↓
                </button>
              </div>
            )}

            <BlockEditor
              block={block}
              onDelete={() => deleteBlock({ token: token!, blockId: block._id })}
              onDuplicate={() => duplicateBlock({ token: token!, blockId: block._id })}
            />
          </div>
        ))}

        {/* Add Block (Admin Only) */}
        {isAdmin && (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-500 mb-3">Add a new block</p>
            <div className="flex justify-center gap-2">
              {["hero", "text", "image", "cta"].map((type) => (
                <button
                  key={type}
                  onClick={() => handleAddBlock(type)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium capitalize transition-colors"
                >
                  + {type}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
