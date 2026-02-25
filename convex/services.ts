import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin, requireEditor, logAudit } from "./auth";
import { validateApiKey } from "./apiKeys";

export const listWithApiKey = query({
    args: { apiKey: v.string(), apiSecret: v.string(), workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        await validateApiKey(ctx, args.apiKey, args.apiSecret, "pages:read");
        const services = await ctx.db
            .query("services")
            .withIndex("by_workspace_published", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("isPublished", true)
            )
            .collect();
        return services.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    },
});

export const getBySlugWithApiKey = query({
    args: { slug: v.string(), apiKey: v.string(), apiSecret: v.string(), workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        await validateApiKey(ctx, args.apiKey, args.apiSecret, "pages:read");
        const service = await ctx.db
            .query("services")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .unique();
        if (!service || !service.isPublished || service.workspaceId !== args.workspaceId) return null;
        return service;
    },
});

export const listAll = query({
    args: { token: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.token) return [];
        try {
            const user = await requireEditor(ctx, args.token);
            if (!user.workspaceId) return [];
            const services = await ctx.db
                .query("services")
                .withIndex("by_workspace", (q) => q.eq("workspaceId", user.workspaceId!))
                .collect();
            return services.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        } catch { return []; }
    },
});

export const create = mutation({
    args: {
        token: v.string(),
        slug: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        deliverables: v.optional(v.array(v.string())),
        timeline: v.optional(v.string()),
        icon: v.optional(v.string()),
        order: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx, args.token);
        if (!admin.workspaceId) throw new ConvexError("Workspace not found");
        const serviceId = await ctx.db.insert("services", {
            workspaceId: admin.workspaceId,
            slug: args.slug,
            title: args.title,
            description: args.description,
            deliverables: args.deliverables,
            timeline: args.timeline,
            icon: args.icon,
            order: args.order,
            isPublished: false,
            createdBy: admin._id,
        });
        await logAudit(ctx, admin._id, "service.create", "service", serviceId);
        return serviceId;
    },
});

export const update = mutation({
    args: {
        token: v.string(),
        serviceId: v.id("services"),
        slug: v.optional(v.string()),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        deliverables: v.optional(v.array(v.string())),
        timeline: v.optional(v.string()),
        icon: v.optional(v.string()),
        order: v.optional(v.number()),
        isPublished: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const user = await requireEditor(ctx, args.token);
        const service = await ctx.db.get(args.serviceId);
        if (!service) throw new ConvexError("Service not found");
        const { token, serviceId, ...updates } = args;
        await ctx.db.patch(args.serviceId, { ...updates, updatedBy: user._id });
        await logAudit(ctx, user._id, "service.update", "service", args.serviceId);
    },
});

export const deleteService = mutation({
    args: { token: v.string(), serviceId: v.id("services") },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx, args.token);
        await ctx.db.delete(args.serviceId);
        await logAudit(ctx, admin._id, "service.delete", "service", args.serviceId);
    },
});
