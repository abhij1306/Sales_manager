"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, FileText } from "lucide-react";

export default function CreateInvoicePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dcId = searchParams.get('dc');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        alert("Create Invoice functionality coming soon!");
        // TODO: Implement actual Invoice creation logic
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
                            Create GST Invoice
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {dcId ? 'Generate Invoice from Delivery Challan' : 'Create new GST Invoice'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    Save Invoice
                </button>
            </div>

            {dcId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <h3 className="font-medium text-blue-900">Linked Delivery Challan</h3>
                    </div>
                    <p className="text-sm text-blue-800">
                        Creating invoice for DC ID: {dcId}
                    </p>
                </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                <p>Invoice creation form will be implemented here.</p>
                <p className="text-sm mt-2">Will include GST calculations and tax details.</p>
            </div>
        </div>
    );
}
