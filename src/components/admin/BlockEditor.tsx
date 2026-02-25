"use client";

// ============================================================
// BLOCK EDITOR (Admin Dashboard)
// ============================================================
// Renders the correct editor UI for each block type.
// KEY BEHAVIOR:
//   - Admins see all fields + layout controls + structure actions
//   - Editors see content fields only (text, images, links)
//   - Structure-locked blocks show a lock icon for editors
// ============================================================

import { useState, useId } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Block, BlockContent, BlockLayout } from "@/types/cms";

type BlockEditorProps = {
  block: Block;
  onDelete?: () => void;
  onDuplicate?: () => void;
};

export function BlockEditor({ block, onDelete, onDuplicate }: BlockEditorProps) {
  const { token, isAdmin } = useAuth();
  const updateContent = useMutation(api.blocks.updateContent);
  const updateLayout = useMutation(api.blocks.updateLayout);
  const toggleLock = useMutation(api.blocks.toggleLock);

  const [content, setContent] = useState<BlockContent>(block.content);
  const [layout, setLayout] = useState<BlockLayout>(block.layout);
  const [saving, setSaving] = useState(false);

  async function handleSaveContent() {
    if (!token) return;
    setSaving(true);
    try {
      await updateContent({ token, blockId: block._id, content });
      toast.success(`${typeLabel} content saved.`);
    } catch (err: any) {
      toast.error(err.data ?? err.message);
    }
    setSaving(false);
  }

  async function handleSaveLayout() {
    if (!token || !isAdmin) return;
    setSaving(true);
    try {
      await updateLayout({ token, blockId: block._id, layout });
      toast.success(`${typeLabel} layout updated.`);
    } catch (err: any) {
      toast.error(err.data ?? err.message);
    }
    setSaving(false);
  }

  const typeLabel = {
    hero: "🎬 Hero",
    text: "📝 Text",
    image: "🖼️ Image",
    cta: "🔗 CTA",
  }[block.content.type];

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Block Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">{typeLabel}</span>
          {block.isStructureLocked && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              🔒 Locked
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => toggleLock({ token: token!, blockId: block._id })}
                className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                title={block.isStructureLocked ? "Unlock for editors" : "Lock structure"}
              >
                {block.isStructureLocked ? "Unlock" : "Lock"}
              </button>
              <button
                onClick={onDuplicate}
                className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
              >
                Duplicate
              </button>
              <button
                onClick={onDelete}
                className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content Fields */}
      <div className="p-4 space-y-4">
        {content.type === "hero" && (
          <HeroEditor
            content={content}
            onChange={(c) => setContent(c)}
          />
        )}
        {content.type === "text" && (
          <TextEditor
            content={content}
            onChange={(c) => setContent(c)}
          />
        )}
        {content.type === "image" && (
          <ImageEditor
            content={content}
            onChange={(c) => setContent(c)}
          />
        )}
        {content.type === "cta" && (
          <CTAEditor
            content={content}
            onChange={(c) => setContent(c)}
          />
        )}

        <button
          onClick={handleSaveContent}
          disabled={saving}
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Content"}
        </button>
      </div>

      {/* Layout Controls (Admin Only) */}
      {isAdmin && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Layout (admin only)
          </p>
          <div className="flex gap-4 flex-wrap">
            <label className="text-sm">
              Width
              <select
                value={layout.width ?? "medium"}
                onChange={(e) => setLayout({ ...layout, width: e.target.value as any })}
                className="ml-2 text-sm border rounded px-2 py-1"
              >
                <option value="narrow">Narrow</option>
                <option value="medium">Medium</option>
                <option value="full">Full</option>
              </select>
            </label>
            <label className="text-sm">
              Padding
              <select
                value={layout.padding ?? "md"}
                onChange={(e) => setLayout({ ...layout, padding: e.target.value as any })}
                className="ml-2 text-sm border rounded px-2 py-1"
              >
                <option value="none">None</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </label>
            <label className="text-sm">
              Background
              <input
                type="text"
                value={layout.background ?? ""}
                onChange={(e) => setLayout({ ...layout, background: e.target.value || undefined })}
                placeholder="#ffffff"
                className="ml-2 text-sm border rounded px-2 py-1 w-28"
              />
            </label>
          </div>
          <button
            onClick={handleSaveLayout}
            disabled={saving}
            className="px-3 py-1.5 bg-gray-700 text-white text-xs rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Save Layout
          </button>
        </div>
      )}
    </div>
  );
}

// ── Per-type editors ───────────────────────────────────────

