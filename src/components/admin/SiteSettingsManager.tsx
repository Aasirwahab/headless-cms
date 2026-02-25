"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function SiteSettingsManager() {
    const { token, isAdmin } = useAuth();
    const settings = useQuery(api.settings.get, token ? { token, key: "general" } : "skip");
    const upsertSettings = useMutation(api.settings.upsert);

    const [form, setForm] = useState({
        siteName: "",
        tagline: "",
        description: "",
        contactEmail: "",
        socialLinks: {
            instagram: "",
            twitter: "",
            linkedin: "",
        }
    });

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            setForm({
                siteName: settings.siteName ?? "",
                tagline: settings.tagline ?? "",
                description: settings.description ?? "",
                contactEmail: settings.contactEmail ?? "",
                socialLinks: {
                    instagram: settings.socialLinks?.instagram ?? "",
                    twitter: settings.socialLinks?.twitter ?? "",
                    linkedin: settings.socialLinks?.linkedin ?? "",
                }
            });
        }
    }, [settings]);

    async function handleSave() {
        if (!token || !isAdmin) return;
        setIsSaving(true);
        try {
            await upsertSettings({
                token,
                key: "general",
                ...form,
            });
            toast.success("Settings saved successfully!");
        } catch (err: any) {
            toast.error(err.data ?? err.message);
        } finally {
            setIsSaving(false);
        }
    }

    if (settings === undefined) {
        return <div className="py-12 text-center text-gray-400">Loading settings...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Site Settings</h2>
                {isAdmin && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">General Information</h3>

                    <label className="block">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Site Name</span>
                        <input
                            type="text"
                            value={form.siteName}
                            onChange={(e) => setForm({ ...form, siteName: e.target.value })}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                            placeholder="TERRAFORM"
                        />
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Tagline</span>
                        <input
                            type="text"
                            value={form.tagline}
                            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                            placeholder="Architectural Brutalism"
                        />
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Description</span>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[100px]"
                            placeholder="Global architectural practice..."
                        />
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Contact Email</span>
                        <input
                            type="email"
                            value={form.contactEmail}
                            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                            placeholder="studio@terraform.arch"
                        />
                    </label>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Social Links</h3>

                    <label className="block">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Instagram</span>
                        <input
                            type="text"
                            value={form.socialLinks.instagram}
                            onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, instagram: e.target.value } })}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                            placeholder="https://instagram.com/..."
                        />
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Twitter / X</span>
                        <input
                            type="text"
                            value={form.socialLinks.twitter}
                            onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, twitter: e.target.value } })}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                            placeholder="https://twitter.com/..."
                        />
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold text-gray-500 uppercase">LinkedIn</span>
                        <input
                            type="text"
                            value={form.socialLinks.linkedin}
                            onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, linkedin: e.target.value } })}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                            placeholder="https://linkedin.com/in/..."
                        />
                    </label>
                </div>
            </div>
        </div>
    );
}
