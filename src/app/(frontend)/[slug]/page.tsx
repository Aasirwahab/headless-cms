"use client";

// ============================================================
// /[slug] — Public Frontend Page (Real-Time)
// ============================================================
// This is the page your clients' visitors see.
// It subscribes to Convex via useQuery inside LivePage.
//
// When an editor changes content in the CMS, this page
// updates INSTANTLY — no refresh, no deploy, no cache purge.
// ============================================================

import { LivePage } from "@/components/frontend/LivePage";
import { use } from "react";

export default function DynamicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <LivePage slug={slug} />;
}
