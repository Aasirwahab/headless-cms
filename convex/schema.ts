import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================
// HEADLESS REAL-TIME CMS — CONVEX SCHEMA
// ============================================================
// Multi-workspace: every content table is scoped by workspaceId
// so each registered admin sees only their own content.
// ============================================================

const blockContent = v.union(
  v.object({
    type: v.literal("hero"),
    heading: v.string(),
    subheading: v.optional(v.string()),
    backgroundImage: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    ctaLink: v.optional(v.string()),
    alignment: v.optional(v.union(v.literal("left"), v.literal("center"), v.literal("right"))),
  }),
  v.object({
    type: v.literal("text"),
    body: v.string(),
    maxLength: v.optional(v.number()),
  }),
  v.object({
    type: v.literal("image"),
    src: v.string(),
    alt: v.string(),
    caption: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  }),
  v.object({
    type: v.literal("cta"),
    heading: v.optional(v.string()),
    description: v.optional(v.string()),
    buttonText: v.string(),
    buttonLink: v.string(),
    variant: v.optional(v.union(v.literal("primary"), v.literal("secondary"), v.literal("outline"))),
  })
);

export default defineSchema({
  // ── Workspaces ───────────────────────────────────────────
  // Each admin gets one workspace on registration.
  // All content is scoped to a workspaceId.
  workspaces: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  // ── Users & Authentication ──────────────────────────────
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    role: v.union(v.literal("admin"), v.literal("editor")),
    workspaceId: v.optional(v.id("workspaces")), // set after workspace creation
    avatar: v.optional(v.string()),
    isActive: v.boolean(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_workspace", ["workspaceId"]),

  // ── Sessions ─────────────────────────────────────────────
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  // ── Pages ────────────────────────────────────────────────
  pages: defineTable({
    workspaceId: v.id("workspaces"),
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    seo: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      ogImage: v.optional(v.string()),
      noIndex: v.optional(v.boolean()),
    }),
    blockOrder: v.array(v.id("blocks")),
    headerOverride: v.optional(v.id("globalSections")),
    footerOverride: v.optional(v.id("globalSections")),
    publishedAt: v.optional(v.number()),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_workspace_status", ["workspaceId", "status"]),

  // ── Blocks ───────────────────────────────────────────────
  blocks: defineTable({
    workspaceId: v.id("workspaces"),
    pageId: v.id("pages"),
    content: blockContent,
    layout: v.object({
      width: v.optional(v.union(v.literal("narrow"), v.literal("medium"), v.literal("full"))),
      padding: v.optional(v.union(v.literal("none"), v.literal("sm"), v.literal("md"), v.literal("lg"))),
      background: v.optional(v.string()),
    }),
    isStructureLocked: v.boolean(),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
  }).index("by_page", ["pageId"]),

  // ── Global Sections ──────────────────────────────────────
  globalSections: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    slug: v.string(),
    type: v.union(v.literal("header"), v.literal("footer"), v.literal("cta"), v.literal("custom")),
    content: blockContent,
    isDefault: v.boolean(),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_slug", ["slug"])
    .index("by_type", ["type"])
    .index("by_default", ["isDefault"]),

  // ── Media Library ────────────────────────────────────────
  media: defineTable({
    workspaceId: v.id("workspaces"),
    filename: v.string(),
    url: v.string(),
    mimeType: v.string(),
    size: v.number(),
    alt: v.optional(v.string()),
    uploadedBy: v.id("users"),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_uploader", ["uploadedBy"]),

  // ── Audit Log ────────────────────────────────────────────
  auditLog: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    userId: v.id("users"),
    action: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    details: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_timestamp", ["timestamp"]),

  // ── API Keys ─────────────────────────────────────────────
  apiKeys: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    key: v.string(),
    secretHash: v.string(),
    permissions: v.array(v.string()),
    allowedOrigins: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    lastUsedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    createdBy: v.id("users"),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_key", ["key"])
    .index("by_active", ["isActive"]),

  // ── Projects ─────────────────────────────────────────────
  projects: defineTable({
    workspaceId: v.id("workspaces"),
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
    isPublished: v.boolean(),
    order: v.optional(v.number()),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_slug", ["slug"])
    .index("by_published", ["isPublished"])
    .index("by_workspace_published", ["workspaceId", "isPublished"])
    .index("by_category", ["category"]),

  // ── Services ─────────────────────────────────────────────
  services: defineTable({
    workspaceId: v.id("workspaces"),
    slug: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    deliverables: v.optional(v.array(v.string())),
    timeline: v.optional(v.string()),
    icon: v.optional(v.string()),
    isPublished: v.boolean(),
    order: v.optional(v.number()),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_slug", ["slug"])
    .index("by_published", ["isPublished"])
    .index("by_workspace_published", ["workspaceId", "isPublished"]),

  // ── Testimonials ─────────────────────────────────────────
  testimonials: defineTable({
    workspaceId: v.id("workspaces"),
    quote: v.string(),
    author: v.string(),
    project: v.optional(v.string()),
    role: v.optional(v.string()),
    avatar: v.optional(v.string()),
    isPublished: v.boolean(),
    order: v.optional(v.number()),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_published", ["isPublished"])
    .index("by_workspace_published", ["workspaceId", "isPublished"]),

  // ── FAQs ─────────────────────────────────────────────────
  faqs: defineTable({
    workspaceId: v.id("workspaces"),
    question: v.string(),
    answer: v.string(),
    category: v.optional(v.string()),
    isPublished: v.boolean(),
    order: v.optional(v.number()),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_published", ["isPublished"])
    .index("by_workspace_published", ["workspaceId", "isPublished"])
    .index("by_category", ["category"]),

  // ── Site Settings ────────────────────────────────────────
  siteSettings: defineTable({
    workspaceId: v.id("workspaces"),
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
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_key", ["key"])
    .index("by_workspace_key", ["workspaceId", "key"]),
});
