"use client";

import { useEffect, useState } from "react";
import { api, PONote } from "@/lib/api";
import {
    Plus, Edit2, Trash2, X, FileText, CheckSquare
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassInput } from "@/components/ui/glass/GlassInput";

export default function PONotesPage() {
    const [templates, setTemplates] = useState<PONote[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ title: "", content: "" });

    const loadTemplates = async () => {
        try {
            const data = await api.getPONotes();
            setTemplates(data);
        } catch (err) {
            console.error("Failed to load templates:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.updatePONote(editingId.toString(), formData);
            } else {
                await api.createPONote(formData);
            }
            setShowForm(false);
            setEditingId(null);
            setFormData({ title: "", content: "" });
            loadTemplates();
        } catch (err) {
            console.error("Failed to save template:", err);
        }
    };

    const handleEdit = (template: PONote) => {
        setFormData({ title: template.title, content: template.content });
        setEditingId(template.id);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this template?")) return;

        try {
            await api.deletePONote(id.toString());
            loadTemplates();
        } catch (err) {
            console.error("Failed to delete template:", err);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">PO Notes Templates</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage reusable notes for delivery challans</p>
                    </div>
                    <GlassButton
                        onClick={() => {
                            setFormData({ title: "", content: "" });
                            setEditingId(null);
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Template
                    </GlassButton>
                </div>

                {/* Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <GlassCard className="w-full max-w-2xl p-0 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 bg-white/90">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">
                                    {editingId ? "Edit Template" : "New Template"}
                                </h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <GlassInput
                                    label="Template Title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Standard Warranty Terms"
                                    required
                                />
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                                        Template Content
                                    </label>
                                    <textarea
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        rows={6}
                                        className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none backdrop-blur-sm"
                                        placeholder="Enter the template text here..."
                                        required
                                    />
                                </div>
                                <div className="flex gap-3 justify-end pt-4">
                                    <GlassButton
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setShowForm(false)}
                                    >
                                        Cancel
                                    </GlassButton>
                                    <GlassButton type="submit">
                                        {editingId ? "Update Template" : "Create Template"}
                                    </GlassButton>
                                </div>
                            </form>
                        </GlassCard>
                    </div>
                )}

                {/* Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template) => (
                        <GlassCard key={template.id} className="p-6 group flex flex-col h-full hover:border-blue-200 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 line-clamp-1">{template.title}</h3>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(template)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 bg-gray-50/50 rounded-lg border border-gray-100 p-3 mb-4">
                                <p className="text-sm text-gray-600 line-clamp-4 leading-relaxed whitespace-pre-wrap">{template.content}</p>
                            </div>

                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                                <span className="text-xs text-gray-400">
                                    Updated {new Date(template.updated_at).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                    <CheckSquare className="w-3 h-3" /> Active
                                </span>
                            </div>
                        </GlassCard>
                    ))}
                </div>

                {templates.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No templates yet</h3>
                        <p className="text-sm text-gray-500 mb-6">Create reusable notes to speed up your workflow</p>
                        <GlassButton onClick={() => setShowForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Template
                        </GlassButton>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
