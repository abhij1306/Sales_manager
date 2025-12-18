"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit2, Save, X, Plus, FileText } from "lucide-react";

export default function DCDetailPage() {
    const router = useRouter();
    const params = useParams();
    const dcId = params?.id as string;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [hasInvoice, setHasInvoice] = useState(false);
    const [invoiceId, setInvoiceId] = useState<string | null>(null);

    useEffect(() => {
        if (!dcId) return;

        // Load DC data
        fetch(`http://localhost:8000/api/dc/${dcId}`)
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load DC:", err);
                setLoading(false);
            });

        // Check if DC has Invoice
        fetch(`http://localhost:8000/api/dc/${dcId}/invoice`)
            .then(res => res.json())
            .then(invoiceData => {
                if (invoiceData && invoiceData.invoice_id) {
                    setHasInvoice(true);
                    setInvoiceId(invoiceData.invoice_id);
                }
            })
            .catch(err => {
                console.log("No Invoice found for this DC");
            });
    }, [dcId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">DC not found</div>
            </div>
        );
    }

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
                            Delivery Challan {data.dc_number}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Date: {data.dc_date} | PO: {data.po_number}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {editMode ? (
                        <>
                            <button
                                onClick={() => setEditMode(false)}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                <X className="w-4 h-4 inline mr-2" />
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    alert('Save functionality coming soon');
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Save className="w-4 h-4 inline mr-2" />
                                Save Changes
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => {
                                    if (hasInvoice && invoiceId) {
                                        router.push(`/invoice/${invoiceId}`);
                                    } else {
                                        router.push(`/invoice/create?dc=${dcId}`);
                                    }
                                }}
                                className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${hasInvoice
                                        ? 'bg-blue-600 hover:bg-blue-700'
                                        : 'bg-green-600 hover:bg-green-700'
                                    }`}
                            >
                                <FileText className="w-4 h-4" />
                                {hasInvoice ? 'Edit Invoice' : 'Create Invoice'}
                            </button>
                            <button
                                onClick={() => setEditMode(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Edit2 className="w-4 h-4 inline mr-2" />
                                Edit
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* DC Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">DC Information</h2>
                <div className="grid grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">DC Number</label>
                        <div className="text-sm text-gray-900">{data.dc_number || '-'}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">DC Date</label>
                        <div className="text-sm text-gray-900">{data.dc_date || '-'}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">PO Number</label>
                        <div className="text-sm text-gray-900">
                            <button
                                onClick={() => router.push(`/po/${data.po_number}`)}
                                className="text-blue-600 hover:text-blue-700 hover:underline"
                            >
                                {data.po_number}
                            </button>
                        </div>
                    </div>
                    <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Consignee Name</label>
                        <div className="text-sm text-gray-900">{data.consignee_name || '-'}</div>
                    </div>
                    <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Consignee Address</label>
                        <div className="text-sm text-gray-900">{data.consignee_address || '-'}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Number</label>
                        <div className="text-sm text-gray-900">{data.vehicle_number || '-'}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">LR Number</label>
                        <div className="text-sm text-gray-900">{data.lr_number || '-'}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Transporter</label>
                        <div className="text-sm text-gray-900">{data.transporter_name || '-'}</div>
                    </div>
                </div>
            </div>

            {/* Items Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Items</h2>
                <div className="text-sm text-gray-500">
                    Items will be displayed here when DC items are loaded from the backend.
                </div>
            </div>
        </div>
    );
}
