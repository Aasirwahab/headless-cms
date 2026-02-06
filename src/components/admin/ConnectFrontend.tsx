"use client";

// ============================================================
// CONNECT FRONTEND — API KEY MANAGEMENT
// ============================================================
// Admin UI for creating and managing API keys that allow
// external frontends to connect securely to the CMS.

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import type { Id } from "../../../convex/_generated/dataModel";

export function ConnectFrontend() {
    const { token, isAdmin } = useAuth();
    const apiKeys = useQuery(api.apiKeys.list, token ? { token } : "skip");

    const createKey = useMutation(api.apiKeys.create);
    const revokeKey = useMutation(api.apiKeys.revoke);
    const reactivateKey = useMutation(api.apiKeys.reactivate);
    const deleteKey = useMutation(api.apiKeys.deleteKey);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKey, setNewKey] = useState({ name: "", allowedOrigins: "" });
    const [createdKey, setCreatedKey] = useState<{
        key: string;
        secret: string;
        name: string;
    } | null>(null);
    const [selectedFramework, setSelectedFramework] = useState<"nextjs" | "react" | "vanilla">("nextjs");

    // Convex URL from environment
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://your-deployment.convex.cloud";

    async function handleCreateKey() {
        if (!token || !newKey.name) return;
        try {
            const result = await createKey({
                token,
                name: newKey.name,
                allowedOrigins: newKey.allowedOrigins
                    ? newKey.allowedOrigins.split(",").map((o) => o.trim())
                    : undefined,
            });
            setCreatedKey({
                key: result.key,
                secret: result.secret,
                name: result.name,
            });
            setNewKey({ name: "", allowedOrigins: "" });
        } catch (err: any) {
            alert(err.data ?? err.message);
        }
    }

    function getCodeSnippet(key: string, secret: string) {
        if (selectedFramework === "nextjs") {
            return `// 1. Install Convex
// npm install convex

// 2. Add to .env.local
NEXT_PUBLIC_CONVEX_URL=${convexUrl}
NEXT_PUBLIC_CMS_API_KEY=${key}
NEXT_PUBLIC_CMS_API_SECRET=${secret}

// 3. Create lib/cms.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function getPage(slug: string) {
  return client.query(api.pages.getBySlugWithApiKey, {
    slug,
    apiKey: process.env.NEXT_PUBLIC_CMS_API_KEY!,
    apiSecret: process.env.NEXT_PUBLIC_CMS_API_SECRET!,
  });
}

// 4. Use in your component
import { getPage } from "@/lib/cms";

export default async function AboutPage() {
  const page = await getPage("about");
  return <h1>{page?.title}</h1>;
}`;
        }

        if (selectedFramework === "react") {
            return `// 1. Install Convex
// npm install convex

// 2. Create cms-client.js
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("${convexUrl}");

export async function getPage(slug) {
  return client.query(api.pages.getBySlugWithApiKey, {
    slug,
    apiKey: "${key}",
    apiSecret: "${secret}",
  });
}

// 3. Use in your component
import { useEffect, useState } from "react";
import { getPage } from "./cms-client";

function AboutPage() {
  const [page, setPage] = useState(null);

  useEffect(() => {
    getPage("about").then(setPage);
  }, []);

  return <h1>{page?.title}</h1>;
}`;
        }

        return `// Vanilla JavaScript / cURL

// Fetch with cURL (for testing):
curl -X POST "${convexUrl}/api/query" \\
  -H "Content-Type: application/json" \\
  -d '{
    "path": "pages:getBySlugWithApiKey",
    "args": {
      "slug": "home",
      "apiKey": "${key}",
      "apiSecret": "${secret}"
    }
  }'

// Browser fetch example:
fetch("${convexUrl}/api/query", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    path: "pages:getBySlugWithApiKey",
    args: {
      slug: "home",
      apiKey: "${key}",
      apiSecret: "${secret}",
    },
  }),
})
  .then((res) => res.json())
  .then((data) => console.log(data));`;
    }

    if (!isAdmin) {
        return (
            <div className="p-6 text-center text-gray-500">
                Only admins can manage API keys.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Connect Frontend</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Create API keys for external frontends to access your content securely.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                    + Create API Key
                </button>
            </div>

            {/* Connection Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600">🔗</span>
                    </div>
                    <div>
                        <h3 className="font-medium text-blue-900">Your Convex URL</h3>
                        <code className="text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded mt-1 inline-block font-mono">
                            {convexUrl}
                        </code>
                        <p className="text-sm text-blue-600 mt-2">
                            All frontends need this URL plus an API key to connect.
                        </p>
                    </div>
                </div>
            </div>

            {/* API Keys List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                            <th className="text-left px-4 py-3 font-medium text-gray-500">API Key</th>
                            <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                            <th className="text-left px-4 py-3 font-medium text-gray-500">Last Used</th>
                            <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {apiKeys?.map((key) => (
                            <tr key={key._id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900">{key.name}</td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                    {key.key.slice(0, 12)}...
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${key.isActive
                                                ? "bg-green-100 text-green-800"
                                                : "bg-red-100 text-red-800"
                                            }`}
                                    >
                                        {key.isActive ? "Active" : "Revoked"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs">
                                    {key.lastUsedAt
                                        ? new Date(key.lastUsedAt).toLocaleDateString()
                                        : "Never"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        {key.isActive ? (
                                            <button
                                                onClick={() => revokeKey({ token: token!, apiKeyId: key._id })}
                                                className="text-xs px-3 py-1 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
                                            >
                                                Revoke
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => reactivateKey({ token: token!, apiKeyId: key._id })}
                                                className="text-xs px-3 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                            >
                                                Reactivate
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (confirm("Permanently delete this API key?")) {
                                                    deleteKey({ token: token!, apiKeyId: key._id });
                                                }
                                            }}
                                            className="text-xs px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {apiKeys?.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                                    No API keys yet. Create one to connect a frontend.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Key Modal */}
            {showCreateModal && !createdKey && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-semibold mb-4">Create API Key</h3>
                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-sm font-medium text-gray-700">Name</span>
                                <input
                                    type="text"
                                    value={newKey.name}
                                    onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                                    placeholder="Marketing Website"
                                    autoFocus
                                />
                            </label>
                            <label className="block">
                                <span className="text-sm font-medium text-gray-700">
                                    Allowed Origins (optional)
                                </span>
                                <input
                                    type="text"
                                    value={newKey.allowedOrigins}
                                    onChange={(e) =>
                                        setNewKey({ ...newKey, allowedOrigins: e.target.value })
                                    }
                                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                                    placeholder="https://example.com, https://app.example.com"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Comma-separated domains that can use this key. Leave empty for any origin.
                                </p>
                            </label>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateKey}
                                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    Create Key
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Key Created Modal - Show key and secret ONCE */}
            {createdKey && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-green-600 text-xl">✓</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">API Key Created</h3>
                                <p className="text-sm text-gray-500">{createdKey.name}</p>
                            </div>
                        </div>

                        {/* Warning */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-yellow-800">
                                <strong>⚠️ Save this secret now!</strong> It will only be shown once.
                            </p>
                        </div>

                        {/* Key and Secret */}
                        <div className="space-y-3 mb-6">
                            <div>
                                <label className="text-xs font-medium text-gray-500">API Key</label>
                                <div className="mt-1 bg-gray-100 rounded-lg px-3 py-2 font-mono text-sm break-all">
                                    {createdKey.key}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500">API Secret</label>
                                <div className="mt-1 bg-gray-100 rounded-lg px-3 py-2 font-mono text-sm break-all text-red-600">
                                    {createdKey.secret}
                                </div>
                            </div>
                        </div>

                        {/* Framework Selector */}
                        <div className="mb-4">
                            <label className="text-sm font-medium text-gray-700 block mb-2">
                                Get code for:
                            </label>
                            <div className="flex gap-2">
                                {(["nextjs", "react", "vanilla"] as const).map((fw) => (
                                    <button
                                        key={fw}
                                        onClick={() => setSelectedFramework(fw)}
                                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${selectedFramework === fw
                                                ? "bg-gray-900 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            }`}
                                    >
                                        {fw === "nextjs" ? "Next.js" : fw === "react" ? "React" : "Vanilla JS"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Code Snippet */}
                        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-sm text-gray-100 whitespace-pre-wrap font-mono">
                                {getCodeSnippet(createdKey.key, createdKey.secret)}
                            </pre>
                        </div>

                        <div className="mt-6 text-right">
                            <button
                                onClick={() => {
                                    setCreatedKey(null);
                                    setShowCreateModal(false);
                                }}
                                className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
