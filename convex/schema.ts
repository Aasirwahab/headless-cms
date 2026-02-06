import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================
// HEADLESS REAL-TIME CMS — CONVEX SCHEMA
// ============================================================
// This schema powers a multi-tenant, block-based CMS with:
//   - Pages (slug-routed, draft/publish workflow)
//   - Blocks (typed content units: hero, text, image, cta)
//   - Global Sections (reusable header/footer/CTA blocks)
//   - Users & Roles (admin vs editor with granular permissions)
//   - Media library
//   - Audit trail
// ============================================================

// Shared validator for block content — each block type has its own shape
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
    body: v.string(), // Rich text stored as HTML or markdown
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
  // ── Users & Authentication ──────────────────────────────
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(), // bcrypt hash
    role: v.union(v.literal("admin"), v.literal("editor")),
    avatar: v.optional(v.string()),
    isActive: v.boolean(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // ── Sessions (simple token-based auth) ──────────────────
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  // ── Pages ───────────────────────────────────────────────
  // Each page has a slug, SEO metadata, and an ordered list of block refs.
  // Draft/publish is handled via `status` + `publishedAt`.
  pages: defineTable({
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    // SEO metadata
    seo: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      ogImage: v.optional(v.string()),
      noIndex: v.optional(v.boolean()),
    }),
    // Ordered block IDs — the page's content structure
    blockOrder: v.array(v.id("blocks")),
    // Global sections attached to this page (header/footer overrides)
    headerOverride: v.optional(v.id("globalSections")),
    footerOverride: v.optional(v.id("globalSections")),
    // Timestamps
    publishedAt: v.optional(v.number()),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_created", ["createdBy"]),

  // ── Blocks ──────────────────────────────────────────────
  // Individual content blocks. Each block has a `type` that determines
  // its content shape. Blocks belong to a page.
  blocks: defineTable({
    pageId: v.id("pages"),
    content: blockContent,
    // Layout constraints set by admin — editors cannot change these
    layout: v.object({
      width: v.optional(v.union(v.literal("narrow"), v.literal("medium"), v.literal("full"))),
      padding: v.optional(v.union(v.literal("none"), v.literal("sm"), v.literal("md"), v.literal("lg"))),
      background: v.optional(v.string()),
    }),
    // Lock flag: if true, only admins can edit this block's structure
    isStructureLocked: v.boolean(),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_page", ["pageId"]),

  // ── Global Sections ─────────────────────────────────────
  // Reusable sections (header, footer, CTA banners) shared across pages.
  globalSections: defineTable({
    name: v.string(),
    slug: v.string(), // e.g., "main-header", "default-footer"
    type: v.union(v.literal("header"), v.literal("footer"), v.literal("cta"), v.literal("custom")),
    content: blockContent,
    isDefault: v.boolean(), // If true, auto-applied to all pages without override
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_slug", ["slug"])
    .index("by_type", ["type"])
    .index("by_default", ["isDefault"]),

  // ── Media Library ───────────────────────────────────────
  media: defineTable({
    filename: v.string(),
    url: v.string(),
    mimeType: v.string(),
    size: v.number(), // bytes
    alt: v.optional(v.string()),
    uploadedBy: v.id("users"),
  })
    .index("by_uploader", ["uploadedBy"]),

  // ── Audit Log ───────────────────────────────────────────
  auditLog: defineTable({
    userId: v.id("users"),
    action: v.string(), // e.g., "page.publish", "block.update", "user.create"
    targetType: v.string(), // "page" | "block" | "globalSection" | "user"
    targetId: v.string(),
    details: v.optional(v.string()), // JSON string of change details
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_timestamp", ["timestamp"]),

  // ── API Keys (for external frontend connections) ────────
  // Secure key+secret authentication for external apps.
  // Only allows read access to published content.
  apiKeys: defineTable({
    name: v.string(), // "Marketing Website", "Mobile App"
    key: v.string(), // Public key identifier
    secretHash: v.string(), // Hashed secret (never stored plaintext)
    permissions: v.array(v.string()), // ["pages:read", "blocks:read"]
    allowedOrigins: v.optional(v.array(v.string())), // Domain restrictions
    isActive: v.boolean(),
    lastUsedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()), // Optional expiration
    createdBy: v.id("users"),
  })
    .index("by_key", ["key"])
    .index("by_active", ["isActive"]),

  // ── Projects (Portfolio Items) ───────────────────────────
  projects: defineTable({
    slug: v.string(), // URL-friendly identifier
    title: v.string(),
    location: v.optional(v.string()),
    year: v.optional(v.string()),
    category: v.optional(v.string()), // Residential, Commercial, etc.
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // Extended project details
    brief: v.optional(v.string()),
    solution: v.optional(v.string()),
    outcome: v.optional(v.string()),
    size: v.optional(v.string()),
    stage: v.optional(v.string()), // Completed, In Planning, Under Construction
    constraints: v.optional(v.string()),
    approach: v.optional(v.string()),
    // Gallery images
    gallery: v.optional(v.array(v.string())),
    // Status
    isPublished: v.boolean(),
    order: v.optional(v.number()), // For custom ordering
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_slug", ["slug"])
    .index("by_published", ["isPublished"])
    .index("by_category", ["category"]),

  // ── Services ─────────────────────────────────────────────
  services: defineTable({
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
    .index("by_slug", ["slug"])
    .index("by_published", ["isPublished"]),

  // ── Testimonials ─────────────────────────────────────────
  testimonials: defineTable({
    quote: v.string(),
    author: v.string(),
    project: v.optional(v.string()), // Project name or reference
    role: v.optional(v.string()), // Author's role/title
    avatar: v.optional(v.string()),
    isPublished: v.boolean(),
    order: v.optional(v.number()),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_published", ["isPublished"]),

  // ── FAQs ─────────────────────────────────────────────────
  faqs: defineTable({
    question: v.string(),
    answer: v.string(),
    category: v.optional(v.string()),
    isPublished: v.boolean(),
    order: v.optional(v.number()),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_published", ["isPublished"])
    .index("by_category", ["category"]),

  // ── Site Settings ────────────────────────────────────────
  siteSettings: defineTable({
    key: v.string(), // "general", "social", "contact", etc.
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
    .index("by_key", ["key"]),
});
