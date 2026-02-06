import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin, requireEditor, logAudit } from "./auth";
import { validateApiKey } from "./apiKeys";

// ============================================================
// PROJECTS — QUERIES & MUTATIONS
// ============================================================
// Portfolio items with full CRUD and API key authenticated reads.

// ── PUBLIC: List all published projects (API key auth) ─────
export const listWithApiKey = query({
    args: {
        apiKey: v.string(),
        apiSecret: v.string(),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await validateApiKey(ctx, args.apiKey, args.apiSecret, "pages:read");

        let projectsQuery = ctx.db
            .query("projects")
            .withIndex("by_published", (q) => q.eq("isPublished", true));

        const projects = await projectsQuery.collect();

        // Filter by category if provided
        const filtered = args.category
            ? projects.filter((p) => p.category === args.category)
            : projects;

        // Sort by order, then by creation time
        return filtered.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    },
});

// ── PUBLIC: Get single project by slug (API key auth) ──────
export const getBySlugWithApiKey = query({
    args: {
        slug: v.string(),
        apiKey: v.string(),
        apiSecret: v.string(),
    },
    handler: async (ctx, args) => {
        await validateApiKey(ctx, args.apiKey, args.apiSecret, "pages:read");

        const project = await ctx.db
            .query("projects")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .unique();

        if (!project || !project.isPublished) {
            return null;
        }

        return project;
    },
});

// ── ADMIN: List all projects (any status) ──────────────────
export const listAll = query({
    args: { token: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.token) return [];
        try {
            await requireEditor(ctx, args.token);
        } catch {
            return [];
        }
        const projects = await ctx.db.query("projects").collect();
        return projects.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    },
});

// ── ADMIN: Get project for editing ─────────────────────────
export const getForEdit = query({
    args: { token: v.optional(v.string()), projectId: v.id("projects") },
    handler: async (ctx, args) => {
        if (!args.token) return null;
        try {
            await requireEditor(ctx, args.token);
        } catch {
            return null;
        }
        return await ctx.db.get(args.projectId);
    },
});

// ── Create project (admin only) ────────────────────────────
export const create = mutation({
    args: {
        token: v.string(),
        slug: v.string(),
        title: v.string(),
        location: v.optional(v.string()),
        year: v.optional(v.string()),
        category: v.optional(v.string()),
        description: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        brief: v.optional(v.string()),
        solution: v.optional(v.string()),
        outcome: v.optional(v.string()),
        size: v.optional(v.string()),
        stage: v.optional(v.string()),
        constraints: v.optional(v.string()),
        approach: v.optional(v.string()),
        gallery: v.optional(v.array(v.string())),
        order: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx, args.token);

        // Check slug uniqueness
        const existing = await ctx.db
            .query("projects")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .unique();
        if (existing) {
            throw new ConvexError(`Project with slug "${args.slug}" already exists`);
        }

        const projectId = await ctx.db.insert("projects", {
            slug: args.slug,
            title: args.title,
            location: args.location,
            year: args.year,
            category: args.category,
            description: args.description,
            imageUrl: args.imageUrl,
            brief: args.brief,
            solution: args.solution,
            outcome: args.outcome,
            size: args.size,
            stage: args.stage,
            constraints: args.constraints,
            approach: args.approach,
            gallery: args.gallery,
            order: args.order,
            isPublished: false,
            createdBy: admin._id,
        });

        await logAudit(ctx, admin._id, "project.create", "project", projectId);
        return projectId;
    },
});

// ── Update project ─────────────────────────────────────────
export const update = mutation({
    args: {
        token: v.string(),
        projectId: v.id("projects"),
        slug: v.optional(v.string()),
        title: v.optional(v.string()),
        location: v.optional(v.string()),
        year: v.optional(v.string()),
        category: v.optional(v.string()),
        description: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        brief: v.optional(v.string()),
        solution: v.optional(v.string()),
        outcome: v.optional(v.string()),
        size: v.optional(v.string()),
        stage: v.optional(v.string()),
        constraints: v.optional(v.string()),
        approach: v.optional(v.string()),
        gallery: v.optional(v.array(v.string())),
        order: v.optional(v.number()),
        isPublished: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const user = await requireEditor(ctx, args.token);
        const project = await ctx.db.get(args.projectId);
        if (!project) throw new ConvexError("Project not found");

        // Check slug uniqueness if changing
        if (args.slug && args.slug !== project.slug) {
            const existing = await ctx.db
                .query("projects")
                .withIndex("by_slug", (q) => q.eq("slug", args.slug))
                .unique();
            if (existing) {
                throw new ConvexError(`Slug "${args.slug}" is already taken`);
            }
        }

        const { token, projectId, ...updates } = args;
        await ctx.db.patch(args.projectId, {
            ...updates,
            updatedBy: user._id,
        });

        await logAudit(ctx, user._id, "project.update", "project", args.projectId);
    },
});

// ── Delete project (admin only) ────────────────────────────
export const deleteProject = mutation({
    args: { token: v.string(), projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx, args.token);
        await ctx.db.delete(args.projectId);
        await logAudit(ctx, admin._id, "project.delete", "project", args.projectId);
    },
});
