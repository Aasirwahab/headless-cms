"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import type { UserRole } from "@/types/cms";

type EntityField = {
    key: string;
    label: string;
    type: "text" | "textarea" | "select" | "checkbox" | "list";
    options?: { label: string; value: string }[];
    placeholder?: string;
};

type EntityManagerProps<T extends { _id: any }> = {
    title: string;
    items: T[] | undefined;
    fields: EntityField[];
    onSave: (data: any) => Promise<void>;
    onDelete: (id: any) => Promise<void>;
    renderItem: (item: T) => React.ReactNode;
    emptyMessage?: string;
    isAdmin: boolean;
};

export function EntityManager<T extends { _id: any }>({
    title,
    items,
    fields,
    onSave,
    onDelete,
    renderItem,
    emptyMessage = "No items found.",
    isAdmin,
}: EntityManagerProps<T>) {
    const [editingItem, setEditingItem] = useState<T | Partial<T> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    async function handleSave() {
        if (!editingItem) return;
        setIsSaving(true);
        try {
            await onSave(editingItem);
            setEditingItem(null);
        } catch (err: any) {
            alert(err.data ?? err.message);
        } finally {
            setIsSaving(false);
        }
    }

    const handleFieldChange = (key: string, value: any) => {
        setEditingItem((prev: any) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                {isAdmin && (
                    <button
                        onClick={() => setEditingItem({} as any)}
                        className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        + New {title.slice(0, -1)}
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium text-gray-500">Content</th>
                            <th className="text-right px-4 py-3 font-medium text-gray-500 text-nowrap">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {items?.map((item) => (
                            <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                    {renderItem(item)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2 text-nowrap">
                                        <button
                                            onClick={() => setEditingItem(item)}
                                            className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        {isAdmin && (
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Permanently delete this ${title.slice(0, -1).toLowerCase()}?`)) {
                                                        onDelete(item._id);
                                                    }
                                                }}
                                                className="text-xs px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {items?.length === 0 && (
                            <tr>
                                <td colSpan={2} className="px-4 py-12 text-center text-gray-400">
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editingItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-6">
                            {editingItem._id ? `Edit ${title.slice(0, -1)}` : `New ${title.slice(0, -1)}`}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fields.map((field) => (
                                <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                                    <label className="block mb-1">
                                        <span className="text-xs font-semibold text-gray-500 uppercase">{field.label}</span>
                                        {field.type === "textarea" ? (
                                            <textarea
                                                value={(editingItem as any)[field.key] ?? ""}
                                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[100px]"
                                                placeholder={field.placeholder}
                                            />
                                        ) : field.type === "checkbox" ? (
                                            <div className="mt-1 flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={!!(editingItem as any)[field.key]}
                                                    onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                />
                                                <span className="ml-2 text-sm text-gray-600">Visible on site</span>
                                            </div>
                                        ) : field.type === "list" ? (
                                            <div className="mt-1 space-y-2">
                                                {((editingItem as any)[field.key] || []).map((val: string, idx: number) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <input
                                                            value={val}
                                                            onChange={(e) => {
                                                                const newList = [...((editingItem as any)[field.key] || [])];
                                                                newList[idx] = e.target.value;
                                                                handleFieldChange(field.key, newList);
                                                            }}
                                                            className="flex-1 border rounded-lg px-3 py-1 text-sm"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const newList = ((editingItem as any)[field.key] || []).filter((_: any, i: number) => i !== idx);
                                                                handleFieldChange(field.key, newList);
                                                            }}
                                                            className="text-red-500 text-xs"
                                                        >Remove</button>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => {
                                                        const newList = [...((editingItem as any)[field.key] || []), ""];
                                                        handleFieldChange(field.key, newList);
                                                    }}
                                                    className="text-xs text-blue-600 font-medium"
                                                >+ Add Item</button>
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                value={(editingItem as any)[field.key] ?? ""}
                                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                                                placeholder={field.placeholder}
                                            />
                                        )}
                                    </label>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 justify-end mt-8 pt-4 border-t">
                            <button
                                onClick={() => setEditingItem(null)}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
