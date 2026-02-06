"use client";

// ============================================================
// LIVE PAGE COMPONENT
// ============================================================
// THIS IS THE REAL-TIME MAGIC.
//
// useQuery(api.pages.getBySlug, { slug }) creates a reactive
// subscription to the Convex backend. When ANY content on this
// page changes — text, images, blocks reordered, new blocks
// added — Convex pushes the update and React re-renders.
//
// No polling. No WebSocket boilerplate. No page refresh.
// The content just appears instantly.
//
// ARCHITECTURE:
// ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
// │  CMS Admin   │───▶│   Convex    │───▶│  Frontend   │
// │  (editor)    │    │  (database) │    │  (useQuery) │
// └─────────────┘    └─────────────┘    └─────────────┘
//       writes            pushes           re-renders
// ============================================================

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { BlockRenderer, GlobalSectionRenderer } from "./BlockRenderer";
import Head from "next/head";

type LivePageProps = {
  slug: string;
  /** Optional: render custom loading state */
  loadingComponent?: React.ReactNode;
  /** Optional: render custom 404 */
  notFoundComponent?: React.ReactNode;
};

export function LivePage({
  slug,
  loadingComponent,
  notFoundComponent,
}: LivePageProps) {
  // ⚡ REAL-TIME SUBSCRIPTION
  // This single hook is the entire real-time pipeline.
  // Convex handles the WebSocket, diffing, and push updates.
  const page = useQuery(api.pages.getBySlug, { slug });

  // Loading state (query hasn't resolved yet)
  if (page === undefined) {
    return (
      loadingComponent ?? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="h-4 w-48 bg-gray-200 rounded" />
          </div>
        </div>
      )
    );
  }

  // 404 state
  if (page === null) {
    return (
      notFoundComponent ?? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
            <p className="text-gray-500">Page not found</p>
          </div>
        </div>
      )
    );
  }

  return (
    <>
      {/* SEO Head (for SSR/SSG, use generateMetadata in the page route) */}
      {page.seo && (
        <Head>
          <title>{page.seo.title ?? page.title}</title>
          {page.seo.description && (
            <meta name="description" content={page.seo.description} />
          )}
          {page.seo.ogImage && (
            <meta property="og:image" content={page.seo.ogImage} />
          )}
          {page.seo.noIndex && <meta name="robots" content="noindex" />}
        </Head>
      )}

      {/* Header */}
      <GlobalSectionRenderer section={page.header} />

      {/* Page Blocks — each one re-renders when its content changes */}
      <main>
        {page.blocks.map((block) => (
          <BlockRenderer key={block._id} block={block} />
        ))}
      </main>

      {/* Footer */}
      <GlobalSectionRenderer section={page.footer} />
    </>
  );
}

// ============================================================
// USAGE IN A NEXT.JS PAGE ROUTE:
//
// // app/(frontend)/[slug]/page.tsx
// "use client";
// import { LivePage } from "@/components/frontend/LivePage";
//
// export default function DynamicPage({
//   params,
// }: {
//   params: { slug: string };
// }) {
//   return <LivePage slug={params.slug} />;
// }
//
// That's it. The page is now real-time.
// ============================================================
