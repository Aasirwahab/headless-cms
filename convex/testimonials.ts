import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin, requireEditor, logAudit } from "./auth";
import { validateApiKey } from "./apiKeys";

// ============================================================
// TESTIMONIALS — QUERIES & MUTATIONS
// ============================================================

// ── PUBLIC: List all published testimonials (API key auth) ─
export const listWithApiKey = query({
    args: {
        apiKey: v.string(),
        apiSecret: v.string(),
    },
    handler: async (ctx, args) => {
        await validateApiKey(ctx, args.apiKey, args.apiSecret, "pages:read");

        const testimonials = await ctx.db
            .query("testimonials")
            .withIndex("by_published", (q) => q.eq("isPublished", true))
            .collect();

        return testimonials.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    },
});

// ── ADMIN: List all testimonials ───────────────────────────
export const listAll = query({
    args: { token: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.token) return [];
        try {
            await requireEditor(ctx, args.token);
        } catch {
            return [];
        }
        const testimonials = await ctx.db.query("testimonials").collect();
        return testimonials.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    },
});

// ── Create testimonial (admin only) ────────────────────────
export const create = mutation({
    args: {
        token: v.string(),
        quote: v.string(),
        author: v.string(),
        project: v.optional(v.string()),
        role: v.optional(v.string()),
        avatar: v.optional(v.string()),
        order: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx, args.token);

        const testimonialId = await ctx.db.insert("testimonials", {
            quote: args.quote,
            author: args.author,
            project: args.project,
            role: args.role,
            avatar: args.avatar,
            order: args.order,
            isPublished: false,
            createdBy: admin._id,
        });

        await logAudit(ctx, admin._id, "testimonial.create", "testimonial", testimonialId);
        return testimonialId;
    },
});

// ── Update testimonial ─────────────────────────────────────
export const update = mutation({
    args: {
        token: v.string(),
        testimonialId: v.id("testimonials"),
        quote: v.optional(v.string()),
        author: v.optional(v.string()),
        project: v.optional(v.string()),
        role: v.optional(v.string()),
        avatar: v.optional(v.string()),
        order: v.optional(v.number()),
        isPublished: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const user = await requireEditor(ctx, args.token);

        const { token, testimonialId, ...updates } = args;
        await ctx.db.patch(args.testimonialId, {
            ...updates,
            updatedBy: user._id,
        });

        await logAudit(ctx, user._id, "testimonial.update", "testimonial", args.testimonialId);
    },
});

// ── Delete testimonial (admin only) ────────────────────────
export const deleteTestimonial = mutation({
    args: { token: v.string(), testimonialId: v.id("testimonials") },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx, args.token);
        await ctx.db.delete(args.testimonialId);
        await logAudit(ctx, admin._id, "testimonial.delete", "testimonial", args.testimonialId);
    },
});
