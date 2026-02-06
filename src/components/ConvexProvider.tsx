"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// ============================================================
// CONVEX PROVIDER
// ============================================================
// Wraps the app with Convex client. The CONVEX_URL connects to
// your deployment and enables all reactive queries (useQuery).
//
// In a multi-frontend setup, each frontend app includes its own
// ConvexProvider pointing to the SAME Convex deployment URL.
// This is how multiple frontends stay in sync.
// ============================================================

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
