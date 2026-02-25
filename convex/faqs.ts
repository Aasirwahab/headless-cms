import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin, requireEditor, logAudit } from "./auth";
import { validateApiKey } from "./apiKeys";

export const listWithApiKey = query({
    args: { apiKey: v.string(), apiSecret: v.string(), workspaceId: v.id("workspaces"), category: v.optional(v.string()) },
    handler: async (ctx, args) => {
        await validateApiKey(ctx, args.apiKey, args.apiSecret, "pages:read");
        const faqs = await ctx.db
            .query("faqs")
            .withIndex("by_workspace_published", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("isPublished", true)
            )
            .collect();
        const filtered = args.category ? faqs.filter((f) => f.category === args.category) : faqs;
        return filtered.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    },
});

export const listAll = query({
    args: { token: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.token) return [];
        try {
            const user = await requireEditor(ctx, args.token);
            if (!user.workspaceId) return [];
            const faqs = await ctx.db
                .query("faqs")
                .withIndex("by_workspace", (q) => q.eq("workspaceId", user.workspaceId!))
                .collect();
            return faqs.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        } catch { return []; }
    },
});

export const create = mutation({
    args: {
        token: v.string(),
        question: v.string(),
        answer: v.string(),
        category: v.optional(v.string()),
        order: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx, args.token);
        if (!admin.workspaceId) throw new ConvexError("Workspace not found");
        const faqId = await ctx.db.insert("faqs", {
            workspaceId: admin.workspaceId,
            question: args.question,
            answer: args.answer,
            category: args.category,
            order: args.order,
            isPublished: false,
            createdBy: admin._id,
        });
        await logAudit(ctx, admin._id, "faq.create", "faq", faqId);
        return faqId;
    },
});

export const update = mutation({
    args: {
        token: v.string(),
        faqId: v.id("faqs"),
        question: v.optional(v.string()),
        answer: v.optional(v.string()),
        category: v.optional(v.string()),
        order: v.optional(v.number()),
        isPublished: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const user = await requireEditor(ctx, args.token);
        const { token, faqId, ...updates } = args;
        await ctx.db.patch(args.faqId, { ...updates, updatedBy: user._id });
        await logAudit(ctx, user._id, "faq.update", "faq", args.faqId);
    },
});

export const deleteFaq = mutation({
    args: { token: v.string(), faqId: v.id("faqs") },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx, args.token);
        await ctx.db.delete(args.faqId);
        await logAudit(ctx, admin._id, "faq.delete", "faq", args.faqId);
    },
});
