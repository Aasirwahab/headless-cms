import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin, requireEditor, logAudit } from "./auth";
import { validateApiKey } from "./apiKeys";

export const getWithApiKey = query({
    args: { apiKey: v.string(), apiSecret: v.string(), workspaceId: v.id("workspaces"), key: v.optional(v.string()) },
    handler: async (ctx, args) => {
        await validateApiKey(ctx, args.apiKey, args.apiSecret, "pages:read");
        const settingsKey = args.key ?? "general";
        const allSettings = await ctx.db
            .query("siteSettings")
            .withIndex("by_workspace_key", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("key", settingsKey)
            )
            .unique();
        return allSettings ?? null;
    },
});

export const getAllWithApiKey = query({
    args: { apiKey: v.string(), apiSecret: v.string(), workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        await validateApiKey(ctx, args.apiKey, args.apiSecret, "pages:read");
        const allSettings = await ctx.db
            .query("siteSettings")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
            .collect();
        const result: Record<string, any> = {};
        for (const s of allSettings) result[s.key] = s;
        return result;
    },
});

export const get = query({
    args: { token: v.optional(v.string()), key: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.token) return null;
        try {
            const user = await requireEditor(ctx, args.token);
            if (!user.workspaceId) return null;
            const settingsKey = args.key ?? "general";
            return await ctx.db
                .query("siteSettings")
                .withIndex("by_workspace_key", (q) =>
                    q.eq("workspaceId", user.workspaceId!).eq("key", settingsKey)
                )
                .unique();
        } catch { return null; }
    },
});

export const getAll = query({
    args: { token: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.token) return {};
        try {
            const user = await requireEditor(ctx, args.token);
            if (!user.workspaceId) return {};
            const allSettings = await ctx.db
                .query("siteSettings")
                .withIndex("by_workspace", (q) => q.eq("workspaceId", user.workspaceId!))
                .collect();
            const result: Record<string, any> = {};
            for (const s of allSettings) result[s.key] = s;
            return result;
        } catch { return {}; }
    },
});

export const upsert = mutation({
    args: {
        token: v.string(),
        key: v.string(),
        siteName: v.optional(v.string()),
        tagline: v.optional(v.string()),
        description: v.optional(v.string()),
        logo: v.optional(v.string()),
        favicon: v.optional(v.string()),
        contactEmail: v.optional(v.string()),
        contactPhone: v.optional(v.string()),
        address: v.optional(v.string()),
        socialLinks: v.optional(v.object({
            instagram: v.optional(v.string()),
            twitter: v.optional(v.string()),
            linkedin: v.optional(v.string()),
            facebook: v.optional(v.string()),
            youtube: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx, args.token);
        if (!admin.workspaceId) throw new ConvexError("Workspace not found");

        const existing = await ctx.db
            .query("siteSettings")
            .withIndex("by_workspace_key", (q) =>
                q.eq("workspaceId", admin.workspaceId!).eq("key", args.key)
            )
            .unique();

        const { token, ...data } = args;

        if (existing) {
            await ctx.db.patch(existing._id, { ...data, workspaceId: admin.workspaceId, updatedBy: admin._id });
            await logAudit(ctx, admin._id, "settings.update", "siteSettings", existing._id);
            return existing._id;
        } else {
            const settingsId = await ctx.db.insert("siteSettings", {
                ...data,
                workspaceId: admin.workspaceId,
                updatedBy: admin._id,
            });
            await logAudit(ctx, admin._id, "settings.create", "siteSettings", settingsId);
            return settingsId;
        }
    },
});
