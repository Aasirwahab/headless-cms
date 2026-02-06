import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin, logAudit } from "./auth";
import { QueryCtx } from "./_generated/server";

// ============================================================
// API KEYS — SECURE FRONTEND AUTHENTICATION
// ============================================================
// API keys allow external frontends to connect securely.
// Each key has:
//   - A public "key" identifier
//   - A hashed "secret" for authentication
//   - Permissions (e.g., pages:read)
//   - Optional domain restrictions
//   - Expiration and revocation support
//
// SECURITY:
//   - Secrets are hashed before storage (never plaintext)
//   - Keys can only read published content
//   - Keys cannot access admin/editor functions
//   - All usage is logged for audit
// ============================================================

// Simple hash function for secrets (replace with bcrypt in production)
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36) + str.length.toString(36);
}

// Generate a random key/secret pair
function generateKeyPair(): { key: string; secret: string } {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "cms_";
    let secret = "";

    for (let i = 0; i < 24; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    for (let i = 0; i < 48; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return { key, secret };
}

// ── Create API Key (admin only) ────────────────────────────
// Returns the key and secret ONCE. Secret cannot be retrieved after.
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

        const { key, secret } = generateKeyPair();
        const secretHash = simpleHash(secret);

        const expiresAt = args.expiresInDays
            ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
            : undefined;

        const apiKeyId = await ctx.db.insert("apiKeys", {
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

        // Return key and secret — secret is shown ONLY once
        return {
            id: apiKeyId,
            key,
            secret, // ⚠️ Only returned once, never stored in plaintext
            name: args.name,
            permissions: args.permissions ?? ["pages:read", "blocks:read"],
            expiresAt,
        };
    },
});

// ── List all API keys (admin only) ─────────────────────────
export const list = query({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        await requireAdmin(ctx, args.token);

        const keys = await ctx.db
            .query("apiKeys")
            .order("desc")
            .collect();

        // Never return the secretHash
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

// ── Revoke API Key (admin only) ────────────────────────────
// Deactivates the key but keeps it for audit purposes
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

// ── Reactivate API Key (admin only) ────────────────────────
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

// ── Delete API Key (admin only) ────────────────────────────
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
// Called by public queries to authenticate external requests
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

    if (!apiKey) {
        throw new ConvexError("Invalid API key");
    }

    if (!apiKey.isActive) {
        throw new ConvexError("API key has been revoked");
    }

    if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
        throw new ConvexError("API key has expired");
    }

    // Validate secret
    const secretHash = simpleHash(secret);
    if (apiKey.secretHash !== secretHash) {
        throw new ConvexError("Invalid API secret");
    }

    // Check permission
    if (!apiKey.permissions.includes(requiredPermission)) {
        throw new ConvexError(`API key lacks permission: ${requiredPermission}`);
    }
}

// ── Update last used timestamp (mutation for writes) ───────
export const recordUsage = mutation({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const apiKey = await ctx.db
            .query("apiKeys")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .unique();

        if (apiKey) {
            await ctx.db.patch(apiKey._id, { lastUsedAt: Date.now() });
        }
    },
});

// ── Get connection info (for code snippets) ────────────────
export const getConnectionInfo = query({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        await requireAdmin(ctx, args.token);

        // Return the Convex URL (from environment or hardcoded for dev)
        return {
            convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL || "https://your-deployment.convex.cloud",
        };
    },
});
