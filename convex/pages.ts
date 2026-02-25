import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin, requireEditor, logAudit } from "./auth";
import { validateApiKey } from "./apiKeys";

// ============================================================
// PAGES — QUERIES & MUTATIONS
// ============================================================
// Pages are the top-level content units. Each page:
//   - Has a unique slug for routing
//   - Contains an ordered array of block IDs
//   - Supports draft → published → archived workflow
//   - Has SEO metadata
//
// PERMISSION MODEL:
//   Admin  → can create, delete, change structure, publish
//   Editor → can update title, SEO text (not slug or structure)
// ============================================================

// ── PUBLIC: Get published page by slug (for frontends) ─────
// This is the primary query frontends subscribe to via useQuery.
// It returns the full page with all block content hydrated.
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!page || page.status !== "published") {
      return null;
    }

    // Hydrate blocks in order
    const blocks = await Promise.all(
      page.blockOrder.map((blockId) => ctx.db.get(blockId))
    );

    // Get global sections (header/footer)
    const defaultHeader = await ctx.db
      .query("globalSections")
      .withIndex("by_type", (q) => q.eq("type", "header"))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    const defaultFooter = await ctx.db
      .query("globalSections")
      .withIndex("by_type", (q) => q.eq("type", "footer"))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    const header = page.headerOverride
      ? await ctx.db.get(page.headerOverride)
      : defaultHeader;

    const footer = page.footerOverride
      ? await ctx.db.get(page.footerOverride)
      : defaultFooter;

    return {
      _id: page._id,
      title: page.title,
      slug: page.slug,
      seo: page.seo,
      blocks: blocks.filter(Boolean),
      header: header ?? null,
      footer: footer ?? null,
      publishedAt: page.publishedAt,
    };
  },
});

// ── PUBLIC: List all published pages (for nav/sitemap) ─────
export const listPublished = query({
  handler: async (ctx) => {
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    return pages.map((p) => ({
      _id: p._id,
      title: p.title,
      slug: p.slug,
      seo: p.seo,
      publishedAt: p.publishedAt,
    }));
  },
});

// ── ADMIN: List all pages (any status) ─────────────────────
export const listAll = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token) return [];
    try {
      await requireEditor(ctx, args.token);
    } catch {
      return [];
    }
    return await ctx.db.query("pages").order("desc").collect();
  },
});

// ── ADMIN: Get page with blocks for editing ────────────────
export const getForEdit = query({
  args: { token: v.optional(v.string()), pageId: v.id("pages") },
  handler: async (ctx, args) => {
    if (!args.token) return null;
    try {
      await requireEditor(ctx, args.token);
    } catch {
      return null;
    }

    const page = await ctx.db.get(args.pageId);
    if (!page) return null;

    const blocks = await Promise.all(
      page.blockOrder.map((blockId) => ctx.db.get(blockId))
    );

    return {
      ...page,
      blocks: blocks.filter(Boolean),
    };
  },
});

// ── Create page (admin only) ───────────────────────────────
export const create = mutation({
  args: {
    token: v.string(),
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    if (!admin.workspaceId) throw new ConvexError("Workspace not found");

    // Validate slug uniqueness
    const existing = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      throw new ConvexError(`A page with slug "${args.slug}" already exists`);
    }

    // Validate slug format
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.slug)) {
      throw new ConvexError("Slug must be lowercase letters, numbers, and hyphens only");
    }

    const pageId = await ctx.db.insert("pages", {
      workspaceId: admin.workspaceId,
      title: args.title,
      slug: args.slug,
      description: args.description,
      status: "draft",
      seo: {
        title: args.title,
        description: args.description ?? "",
      },
      blockOrder: [],
      createdBy: admin._id,
    });

    await logAudit(ctx, admin._id, "page.create", "page", pageId);
    return pageId;
  },
});

