import { QueryCtx, MutationCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";

// ============================================================
// AUTH & ROLE ENFORCEMENT
// ============================================================
// Every mutation and sensitive query calls these helpers to:
//   1. Validate the session token
//   2. Check the user's role against required permissions
//   3. Return the authenticated user for downstream use
// ============================================================

export type AuthenticatedUser = {
  _id: Id<"users">;
  name: string;
  email: string;
  role: "admin" | "editor";
};

/**
 * Validate a session token and return the authenticated user.
 * Throws ConvexError if the token is missing, expired, or invalid.
 */
export async function authenticateUser(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined
): Promise<AuthenticatedUser> {
  if (!token) {
    throw new ConvexError("Authentication required");
  }

  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();

  if (!session) {
    throw new ConvexError("Invalid session token");
  }

  if (session.expiresAt < Date.now()) {
    throw new ConvexError("Session expired — please log in again");
  }

  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive) {
    throw new ConvexError("User account is inactive or not found");
  }

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

/**
 * Require admin role. Use for structure-level operations:
 * creating pages, changing block layout, managing users.
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined
): Promise<AuthenticatedUser> {
  const user = await authenticateUser(ctx, token);
  if (user.role !== "admin") {
    throw new ConvexError("Admin access required for this operation");
  }
  return user;
}

/**
 * Require at least editor role. Use for content-level operations:
 * editing text, updating images, changing CTA copy.
 */
export async function requireEditor(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined
): Promise<AuthenticatedUser> {
  const user = await authenticateUser(ctx, token);
  if (user.role !== "admin" && user.role !== "editor") {
    throw new ConvexError("Editor access required for this operation");
  }
  return user;
}

/**
 * Log an audit event. Called after every write operation.
 */
export async function logAudit(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: string,
  targetType: string,
  targetId: string,
  details?: string
) {
  await ctx.db.insert("auditLog", {
    userId,
    action,
    targetType,
    targetId,
    details,
    timestamp: Date.now(),
  });
}