function HeroEditor({
  content,
  onChange,
}: {
  content: Extract<BlockContent, { type: "hero" }>;
  onChange: (c: Extract<BlockContent, { type: "hero" }>) => void;
}) {
  const headingId = useId();
  const subheadingId = useId();
  const bgImgId = useId();
  const ctaTextId = useId();
  const ctaLinkId = useId();
  const alignId = useId();

  return (
    <div className="space-y-3">
      <Field label="Heading" id={headingId}>
        <input
          id={headingId}
          type="text"
          title="Heading"
          value={content.heading}
          onChange={(e) => onChange({ ...content, heading: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Hero Heading"
        />
      </Field>
      <Field label="Subheading" id={subheadingId}>
        <input
          id={subheadingId}
          type="text"
          title="Subheading"
          value={content.subheading ?? ""}
          onChange={(e) => onChange({ ...content, subheading: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Optional subheading"
        />
      </Field>
      <Field label="Background Image URL" id={bgImgId}>
        <input
          id={bgImgId}
          type="text"
          value={content.backgroundImage ?? ""}
          onChange={(e) => onChange({ ...content, backgroundImage: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="https://..."
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CTA Text" id={ctaTextId}>
          <input
            id={ctaTextId}
            type="text"
            title="CTA Text"
            value={content.ctaText ?? ""}
            onChange={(e) => onChange({ ...content, ctaText: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="e.g. Learn More"
          />
        </Field>
        <Field label="CTA Link" id={ctaLinkId}>
          <input
            id={ctaLinkId}
            type="text"
            title="CTA Link"
            value={content.ctaLink ?? ""}
            onChange={(e) => onChange({ ...content, ctaLink: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="/projects"
          />
        </Field>
      </div>
      <Field label="Alignment" id={alignId}>
        <select
          id={alignId}
          title="Alignment"
          value={content.alignment ?? "center"}
          onChange={(e) => onChange({ ...content, alignment: e.target.value as any })}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </Field>
    </div>
  );
}

function TextEditor({
  content,
  onChange,
}: {
  content: Extract<BlockContent, { type: "text" }>;
  onChange: (c: Extract<BlockContent, { type: "text" }>) => void;
}) {
  const maxLen = content.maxLength;
  const currentLen = content.body.length;
  const bodyId = useId();

  return (
    <div className="space-y-3">
      <Field label="Body" id={bodyId}>
        <textarea
          id={bodyId}
          title="Body"
          value={content.body}
          onChange={(e) => onChange({ ...content, body: e.target.value })}
          rows={6}
          className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
          placeholder="Write your content here..."
          maxLength={maxLen}
        />
        {maxLen && (
          <p className={`text-xs mt-1 ${currentLen > maxLen * 0.9 ? "text-red-500" : "text-gray-400"}`}>
            {currentLen} / {maxLen} characters
          </p>
        )}
      </Field>
    </div>
  );
}

function ImageEditor({
  content,
  onChange,
}: {
  content: Extract<BlockContent, { type: "image" }>;
  onChange: (c: Extract<BlockContent, { type: "image" }>) => void;
}) {
  const srcId = useId();
  const altId = useId();
  const captionId = useId();

  return (
    <div className="space-y-3">
      <Field label="Image URL" id={srcId}>
        <input
          id={srcId}
          type="text"
          value={content.src}
          onChange={(e) => onChange({ ...content, src: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="https://..."
        />
      </Field>
      {content.src && (
        <img
          src={content.src}
          alt={content.alt}
          className="max-h-32 rounded-lg border object-cover"
        />
      )}
      <Field label="Alt Text" id={altId}>
        <input
          id={altId}
          type="text"
          title="Alt Text"
          value={content.alt}
          onChange={(e) => onChange({ ...content, alt: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Descriptive text for accessibility"
        />
      </Field>
      <Field label="Caption (optional)" id={captionId}>
        <input
          id={captionId}
          type="text"
          title="Caption"
          value={content.caption ?? ""}
          onChange={(e) => onChange({ ...content, caption: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Optional image caption"
        />
      </Field>
    </div>
  );
}

function CTAEditor({
  content,
  onChange,
}: {
  content: Extract<BlockContent, { type: "cta" }>;
  onChange: (c: Extract<BlockContent, { type: "cta" }>) => void;
}) {
  const headingId = useId();
  const descId = useId();
  const btnTextId = useId();
  const btnLinkId = useId();
  const variantId = useId();

  return (
    <div className="space-y-3">
      <Field label="Heading" id={headingId}>
        <input
          id={headingId}
          type="text"
          title="Heading"
          value={content.heading ?? ""}
          onChange={(e) => onChange({ ...content, heading: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="CTA Heading"
        />
      </Field>
      <Field label="Description" id={descId}>
        <textarea
          id={descId}
          title="Description"
          value={content.description ?? ""}
          onChange={(e) => onChange({ ...content, description: e.target.value })}
          rows={2}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="CTA Description"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Button Text" id={btnTextId}>
          <input
            id={btnTextId}
            type="text"
            title="Button Text"
            value={content.buttonText}
            onChange={(e) => onChange({ ...content, buttonText: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Button label"
          />
        </Field>
        <Field label="Button Link" id={btnLinkId}>
          <input
            id={btnLinkId}
            type="text"
            title="Button Link"
            value={content.buttonLink}
            onChange={(e) => onChange({ ...content, buttonLink: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="/contact"
          />
        </Field>
      </div>
      <Field label="Variant" id={variantId}>
        <select
          id={variantId}
          title="Variant"
          value={content.variant ?? "primary"}
          onChange={(e) => onChange({ ...content, variant: e.target.value as any })}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="outline">Outline</option>
        </select>
      </Field>
    </div>
  );
}

// ── Shared Field wrapper ───────────────────────────────────
function Field({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <label
        htmlFor={id}
        className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
