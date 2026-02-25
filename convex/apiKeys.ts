import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin, logAudit } from "./auth";
import { QueryCtx } from "./_generated/server";

// ============================================================
// API KEYS — SECURE FRONTEND AUTHENTICATION
// ============================================================

function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36) + str.length.toString(36);
}

function generateKeyPair(): { key: string; secret: string } {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "cms_";
    let secret = "";
    for (let i = 0; i < 24; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    for (let i = 0; i < 48; i++) secret += chars.charAt(Math.floor(Math.random() * chars.length));
    return { key, secret };
}

// ── Create API Key (admin only) ────────────────────────────
export const create = mutation({
    args: {
        token: v.string(),
        name: v.string(),
        permissions: v.optional(v.array(v.string())),
        allowedOrigins: v.optional(v.array(v.string())),
        expiresInDays: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx, args.token);
        if (!admin.workspaceId) throw new ConvexError("Workspace not found");

        const { key, secret } = generateKeyPair();
        const secretHash = simpleHash(secret);
        const expiresAt = args.expiresInDays
            ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
            : undefined;

        const apiKeyId = await ctx.db.insert("apiKeys", {
            workspaceId: admin.workspaceId,
            name: args.name,
            key,
            secretHash,
            permissions: args.permissions ?? ["pages:read", "blocks:read"],
            allowedOrigins: args.allowedOrigins,
            isActive: true,
            expiresAt,
            createdBy: admin._id,
        });

        await logAudit(ctx, admin._id, "apiKey.create", "apiKey", apiKeyId);
        return {
            id: apiKeyId,
            key,
            secret,
            name: args.name,
            permissions: args.permissions ?? ["pages:read", "blocks:read"],
            expiresAt,
        };
    },
});

// ── List all API keys for this workspace (admin only) ───────
export const list = query({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx, args.token);
        if (!admin.workspaceId) return [];
        const keys = await ctx.db
            .query("apiKeys")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", admin.workspaceId!))
            .collect();
        return keys.map((k) => ({
            _id: k._id,
            name: k.name,
            key: k.key,
            permissions: k.permissions,
            allowedOrigins: k.allowedOrigins,
            isActive: k.isActive,
            lastUsedAt: k.lastUsedAt,
            expiresAt: k.expiresAt,
            _creationTime: k._creationTime,
        }));
    },
});

// ── Revoke ─────────────────────────────────────────────────
export const revoke = mutation({
    args: { token: v.string(), apiKeyId: v.id("apiKeys") },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx, args.token);
        const apiKey = await ctx.db.get(args.apiKeyId);
        if (!apiKey) throw new ConvexError("API key not found");
        await ctx.db.patch(args.apiKeyId, { isActive: false });
        await logAudit(ctx, admin._id, "apiKey.revoke", "apiKey", args.apiKeyId);
    },
});

// ── Reactivate ─────────────────────────────────────────────
export const reactivate = mutation({
    args: { token: v.string(), apiKeyId: v.id("apiKeys") },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx, args.token);
        const apiKey = await ctx.db.get(args.apiKeyId);
        if (!apiKey) throw new ConvexError("API key not found");
        await ctx.db.patch(args.apiKeyId, { isActive: true });
        await logAudit(ctx, admin._id, "apiKey.reactivate", "apiKey", args.apiKeyId);
    },
});

// ── Delete ─────────────────────────────────────────────────
export const deleteKey = mutation({
    args: { token: v.string(), apiKeyId: v.id("apiKeys") },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx, args.token);
        const apiKey = await ctx.db.get(args.apiKeyId);
        if (!apiKey) throw new ConvexError("API key not found");
        await ctx.db.delete(args.apiKeyId);
        await logAudit(ctx, admin._id, "apiKey.delete", "apiKey", args.apiKeyId);
    },
});

// ── Validate API Key (internal helper) ─────────────────────
export async function validateApiKey(
    ctx: QueryCtx,
    key: string,
    secret: string,
    requiredPermission: string
): Promise<void> {
    const apiKey = await ctx.db
        .query("apiKeys")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
    if (!apiKey) throw new ConvexError("Invalid API key");
    if (!apiKey.isActive) throw new ConvexError("API key has been revoked");
    if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) throw new ConvexError("API key has expired");
    if (apiKey.secretHash !== simpleHash(secret)) throw new ConvexError("Invalid API secret");
    if (!apiKey.permissions.includes(requiredPermission))
        throw new ConvexError(`API key lacks permission: ${requiredPermission}`);
}

// ── Record usage ───────────────────────────────────────────
export const recordUsage = mutation({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const apiKey = await ctx.db
            .query("apiKeys")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .unique();
        if (apiKey) await ctx.db.patch(apiKey._id, { lastUsedAt: Date.now() });
    },
});

// ── Get connection info ─────────────────────────────────────
export const getConnectionInfo = query({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        await requireAdmin(ctx, args.token);
        return { convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL || "https://your-deployment.convex.cloud" };
    },
});