// ── Update page metadata ───────────────────────────────────
// Editors can update title and SEO text. Only admins can change slug.
export const updateMeta = mutation({
  args: {
    token: v.string(),
    pageId: v.id("pages"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    seo: v.optional(
      v.object({
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        ogImage: v.optional(v.string()),
        noIndex: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireEditor(ctx, args.token);
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new ConvexError("Page not found");

    // Slug changes require admin
    if (args.slug && args.slug !== page.slug) {
      if (user.role !== "admin") {
        throw new ConvexError("Only admins can change page slugs");
      }
      const newSlug = args.slug; // Extract to const for type narrowing
      const existing = await ctx.db
        .query("pages")
        .withIndex("by_slug", (q) => q.eq("slug", newSlug))
        .unique();
      if (existing) {
        throw new ConvexError(`Slug "${args.slug}" is already taken`);
      }
    }

    const updates: Record<string, any> = { updatedBy: user._id };
    if (args.title !== undefined) updates.title = args.title;
    if (args.slug !== undefined) updates.slug = args.slug;
    if (args.description !== undefined) updates.description = args.description;
    if (args.seo !== undefined) updates.seo = { ...page.seo, ...args.seo };

    await ctx.db.patch(args.pageId, updates);
    await logAudit(ctx, user._id, "page.update_meta", "page", args.pageId);
  },
});

// ── Publish page (admin only) ──────────────────────────────
export const publish = mutation({
  args: { token: v.string(), pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new ConvexError("Page not found");

    await ctx.db.patch(args.pageId, {
      status: "published",
      publishedAt: Date.now(),
      updatedBy: admin._id,
    });

    await logAudit(ctx, admin._id, "page.publish", "page", args.pageId);
  },
});

// ── Unpublish (revert to draft) ────────────────────────────
export const unpublish = mutation({
  args: { token: v.string(), pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    await ctx.db.patch(args.pageId, {
      status: "draft",
      updatedBy: admin._id,
    });
    await logAudit(ctx, admin._id, "page.unpublish", "page", args.pageId);
  },
});

// ── Archive page (admin only) ──────────────────────────────
export const archive = mutation({
  args: { token: v.string(), pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    await ctx.db.patch(args.pageId, {
      status: "archived",
      updatedBy: admin._id,
    });
    await logAudit(ctx, admin._id, "page.archive", "page", args.pageId);
  },
});

// ── Delete page (admin only) ───────────────────────────────
export const deletePage = mutation({
  args: { token: v.string(), pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new ConvexError("Page not found");

    // Delete all blocks belonging to this page
    for (const blockId of page.blockOrder) {
      await ctx.db.delete(blockId);
    }

    await ctx.db.delete(args.pageId);
    await logAudit(ctx, admin._id, "page.delete", "page", args.pageId);
  },
});

// ── Reorder blocks on a page (admin only) ──────────────────
export const reorderBlocks = mutation({
  args: {
    token: v.string(),
    pageId: v.id("pages"),
    blockOrder: v.array(v.id("blocks")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    await ctx.db.patch(args.pageId, {
      blockOrder: args.blockOrder,
      updatedBy: admin._id,
    });
    await logAudit(ctx, admin._id, "page.reorder_blocks", "page", args.pageId);
  },
});

// ============================================================
// API KEY AUTHENTICATED QUERIES (for external frontends)
// ============================================================
// These queries require an API key + secret for authentication.
// They only return published content — no drafts, no admin data.

// ── Get published page by slug (API key auth) ──────────────
export const getBySlugWithApiKey = query({
  args: {
    slug: v.string(),
    apiKey: v.string(),
    apiSecret: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate API key and check pages:read permission
    await validateApiKey(ctx, args.apiKey, args.apiSecret, "pages:read");

    const page = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!page || page.status !== "published") {
      return null;
    }

    // Hydrate blocks in order
    const blocks = await Promise.all(
      page.blockOrder.map((blockId) => ctx.db.get(blockId))
    );

    // Get global sections (header/footer)
    const defaultHeader = await ctx.db
      .query("globalSections")
      .withIndex("by_type", (q) => q.eq("type", "header"))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    const defaultFooter = await ctx.db
      .query("globalSections")
      .withIndex("by_type", (q) => q.eq("type", "footer"))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    const header = page.headerOverride
      ? await ctx.db.get(page.headerOverride)
      : defaultHeader;

    const footer = page.footerOverride
      ? await ctx.db.get(page.footerOverride)
      : defaultFooter;

    return {
      _id: page._id,
      title: page.title,
      slug: page.slug,
      seo: page.seo,
      blocks: blocks.filter(Boolean),
      header: header ?? null,
      footer: footer ?? null,
      publishedAt: page.publishedAt,
    };
  },
});

// ── List all published pages (API key auth) ────────────────
export const listPublishedWithApiKey = query({
  args: {
    apiKey: v.string(),
    apiSecret: v.string(),
  },
  handler: async (ctx, args) => {
    await validateApiKey(ctx, args.apiKey, args.apiSecret, "pages:read");

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    return pages.map((p) => ({
      _id: p._id,
      title: p.title,
      slug: p.slug,
      seo: p.seo,
      publishedAt: p.publishedAt,
    }));
  },
});
