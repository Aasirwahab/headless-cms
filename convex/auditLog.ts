import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

export const getRecent = query({
  args: {
    token: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.token) return [];
    try {
      await requireAdmin(ctx, args.token);
    } catch {
      return [];
    }

    const logs = await ctx.db
      .query("auditLog")
      .withIndex("by_timestamp")
      .order("desc")
      .take(args.limit ?? 50);

    // Hydrate user names
    const enriched = await Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        return {
          ...log,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "",
        };
      })
    );

    return enriched;
  },
});
