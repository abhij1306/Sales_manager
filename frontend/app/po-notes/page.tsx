"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, FileText, X, CheckSquare } from "lucide-react";
import { api } from '@/lib/api';

interface PONoteTemplate {
    id: string;
    title: string;
    content: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export default function PONotesPage() {
    const [templates, setTemplates] = useState<PONoteTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ title: "", content: "" });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const data = await api.getPONotes();
            setTemplates(data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to load templates:", err);
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingId) {
                await api.updatePONote(editingId, formData);
            } else {
                await api.createPONote(formData);
            }

            setFormData({ title: "", content: "" });
            setEditingId(null);
            setShowForm(false);
            loadTemplates();
        } catch (err) {
            console.error("Failed to save template:", err);
        }
    };

    const handleEdit = (template: PONoteTemplate) => {
        setFormData({ title: template.title, content: template.content });
        setEditingId(template.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this template?")) return;

        try {
            await api.deletePONote(id);
            loadTemplates();
        } catch (err) {
            console.error("Failed to delete template:", err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-primary font-medium">Loading templates...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between pb-2">
                <div>
                    <h1 className="text-[20px] font-semibold text-text-primary tracking-tight">PO Notes Templates</h1>
                    <p className="text-[13px] text-text-secondary mt-1">Manage reusable notes for delivery challans</p>
                </div>
                <button
                    onClick={() => {
                        setFormData({ title: "", content: "" });
                        setEditingId(null);
                        setShowForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Template
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card-no-hover w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-border bg-gray-50/50 flex items-center justify-between">
                            <h2 className="text-[16px] font-semibold text-text-primary">
                                {editingId ? "Edit Template" : "New Template"}
                            </h2>
                            <button
                                onClick={() => setShowForm(false)}
                                className="text-text-secondary hover:text-text-primary p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="mb-4">
                                <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                                    Template Title
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-text-primary bg-white text-sm"
                                    placeholder="e.g., Standard Warranty Terms"
                                    required
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                                    Template Content
                                </label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    rows={6}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-text-primary bg-white text-sm"
                                    placeholder="Enter the template text here..."
                                    required
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingId(null);
                                        setFormData({ title: "", content: "" });
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    {editingId ? "Update Template" : "Create Template"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                    <div
                        key={template.id}
                        className="glass-card p-6 group flex flex-col h-full"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-indigo-100/50">
                                    <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <h3 className="text-[14px] font-semibold text-text-primary line-clamp-1" title={template.title}>{template.title}</h3>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEdit(template)}
                                    className="p-1.5 text-text-secondary hover:text-primary hover:bg-blue-50 rounded transition-colors"
                                    title="Edit"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(template.id)}
                                    className="p-1.5 text-text-secondary hover:text-danger hover:bg-red-50 rounded transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-gray-50/50 rounded border border-border/50 p-3 mb-4">
                            <p className="text-[13px] text-text-secondary line-clamp-4 leading-relaxed whitespace-pre-wrap">{template.content}</p>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                            <div className="text-[11px] text-text-secondary/70">
                                Updated {new Date(template.updated_at).toLocaleDateString()}
                            </div>
                            <span className="flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
                                <CheckSquare className="w-3 h-3" /> Active
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {templates.length === 0 && (
                <div className="text-center py-16 bg-white/40 border border-dashed border-border rounded-xl">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                        <FileText className="w-8 h-8 text-text-secondary/50" />
                    </div>
                    <h3 className="text-[16px] font-medium text-text-primary mb-1">No templates yet</h3>
                    <p className="text-[13px] text-text-secondary mb-6">Create reusable notes to speed up your workflow</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Create First Template
                    </button>
                </div>
            )}
        </div>
    );
}
