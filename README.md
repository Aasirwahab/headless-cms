# Real-Time Headless CMS

A production-ready, custom, real-time CMS built with **Next.js 15** (App Router) and **Convex**. Content edited in the CMS updates instantly on all connected frontends — no refresh, no deploy, no cache purge.

Built as a custom alternative to Sanity/Webflow CMS, fully controlled by the developer.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up Convex (creates your backend)
npx convex dev
# This prints your NEXT_PUBLIC_CONVEX_URL — add it to .env.local

# 3. Start Next.js
npm run dev

# 4. Open http://localhost:3000/admin
#    Click "First time? Set up admin account" to create your admin user
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      CONVEX BACKEND                          │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌──────────────┐  ┌──────────┐ │
│  │  Pages   │  │ Blocks  │  │ GlobalSects  │  │  Users   │ │
│  └────┬─────┘  └────┬────┘  └──────┬───────┘  └────┬─────┘ │
│       │             │              │               │         │
│       └─────────────┴──────────────┴───────────────┘         │
│                          │                                    │
│              Reactive Queries (WebSocket)                     │
│                          │                                    │
└──────────────────────────┼────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
     ┌──────────────┐ ┌──────────┐ ┌──────────┐
     │  CMS Admin   │ │Frontend A│ │Frontend B│
     │  /admin      │ │ Next.js  │ │ React    │
     │  (useQuery + │ │(useQuery)│ │(useQuery)│
     │   useMutation│ │          │ │          │
     └──────────────┘ └──────────┘ └──────────┘
```

### How Real-Time Works

1. **Editor saves content** in the CMS admin → calls a Convex `mutation`
2. **Convex updates the database** and instantly pushes changes to all active `query` subscriptions
3. **Every frontend** using `useQuery(api.pages.getBySlug, { slug })` receives the new data
4. **React re-renders** the affected components — no polling, no refresh

This is powered by Convex's built-in reactive query system. Under the hood, Convex maintains a WebSocket connection per client and only sends diffs when data changes.

---

## Project Structure

```
cms-project/
├── convex/                          # ← BACKEND (runs on Convex)
│   ├── schema.ts                    #   Database schema (tables, indexes, validators)
│   ├── auth.ts                      #   Auth helpers (session validation, role checks)
│   ├── users.ts                     #   User management (login, create, seed)
│   ├── pages.ts                     #   Page CRUD + publish workflow + public queries
│   ├── blocks.ts                    #   Block CRUD with role-based editing
│   ├── globalSections.ts            #   Reusable headers/footers/CTAs
│   └── auditLog.ts                  #   Activity log queries
│
├── src/
│   ├── app/                         # ← NEXT.JS ROUTES
│   │   ├── layout.tsx               #   Root layout with Convex provider
│   │   ├── page.tsx                 #   Homepage (lists published pages)
│   │   ├── admin/
│   │   │   └── page.tsx             #   CMS dashboard entry point
│   │   └── (frontend)/
│   │       └── [slug]/
│   │           └── page.tsx         #   Dynamic public page (real-time)
│   │
│   ├── components/
│   │   ├── ConvexProvider.tsx        #   Convex client wrapper
│   │   ├── admin/
│   │   │   ├── Dashboard.tsx         #   Pages list + activity log
│   │   │   ├── PageEditor.tsx        #   Full page editing view
│   │   │   ├── BlockEditor.tsx       #   Per-block editing (role-aware)
│   │   │   └── LoginForm.tsx         #   Auth + initial setup
│   │   └── frontend/
│   │       ├── LivePage.tsx          #   Real-time page renderer (THE KEY COMPONENT)
│   │       └── BlockRenderer.tsx     #   Block type → React component mapping
│   │
│   ├── hooks/
│   │   └── useAuth.tsx              #   Auth context (session, role, login/logout)
│   │
│   └── types/
│       └── cms.ts                   #   Shared TypeScript types
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env.local.example
```

---

## Schema Design

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Auth & roles | email, passwordHash, role (admin\|editor) |
| `sessions` | Token-based auth | userId, token, expiresAt |
| `pages` | Content pages | slug, status, seo, blockOrder[] |
| `blocks` | Content units | pageId, content (typed union), layout, isStructureLocked |
| `globalSections` | Reusable sections | type (header\|footer\|cta), content, isDefault |
| `media` | File uploads | url, mimeType, size |
| `auditLog` | Change tracking | userId, action, targetType, timestamp |

### Block Content Types

Each block has a typed `content` field (discriminated union):

```typescript
type BlockContent =
  | { type: "hero";  heading, subheading, backgroundImage, ctaText, ctaLink, alignment }
  | { type: "text";  body, maxLength }
  | { type: "image"; src, alt, caption, width, height }
  | { type: "cta";   heading, description, buttonText, buttonLink, variant }
```

---

## Role-Based Permissions

### Admin (Developer/Agency)
- ✅ Create, delete, archive pages
- ✅ Change page slugs
- ✅ Add, remove, reorder blocks
- ✅ Change block types and layout
- ✅ Publish / unpublish pages
- ✅ Manage users
- ✅ Lock block structure

### Editor (Client)
- ✅ Edit text, images, links within existing blocks
- ✅ Update page titles and SEO descriptions
- ❌ Cannot create/delete pages
- ❌ Cannot add/remove/reorder blocks
- ❌ Cannot change block types or layout
- ❌ Cannot change page slugs
- ❌ Cannot manage users

**This separation ensures clients can never break the layout.** The admin sets up the page structure, locks it, and the client edits content within those guardrails.

### How It's Enforced

Every Convex mutation calls `requireAdmin()` or `requireEditor()`:

```typescript
// In convex/blocks.ts
export const updateContent = mutation({
  handler: async (ctx, args) => {
    const user = await requireEditor(ctx, args.token);  // ← role check
    
    // Editors cannot change block type
    if (block.content.type !== args.content.type && user.role !== "admin") {
      throw new ConvexError("Only admins can change block types");
    }
    // ...
  },
});
```

---

## Multi-Frontend Setup

The CMS is **headless** — it serves content via Convex queries that any frontend can subscribe to.

### Connecting Multiple Frontends

Each frontend app just needs:

1. The `convex` npm package
2. The same `NEXT_PUBLIC_CONVEX_URL` pointing to your Convex deployment
3. The generated Convex types (run `npx convex dev` in each project, pointing to the same project)

```
┌─────────────────────────────────────────────────┐
│              CONVEX DEPLOYMENT                   │
│         (single source of truth)                 │
└───────┬──────────┬──────────┬────────────────────┘
        │          │          │
        ▼          ▼          ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ Marketing│ │  App      │ │  Mobile  │
  │  Site    │ │ Dashboard │ │  (React  │
  │ (Next.js)│ │ (Next.js) │ │  Native) │
  └──────────┘ └──────────┘ └──────────┘
```

### Recommended Folder Structure for Multi-Frontend

```
my-agency/
├── packages/
│   └── cms-convex/              # Shared Convex backend
│       ├── convex/
│       │   ├── schema.ts
│       │   ├── pages.ts
│       │   ├── blocks.ts
│       │   └── ...
│       └── package.json
│
├── apps/
│   ├── cms-admin/               # CMS Dashboard (Next.js)
│   │   ├── src/app/admin/
│   │   ├── .env.local           # NEXT_PUBLIC_CONVEX_URL=...
│   │   └── package.json
│   │
│   ├── client-website/          # Client's public site (Next.js)
│   │   ├── src/app/[slug]/
│   │   ├── .env.local           # Same CONVEX_URL
│   │   └── package.json
│   │
│   └── client-mobile/           # Optional mobile app
│       └── ...
│
├── package.json                 # Monorepo root (turborepo/pnpm workspaces)
└── turbo.json
```

Use **Turborepo** or **pnpm workspaces** to share the Convex backend across apps.

---

## Real-Time Data Flow (Step by Step)

### 1. Editor Updates Content
```
Editor clicks "Save" on a text block
  → BlockEditor calls useMutation(api.blocks.updateContent)
  → Convex mutation runs: validates role, updates DB, logs audit
```

### 2. Convex Pushes to All Subscribers
```
Convex detects that the `blocks` table changed
  → Finds all active useQuery subscriptions that depend on this data
  → Recalculates query results
  → Pushes new data over WebSocket to each connected client
```

### 3. Frontends Re-Render
```
LivePage component on Frontend A has:
  const page = useQuery(api.pages.getBySlug, { slug: "about" });

Convex sends updated page data (with new block content)
  → React re-renders BlockRenderer with new text
  → User sees the change instantly
```

**No polling. No cache invalidation. No page refresh.**

---

## Key Code: The Real-Time Subscription

The entire real-time pipeline on the frontend is this one hook:

```typescript
// In LivePage.tsx
const page = useQuery(api.pages.getBySlug, { slug });
```

That's it. Convex handles:
- WebSocket connection management
- Query dependency tracking
- Incremental updates (only changed data)
- Automatic reconnection
- Optimistic UI updates (via useMutation)

---

## Draft / Publish Workflow

```
draft → published → archived
  ↑         │
  └─────────┘
  (unpublish)
```

- **Draft**: Only visible in CMS admin. Not served by public queries.
- **Published**: Visible on all frontends via `getBySlug` (which filters by `status === "published"`).
- **Archived**: Hidden from both admin lists and public. Can be restored by admin.

Only **admins** can publish, unpublish, or archive. Editors can work on draft pages but can't push them live.

---

## Extending the CMS

### Adding a New Block Type

1. **Add the type to `convex/schema.ts`**:
```typescript
v.object({
  type: v.literal("video"),
  url: v.string(),
  autoplay: v.optional(v.boolean()),
})
```

2. **Add the validator to `convex/blocks.ts`** (in the union)

3. **Add the renderer in `BlockRenderer.tsx`**:
```typescript
function VideoBlock({ content }) {
  return <video src={content.url} autoPlay={content.autoplay} />;
}
```

4. **Add the editor in `BlockEditor.tsx`**:
```typescript
{content.type === "video" && <VideoEditor content={content} onChange={...} />}
```

5. **Run `npx convex dev`** to push the schema change.

### Adding Media Upload

Convex supports file storage. Add to your mutations:
```typescript
import { mutation } from "./_generated/server";

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});
```

### Adding Scheduling / Auto-Publish

Use Convex scheduled functions:
```typescript
import { cronJobs } from "convex/server";

const crons = cronJobs();
crons.interval("check-scheduled-publishes", { minutes: 1 }, api.pages.checkScheduled);
export default crons;
```

---

## Production Checklist

- [ ] Replace `simpleHash` with bcrypt (use a Convex action that calls Node.js crypto)
- [ ] Add rate limiting to login endpoint
- [ ] Set up Convex production deployment (`npx convex deploy`)
- [ ] Add media upload via Convex file storage
- [ ] Add rich text editor (Tiptap, Plate, or similar) for text blocks
- [ ] Add drag-and-drop block reordering (dnd-kit)
- [ ] Add page-level revision history
- [ ] Set up monorepo if using multiple frontends
- [ ] Add API key auth for external (non-React) consumers
- [ ] Configure CORS if serving to different domains

---

## License

Private — built for your agency. Customize freely.
