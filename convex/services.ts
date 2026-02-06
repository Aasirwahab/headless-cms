import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin, requireEditor, logAudit } from "./auth";
import { validateApiKey } from "./apiKeys";

// ============================================================
// SERVICES — QUERIES & MUTATIONS
// ============================================================

// ── PUBLIC: List all published services (API key auth) ─────
export const listWithApiKey = query({
    args: {
        apiKey: v.string(),
        apiSecret: v.string(),
    },
    handler: async (ctx, args) => {
        await validateApiKey(ctx, args.apiKey, args.apiSecret, "pages:read");

        const services = await ctx.db
            .query("services")
            .withIndex("by_published", (q) => q.eq("isPublished", true))
            .collect();

        return services.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    },
});

// ── PUBLIC: Get single service by slug (API key auth) ──────
export const getBySlugWithApiKey = query({
    args: {
        slug: v.string(),
        apiKey: v.string(),
        apiSecret: v.string(),
    },
    handler: async (ctx, args) => {
        await validateApiKey(ctx, args.apiKey, args.apiSecret, "pages:read");

        const service = await ctx.db
            .query("services")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .unique();

        if (!service || !service.isPublished) {
            return null;
        }

        return service;
    },
});

// ── ADMIN: List all services ───────────────────────────────
export const listAll = query({
    args: { token: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.token) return [];
        try {
            await requireEditor(ctx, args.token);
        } catch {
            return [];
        }
        const services = await ctx.db.query("services").collect();
        return services.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    },
});

// ── Create service (admin only) ────────────────────────────
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

        const existing = await ctx.db
            .query("services")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .unique();
        if (existing) {
            throw new ConvexError(`Service with slug "${args.slug}" already exists`);
        }

        const serviceId = await ctx.db.insert("services", {
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

// ── Update service ─────────────────────────────────────────
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

        if (args.slug && args.slug !== service.slug) {
            const existing = await ctx.db
                .query("services")
                .withIndex("by_slug", (q) => q.eq("slug", args.slug))
                .unique();
            if (existing) {
                throw new ConvexError(`Slug "${args.slug}" is already taken`);
            }
        }

        const { token, serviceId, ...updates } = args;
        await ctx.db.patch(args.serviceId, {
            ...updates,
            updatedBy: user._id,
        });

        await logAudit(ctx, user._id, "service.update", "service", args.serviceId);
    },
});

// ── Delete service (admin only) ────────────────────────────
export const deleteService = mutation({
    args: { token: v.string(), serviceId: v.id("services") },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx, args.token);
        await ctx.db.delete(args.serviceId);
        await logAudit(ctx, admin._id, "service.delete", "service", args.serviceId);
    },
});
