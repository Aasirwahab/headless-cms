import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin, requireEditor, logAudit } from "./auth";

// ============================================================
// GLOBAL SECTIONS
// ============================================================
// Reusable content blocks (headers, footers, CTAs) that can be:
//   - Auto-applied to all pages (isDefault = true)
//   - Overridden per-page
//   - Edited by editors (content only), structured by admins
// ============================================================

const blockContentValidator = v.union(
  v.object({
    type: v.literal("hero"),
    heading: v.string(),
    subheading: v.optional(v.string()),
    backgroundImage: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    ctaLink: v.optional(v.string()),
    alignment: v.optional(v.union(v.literal("left"), v.literal("center"), v.literal("right"))),
  }),
  v.object({
    type: v.literal("text"),
    body: v.string(),
    maxLength: v.optional(v.number()),
  }),
  v.object({
    type: v.literal("image"),
    src: v.string(),
    alt: v.string(),
    caption: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  }),
  v.object({
    type: v.literal("cta"),
    heading: v.optional(v.string()),
    description: v.optional(v.string()),
    buttonText: v.string(),
    buttonLink: v.string(),
    variant: v.optional(v.union(v.literal("primary"), v.literal("secondary"), v.literal("outline"))),
  })
);

// ── PUBLIC: Get default globals ────────────────────────────
export const getDefaults = query({
  handler: async (ctx) => {
    const header = await ctx.db
      .query("globalSections")
      .withIndex("by_type", (q) => q.eq("type", "header"))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    const footer = await ctx.db
      .query("globalSections")
      .withIndex("by_type", (q) => q.eq("type", "footer"))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    return { header, footer };
  },
});

// ── List all global sections ───────────────────────────────
export const listAll = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token) return [];
    try {
      await requireEditor(ctx, args.token);
    } catch {
      return [];
    }
    return await ctx.db.query("globalSections").collect();
  },
});

// ── Get by slug ────────────────────────────────────────────
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("globalSections")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

// ── Create global section (admin only) ─────────────────────
export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    slug: v.string(),
    type: v.union(v.literal("header"), v.literal("footer"), v.literal("cta"), v.literal("custom")),
    content: blockContentValidator,
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    if (!admin.workspaceId) throw new ConvexError("Workspace not found");

    // If setting as default, unset existing defaults of same type
    if (args.isDefault) {
      const existing = await ctx.db
        .query("globalSections")
        .withIndex("by_type", (q) => q.eq("type", args.type))
        .filter((q) => q.eq(q.field("isDefault"), true))
        .collect();
      for (const section of existing) {
        await ctx.db.patch(section._id, { isDefault: false });
      }
    }

    const id = await ctx.db.insert("globalSections", {
      workspaceId: admin.workspaceId,
      name: args.name,
      slug: args.slug,
      type: args.type,
      content: args.content,
      isDefault: args.isDefault,
      createdBy: admin._id,
    });

    await logAudit(ctx, admin._id, "globalSection.create", "globalSection", id);
    return id;
  },
});

// ── Update content (editor or admin) ───────────────────────
export const updateContent = mutation({
  args: {
    token: v.string(),
    sectionId: v.id("globalSections"),
    content: blockContentValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireEditor(ctx, args.token);
    const section = await ctx.db.get(args.sectionId);
    if (!section) throw new ConvexError("Global section not found");

    // Editors cannot change the content type
    if (section.content.type !== args.content.type && user.role !== "admin") {
      throw new ConvexError("Only admins can change section content types");
    }

    await ctx.db.patch(args.sectionId, {
      content: args.content,
      updatedBy: user._id,
    });

    await logAudit(ctx, user._id, "globalSection.update_content", "globalSection", args.sectionId);
  },
});

// ── Delete global section (admin only) ─────────────────────
export const deleteSection = mutation({
  args: {
    token: v.string(),
    sectionId: v.id("globalSections"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    await ctx.db.delete(args.sectionId);
    await logAudit(ctx, admin._id, "globalSection.delete", "globalSection", args.sectionId);
  },
});
