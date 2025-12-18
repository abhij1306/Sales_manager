"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

export default function CreatePOPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        alert("Create PO functionality coming soon!");
        // TODO: Implement actual PO creation logic
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Create Purchase Order
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Create a new manual purchase order
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    Save PO
                </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                <p>Manual PO creation form will be implemented here.</p>
                <p className="text-sm mt-2">Currently, please use the Bulk Upload feature.</p>
            </div>
        </div>
    );
}
