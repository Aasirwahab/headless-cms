"use client";

// ============================================================
// / — Homepage
// ============================================================
// Lists published pages or shows the homepage content.
// Also real-time — new pages appear instantly when published.
// ============================================================

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";

export default function HomePage() {
  const pages = useQuery(api.pages.listPublished);
  const globals = useQuery(api.globalSections.getDefaults);

  if (pages === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Simple navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-bold text-gray-900">My Site</span>
          <div className="flex gap-6">
            {pages.map((page) => (
              <Link
                key={page._id}
                href={`/${page.slug}`}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {page.title}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Landing content */}
      <main className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Real-Time CMS
        </h1>
        <p className="text-lg text-gray-500 mb-8">
          Content updates instantly across all connected frontends.
        </p>

        {pages.length > 0 ? (
          <div className="grid gap-4 max-w-md mx-auto">
            {pages.map((page) => (
              <Link
                key={page._id}
                href={`/${page.slug}`}
                className="block p-4 border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-sm transition-all text-left"
              >
                <h2 className="font-semibold text-gray-900">{page.title}</h2>
                {page.seo?.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {page.seo.description}
                  </p>
                )}
                <span className="text-xs text-gray-400 mt-2 block">
                  /{page.slug}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-gray-400">
            <p>No pages published yet.</p>
            <a href="/admin" className="text-blue-600 underline mt-2 inline-block">
              Go to CMS →
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
