import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin, authenticateUser, logAudit } from "./auth";

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return "h_" + Math.abs(hash).toString(36) + input.length.toString(36);
}

function generateToken(): string {
  return (
    Math.random().toString(36).substring(2) +
    Math.random().toString(36).substring(2) +
    Date.now().toString(36)
  );
}

// ── Open Registration ─────────────────────────────────────
// Anyone can register. A workspace is auto-created for the new user.
// First account = admin, all subsequent = editor.
export const register = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const name = args.name.trim();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) {
      throw new ConvexError("An account with this email already exists");
    }

    // Insert user first (workspaceId set after workspace is created)
    const userId = await ctx.db.insert("users", {
      name,
      email,
      passwordHash: simpleHash(args.password),
      role: "admin", // every new account is admin of their own workspace
      isActive: true,
    });

    // Create a workspace owned by this user
    const workspaceId = await ctx.db.insert("workspaces", {
      name: `${name}'s Workspace`,
      ownerId: userId,
      createdAt: Date.now(),
    });

    // Link the user to their workspace
    await ctx.db.patch(userId, { workspaceId });

    const token = generateToken();
    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    return {
      token,
      workspaceId,
      user: { id: userId, name, email, role: "admin" as const },
    };
  },
});

// ── Login ──────────────────────────────────────────────────
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!user) throw new ConvexError("Invalid email or password");
    if (!user.isActive) throw new ConvexError("Account is deactivated");
    if (user.passwordHash !== simpleHash(args.password))
      throw new ConvexError("Invalid email or password");

    // Invalidate old sessions
    const oldSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const session of oldSessions) {
      await ctx.db.delete(session._id);
    }

    const token = generateToken();
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    await ctx.db.patch(user._id, { lastLoginAt: Date.now() });

    return {
      token,
      workspaceId: user.workspaceId ?? null,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  },
});

// ── Get current user from token ────────────────────────────
export const me = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token) return null;
    try {
      return await authenticateUser(ctx, args.token);
    } catch {
      return null;
    }
  },
});

// ── Create user (admin only, same workspace) ───────────────
export const createUser = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("admin"), v.literal("editor")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    if (!admin.workspaceId) throw new ConvexError("Workspace not found");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (existing) throw new ConvexError("A user with this email already exists");

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email.trim().toLowerCase(),
      passwordHash: simpleHash(args.password),
      role: args.role,
      workspaceId: admin.workspaceId,
      isActive: true,
    });

    await logAudit(ctx, admin._id, "user.create", "user", userId, JSON.stringify({ role: args.role }));
    return userId;
  },
});

// ── List users (admin only, same workspace) ────────────────
export const listUsers = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token) return [];
    try {
      const admin = await requireAdmin(ctx, args.token);
      if (!admin.workspaceId) return [];
      const users = await ctx.db
        .query("users")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", admin.workspaceId!))
        .collect();
      return users.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
      }));
    } catch {
      return [];
    }
  },
});

// ── Toggle user active status (admin only) ─────────────────
export const toggleUserActive = mutation({
  args: { token: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found");
    if (user._id === admin._id) throw new ConvexError("Cannot deactivate yourself");

    await ctx.db.patch(args.userId, { isActive: !user.isActive });
    await logAudit(ctx, admin._id, "user.toggle_active", "user", args.userId, JSON.stringify({ isActive: !user.isActive }));
  },
});

// ── Logout ─────────────────────────────────────────────────
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});
