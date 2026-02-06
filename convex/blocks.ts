import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin, requireEditor, logAudit } from "./auth";

// ============================================================
// BLOCKS — QUERIES & MUTATIONS
// ============================================================
// Blocks are the atomic content units. The key design principle:
//
//   ADMIN controls STRUCTURE (block type, layout, order, locks)
//   EDITOR controls CONTENT (text, images, links within a block)
//
// This separation ensures clients can never break the layout.
// ============================================================

// Block content validators per type
const heroContent = v.object({
  type: v.literal("hero"),
  heading: v.string(),
  subheading: v.optional(v.string()),
  backgroundImage: v.optional(v.string()),
  ctaText: v.optional(v.string()),
  ctaLink: v.optional(v.string()),
  alignment: v.optional(v.union(v.literal("left"), v.literal("center"), v.literal("right"))),
});

const textContent = v.object({
  type: v.literal("text"),
  body: v.string(),
  maxLength: v.optional(v.number()),
});

const imageContent = v.object({
  type: v.literal("image"),
  src: v.string(),
  alt: v.string(),
  caption: v.optional(v.string()),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
});

const ctaContent = v.object({
  type: v.literal("cta"),
  heading: v.optional(v.string()),
  description: v.optional(v.string()),
  buttonText: v.string(),
  buttonLink: v.string(),
  variant: v.optional(v.union(v.literal("primary"), v.literal("secondary"), v.literal("outline"))),
});

const blockContentValidator = v.union(heroContent, textContent, imageContent, ctaContent);

const layoutValidator = v.object({
  width: v.optional(v.union(v.literal("narrow"), v.literal("medium"), v.literal("full"))),
  padding: v.optional(v.union(v.literal("none"), v.literal("sm"), v.literal("md"), v.literal("lg"))),
  background: v.optional(v.string()),
});

// ── Get blocks for a page ──────────────────────────────────
export const getByPage = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("blocks")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .collect();
  },
});

// ── Add block to page (admin only) ─────────────────────────
// Only admins can add blocks — this controls page structure.
export const addBlock = mutation({
  args: {
    token: v.string(),
    pageId: v.id("pages"),
    content: blockContentValidator,
    layout: layoutValidator,
    position: v.optional(v.number()), // Insert at position, default: end
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new ConvexError("Page not found");

    const blockId = await ctx.db.insert("blocks", {
      pageId: args.pageId,
      content: args.content,
      layout: args.layout,
      isStructureLocked: false,
      createdBy: admin._id,
    });

    // Insert at position or append
    const newOrder = [...page.blockOrder];
    if (args.position !== undefined && args.position < newOrder.length) {
      newOrder.splice(args.position, 0, blockId);
    } else {
      newOrder.push(blockId);
    }

    await ctx.db.patch(args.pageId, {
      blockOrder: newOrder,
      updatedBy: admin._id,
    });

    await logAudit(ctx, admin._id, "block.create", "block", blockId, JSON.stringify({ type: args.content.type }));
    return blockId;
  },
});

// ── Update block CONTENT (editor or admin) ─────────────────
// This is the key mutation clients use. They can change text, images,
// links — but NOT the block type or layout.
export const updateContent = mutation({
  args: {
    token: v.string(),
    blockId: v.id("blocks"),
    content: blockContentValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireEditor(ctx, args.token);
    const block = await ctx.db.get(args.blockId);
    if (!block) throw new ConvexError("Block not found");

    // Editors cannot change the block type
    if (block.content.type !== args.content.type) {
      if (user.role !== "admin") {
        throw new ConvexError("Only admins can change block types");
      }
    }

    // Enforce max length for text blocks
    if (args.content.type === "text" && block.content.type === "text") {
      const maxLen = block.content.maxLength;
      if (maxLen && args.content.body.length > maxLen) {
        throw new ConvexError(`Text exceeds maximum length of ${maxLen} characters`);
      }
    }

    await ctx.db.patch(args.blockId, {
      content: args.content,
      updatedBy: user._id,
    });

    await logAudit(ctx, user._id, "block.update_content", "block", args.blockId);
  },
});

// ── Update block LAYOUT (admin only) ───────────────────────
// Layout changes are structural — only admins can modify these.
export const updateLayout = mutation({
  args: {
    token: v.string(),
    blockId: v.id("blocks"),
    layout: layoutValidator,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    await ctx.db.patch(args.blockId, {
      layout: args.layout,
      updatedBy: admin._id,
    });
    await logAudit(ctx, admin._id, "block.update_layout", "block", args.blockId);
  },
});

// ── Toggle structure lock (admin only) ─────────────────────
export const toggleLock = mutation({
  args: {
    token: v.string(),
    blockId: v.id("blocks"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    const block = await ctx.db.get(args.blockId);
    if (!block) throw new ConvexError("Block not found");

    await ctx.db.patch(args.blockId, {
      isStructureLocked: !block.isStructureLocked,
    });
    await logAudit(ctx, admin._id, "block.toggle_lock", "block", args.blockId);
  },
});

// ── Delete block (admin only) ──────────────────────────────
export const deleteBlock = mutation({
  args: {
    token: v.string(),
    blockId: v.id("blocks"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    const block = await ctx.db.get(args.blockId);
    if (!block) throw new ConvexError("Block not found");

    // Remove from page's blockOrder
    const page = await ctx.db.get(block.pageId);
    if (page) {
      await ctx.db.patch(block.pageId, {
        blockOrder: page.blockOrder.filter((id) => id !== args.blockId),
        updatedBy: admin._id,
      });
    }

    await ctx.db.delete(args.blockId);
    await logAudit(ctx, admin._id, "block.delete", "block", args.blockId);
  },
});

// ── Duplicate block (admin only) ───────────────────────────
export const duplicateBlock = mutation({
  args: {
    token: v.string(),
    blockId: v.id("blocks"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    const block = await ctx.db.get(args.blockId);
    if (!block) throw new ConvexError("Block not found");

    const newBlockId = await ctx.db.insert("blocks", {
      pageId: block.pageId,
      content: block.content,
      layout: block.layout,
      isStructureLocked: false,
      createdBy: admin._id,
    });

    // Insert after original in blockOrder
    const page = await ctx.db.get(block.pageId);
    if (page) {
      const idx = page.blockOrder.indexOf(args.blockId);
      const newOrder = [...page.blockOrder];
      newOrder.splice(idx + 1, 0, newBlockId);
      await ctx.db.patch(block.pageId, { blockOrder: newOrder, updatedBy: admin._id });
    }

    await logAudit(ctx, admin._id, "block.duplicate", "block", newBlockId);
    return newBlockId;
  },
});
