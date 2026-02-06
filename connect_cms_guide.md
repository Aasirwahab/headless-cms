# 🔗 CMS Frontend Integration Guide

This guide explains how to connect any frontend application to your Convex-powered CMS. Your CMS uses a secure API key system that allows external websites to fetch published content.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create an API Key](#step-1-create-an-api-key)
3. [Step 2: Get Your Convex URL](#step-2-get-your-convex-url)
4. [Step 3: Configure Your Frontend](#step-3-configure-your-frontend)
   - [Next.js (App Router)](#nextjs-app-router)
   - [Next.js (Pages Router)](#nextjs-pages-router)
   - [React (Vite / CRA)](#react-vite--cra)
   - [Vanilla JavaScript](#vanilla-javascript)
   - [cURL / REST API](#curl--rest-api)
5. [Available API Endpoints](#available-api-endpoints)
6. [Working with Page Data](#working-with-page-data)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before connecting a frontend, ensure you have:

- ✅ Access to the CMS Admin Panel
- ✅ **Admin role** (only admins can create API keys)
- ✅ A running Convex deployment (you'll need the deployment URL)

---

## Step 1: Create an API Key

1. Log into your **CMS Admin Panel**
2. Navigate to the **"Connect Frontend"** section in the sidebar
3. Click the **"+ Create API Key"** button
4. Fill in the form:
   - **Name**: A descriptive name (e.g., "Marketing Website", "Mobile App")
   - **Allowed Origins** *(optional)*: Comma-separated list of domains that can use this key (e.g., `https://mysite.com, https://staging.mysite.com`)
5. Click **"Create Key"**

> ⚠️ **IMPORTANT**: Save the **API Key** and **API Secret** immediately! The secret is only displayed once and cannot be recovered.

You will receive:
- `API Key`: `cms_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (32 characters)
- `API Secret`: `secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (64 characters)

---

## Step 2: Get Your Convex URL

Your Convex deployment URL is displayed in:
- The **"Connect Frontend"** section of the admin panel
- Your `.env.local` file as `NEXT_PUBLIC_CONVEX_URL`

It looks like: `https://your-deployment-name.convex.cloud`

---

## Step 3: Configure Your Frontend

### Next.js (App Router)

This is the recommended approach for Next.js 13+ applications using the App Router.

#### Installation

```bash
npm install convex
# or
pnpm add convex
```

#### Environment Variables

Create or update `.env.local`:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CMS_API_KEY=cms_your_api_key_here
NEXT_PUBLIC_CMS_API_SECRET=secret_your_api_secret_here
```

#### Create CMS Client Library

Create `lib/cms.ts`:

```typescript
import { ConvexHttpClient } from "convex/browser";

// Initialize the Convex HTTP client
const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// API credentials
const API_KEY = process.env.NEXT_PUBLIC_CMS_API_KEY!;
const API_SECRET = process.env.NEXT_PUBLIC_CMS_API_SECRET!;

/**
 * Fetch a single page by its slug
 * @param slug - The page URL slug (e.g., "about", "home", "contact")
 * @returns The page object with title, SEO data, and hydrated blocks
 */
export async function getPage(slug: string) {
  return client.query("pages:getBySlugWithApiKey" as any, {
    slug,
    apiKey: API_KEY,
    apiSecret: API_SECRET,
  });
}

/**
 * List all published pages (useful for navigation/sitemap)
 * @returns Array of page summaries
 */
export async function listPages() {
  return client.query("pages:listPublishedWithApiKey" as any, {
    apiKey: API_KEY,
    apiSecret: API_SECRET,
  });
}

// Type definitions for the returned data
export interface CMSPage {
  _id: string;
  title: string;
  slug: string;
  seo: {
    title: string;
    description: string;
    ogImage?: string;
    noIndex?: boolean;
  };
  blocks: CMSBlock[];
  header: CMSGlobalSection | null;
  footer: CMSGlobalSection | null;
  publishedAt: number;
}

export interface CMSBlock {
  _id: string;
  type: string;
  content: Record<string, any>;
}

export interface CMSGlobalSection {
  _id: string;
  type: "header" | "footer";
  content: Record<string, any>;
}
```

#### Usage in Server Components

```tsx
// app/[slug]/page.tsx
import { getPage, listPages } from "@/lib/cms";
import { notFound } from "next/navigation";

interface PageProps {
  params: { slug: string };
}

export default async function DynamicPage({ params }: PageProps) {
  const page = await getPage(params.slug);

  if (!page) {
    notFound();
  }

  return (
    <main>
      <h1>{page.title}</h1>
      
      {/* Render blocks */}
      {page.blocks.map((block) => (
        <section key={block._id}>
          {/* Render block based on block.type */}
          {block.type === "hero" && <HeroSection content={block.content} />}
          {block.type === "text" && <TextSection content={block.content} />}
          {block.type === "image" && <ImageSection content={block.content} />}
        </section>
      ))}
    </main>
  );
}

// Generate static params for all published pages
export async function generateStaticParams() {
  const pages = await listPages();
  return pages.map((page) => ({ slug: page.slug }));
}
```

#### Usage in Client Components

```tsx
"use client";

import { useEffect, useState } from "react";
import { getPage, type CMSPage } from "@/lib/cms";

export function PageContent({ slug }: { slug: string }) {
  const [page, setPage] = useState<CMSPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPage(slug)
      .then(setPage)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div>Loading...</div>;
  if (!page) return <div>Page not found</div>;

  return <h1>{page.title}</h1>;
}
```

---

### Next.js (Pages Router)

For Next.js applications using the Pages Router.

#### Installation & Environment Variables

Same as App Router above.

#### Usage with getStaticProps

```tsx
// pages/[slug].tsx
import { GetStaticPaths, GetStaticProps } from "next";
import { getPage, listPages, type CMSPage } from "@/lib/cms";

interface PageProps {
  page: CMSPage;
}

export default function DynamicPage({ page }: PageProps) {
  return (
    <main>
      <h1>{page.title}</h1>
      {/* Render blocks */}
    </main>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const pages = await listPages();
  return {
    paths: pages.map((page) => ({ params: { slug: page.slug } })),
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const page = await getPage(params?.slug as string);

  if (!page) {
    return { notFound: true };
  }

  return {
    props: { page },
    revalidate: 60, // Revalidate every 60 seconds
  };
};
```

---

### React (Vite / CRA)

For React applications built with Vite or Create React App.

#### Installation

```bash
npm install convex
```

#### Create CMS Client

Create `src/lib/cms-client.js`:

```javascript
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = "https://your-deployment.convex.cloud";
const API_KEY = "cms_your_api_key_here";
const API_SECRET = "secret_your_api_secret_here";

const client = new ConvexHttpClient(CONVEX_URL);

export async function getPage(slug) {
  return client.query("pages:getBySlugWithApiKey", {
    slug,
    apiKey: API_KEY,
    apiSecret: API_SECRET,
  });
}

export async function listPages() {
  return client.query("pages:listPublishedWithApiKey", {
    apiKey: API_KEY,
    apiSecret: API_SECRET,
  });
}
```

#### Usage with React Hooks

```jsx
// src/components/DynamicPage.jsx
import { useEffect, useState } from "react";
import { getPage } from "../lib/cms-client";

export function DynamicPage({ slug }) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getPage(slug)
      .then(setPage)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading page</div>;
  if (!page) return <div>Page not found</div>;

  return (
    <article>
      <h1>{page.title}</h1>
      {page.blocks.map((block) => (
        <div key={block._id}>
          {/* Render block content */}
        </div>
      ))}
    </article>
  );
}
```

---

### Vanilla JavaScript

For static websites or any JavaScript environment without a framework.

```html
<!DOCTYPE html>
<html>
<head>
  <title>CMS Page</title>
</head>
<body>
  <main id="content">Loading...</main>

  <script type="module">
    const CONVEX_URL = "https://your-deployment.convex.cloud";
    const API_KEY = "cms_your_api_key_here";
    const API_SECRET = "secret_your_api_secret_here";

    async function fetchPage(slug) {
      const response = await fetch(`${CONVEX_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "pages:getBySlugWithApiKey",
          args: {
            slug,
            apiKey: API_KEY,
            apiSecret: API_SECRET,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch page");
      }

      const result = await response.json();
      return result.value;
    }

    // Fetch and render the "home" page
    fetchPage("home").then((page) => {
      if (page) {
        document.getElementById("content").innerHTML = `
          <h1>${page.title}</h1>
          <p>${page.seo?.description || ""}</p>
        `;
      } else {
        document.getElementById("content").innerHTML = "<p>Page not found</p>";
      }
    });
  </script>
</body>
</html>
```

---

### cURL / REST API

For testing or server-side integrations.

#### Fetch a Single Page

```bash
curl -X POST "https://your-deployment.convex.cloud/api/query" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "pages:getBySlugWithApiKey",
    "args": {
      "slug": "home",
      "apiKey": "cms_your_api_key_here",
      "apiSecret": "secret_your_api_secret_here"
    }
  }'
```

#### List All Published Pages

```bash
curl -X POST "https://your-deployment.convex.cloud/api/query" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "pages:listPublishedWithApiKey",
    "args": {
      "apiKey": "cms_your_api_key_here",
      "apiSecret": "secret_your_api_secret_here"
    }
  }'
```

---

## Available API Endpoints

| Endpoint | Description | Returns |
|----------|-------------|---------|
| `pages:getBySlugWithApiKey` | Fetch a single published page by its slug | Page object with hydrated blocks, header, footer |
| `pages:listPublishedWithApiKey` | List all published pages | Array of page summaries (id, title, slug, seo) |

---

## Working with Page Data

### Page Structure

When you fetch a page, you receive:

```typescript
{
  _id: "abc123...",           // Unique page ID
  title: "About Us",          // Page title
  slug: "about",              // URL slug
  seo: {
    title: "About Us | My Site",
    description: "Learn more about our company...",
    ogImage: "https://...",   // Optional Open Graph image
    noIndex: false            // Optional: hide from search engines
  },
  blocks: [                   // Ordered array of content blocks
    {
      _id: "block1...",
      type: "hero",
      content: { ... }
    },
    {
      _id: "block2...",
      type: "text",
      content: { ... }
    }
  ],
  header: { ... },            // Header section (or null)
  footer: { ... },            // Footer section (or null)
  publishedAt: 1704067200000  // Timestamp when published
}
```

### Rendering Blocks

Create a block renderer component:

```tsx
// components/BlockRenderer.tsx
interface BlockRendererProps {
  block: {
    _id: string;
    type: string;
    content: Record<string, any>;
  };
}

export function BlockRenderer({ block }: BlockRendererProps) {
  switch (block.type) {
    case "hero":
      return (
        <section className="hero">
          <h1>{block.content.title}</h1>
          <p>{block.content.subtitle}</p>
        </section>
      );

    case "text":
      return (
        <section className="text-block">
          <div dangerouslySetInnerHTML={{ __html: block.content.html }} />
        </section>
      );

    case "image":
      return (
        <figure>
          <img src={block.content.url} alt={block.content.alt} />
          {block.content.caption && <figcaption>{block.content.caption}</figcaption>}
        </figure>
      );

    case "gallery":
      return (
        <div className="gallery">
          {block.content.images?.map((img: any, i: number) => (
            <img key={i} src={img.url} alt={img.alt} />
          ))}
        </div>
      );

    default:
      console.warn(`Unknown block type: ${block.type}`);
      return null;
  }
}
```

---

## Security Best Practices

### 1. Restrict Allowed Origins

When creating an API key, specify allowed origins to prevent unauthorized domains from using your key:

```
https://mysite.com, https://www.mysite.com, https://staging.mysite.com
```

### 2. Use Environment Variables

**Never hardcode API credentials in your code!** Always use environment variables:

```env
# .env.local (Next.js)
NEXT_PUBLIC_CMS_API_KEY=cms_...
NEXT_PUBLIC_CMS_API_SECRET=secret_...

# .env (Vite)
VITE_CMS_API_KEY=cms_...
VITE_CMS_API_SECRET=secret_...
```

### 3. Understand the Exposure Trade-off

API keys used in client-side code are **visible in the browser**. This is acceptable because:

- ✅ API keys are **read-only** — they can only fetch published content
- ✅ Origin restrictions limit which domains can use the key
- ✅ You can revoke a key instantly if compromised
- ✅ Secrets cannot modify or delete any data

### 4. Rotating Keys

If you suspect a key has been compromised:

1. Go to **Connect Frontend** in the admin panel
2. Create a **new API key**
3. Update your frontend's environment variables
4. **Revoke** the old key

### 5. Separate Keys per Environment

Create separate API keys for:
- 🏠 Development (`http://localhost:3000`)
- 🧪 Staging (`https://staging.mysite.com`)
- 🚀 Production (`https://mysite.com`)

---

## Troubleshooting

### "Invalid API key" Error

- ✅ Verify the API key and secret are copied correctly (no extra spaces)
- ✅ Check that the key is **Active** (not Revoked) in the admin panel
- ✅ Ensure you're passing both `apiKey` and `apiSecret`

### "Origin not allowed" Error

- ✅ Add your frontend's domain to the **Allowed Origins** list
- ✅ For local development, add `http://localhost:3000` (or your port)
- ✅ Remember to include both `http://` and `https://` versions if needed

### Page Returns `null`

- ✅ The page must be **Published** (not Draft or Archived)
- ✅ Verify the slug is correct (case-sensitive, no leading slash)
- ✅ Check that the page exists in the CMS

### CORS Errors

If you see CORS errors in the browser console:

- ✅ Convex handles CORS automatically; ensure you're using the correct Convex URL
- ✅ Check that your frontend domain is in the Allowed Origins

### Connection Timeout

- ✅ Verify your Convex deployment is running (`npx convex dev` or deployed to production)
- ✅ Check your internet connection
- ✅ Ensure the Convex URL is correct

---

## Quick Reference

```bash
# Your Convex URL
https://your-deployment.convex.cloud

# Query endpoint
POST https://your-deployment.convex.cloud/api/query

# Request body format
{
  "path": "pages:getBySlugWithApiKey",
  "args": {
    "slug": "page-slug",
    "apiKey": "cms_...",
    "apiSecret": "secret_..."
  }
}
```

---

## Need Help?

- Check the [Convex Documentation](https://docs.convex.dev/)
- Review the CMS admin panel's **Connect Frontend** section for code snippets
- Contact your CMS administrator for API key issues
