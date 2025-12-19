"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit2, Save, X, Printer, Truck, FileText } from "lucide-react";

export default function InvoiceDetailPage() {
    const router = useRouter();
    const params = useParams();
    const invoiceId = params?.id as string; // This is actually invoice_number in our router logic

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        if (!invoiceId) return;

        // Load Invoice data
        // Note: The API router expects invoice_number, so we need to make sure we encode it if it has slashes
        // But Next.js params usually decode it. Let's try direct.
        fetch(`http://localhost:8000/api/invoice/${encodeURIComponent(invoiceId)}`)
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load Invoice:", err);
                setLoading(false);
            });
    }, [invoiceId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    if (!data || !data.header) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Invoice not found</div>
            </div>
        );
    }

    const { header, linked_dcs } = data;

    const Field = ({ label, value, isCurrency = false }: { label: string; value: any; isCurrency?: boolean }) => (
        <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">{label}</label>
            <div className={`text-sm text-gray-900 ${isCurrency ? 'font-medium' : ''}`}>
                {isCurrency && value !== null && value !== undefined
                    ? `₹${value.toLocaleString('en-IN')}`
                    : (value || '-')}
            </div>
        </div>
    );

    return (
        <div className="p-4 max-w-[98%] mx-auto">
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
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            Invoice {header.invoice_number}
                        </h1>
                        <p className="text-xs text-gray-500">
                            Date: {header.invoice_date}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.print()}
                        className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1.5"
                    >
                        <Printer className="w-3 h-3" />
                        Print
                    </button>
                    {editMode ? (
                        <>
                            <button
                                onClick={() => setEditMode(false)}
                                className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                            >
                                <X className="w-3 h-3 inline mr-1" />
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    alert('Save functionality coming soon');
                                }}
                                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                <Save className="w-3 h-3 inline mr-1" />
                                Save
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setEditMode(true)}
                            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            <Edit2 className="w-3 h-3 inline mr-1" />
                            Edit
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left Column: Details */}
                <div className="col-span-8 space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white rounded border border-gray-200 p-4">
                        <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            Invoice Information
                        </h2>
                        <div className="grid grid-cols-3 gap-4">
                            <Field label="Invoice Number" value={header.invoice_number} />
                            <Field label="Invoice Date" value={header.invoice_date} />
                            <Field label="Place of Supply" value={header.place_of_supply} />

                            <Field label="PO Reference(s)" value={header.po_numbers} />
                            <Field label="Customer GSTIN" value={header.customer_gstin} />
                            {/* Empty slot or add something else */}
                            <div className="hidden md:block"></div>
                        </div>
                    </div>

                    {/* Linked DCs */}
                    <div className="bg-white rounded border border-gray-200 p-4">
                        <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-blue-600" />
                            Linked Delivery Challans
                        </h2>
                        {linked_dcs && linked_dcs.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium">
                                        <tr>
                                            <th className="px-4 py-2">DC Number</th>
                                            <th className="px-4 py-2">Date</th>
                                            <th className="px-4 py-2">Consignee</th>
                                            <th className="px-4 py-2">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {linked_dcs.map((dc: any) => (
                                            <tr key={dc.dc_number} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 font-medium text-gray-900">{dc.dc_number}</td>
                                                <td className="px-4 py-2 text-gray-600">{dc.dc_date}</td>
                                                <td className="px-4 py-2 text-gray-600">{dc.consignee_name}</td>
                                                <td className="px-4 py-2">
                                                    <button
                                                        onClick={() => router.push(`/dc/${dc.dc_number}`)}
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        View DC
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-gray-500 italic">No Delivery Challans linked directly.</div>
                        )}
                    </div>

                    {/* Remarks */}
                    {header.remarks && (
                        <div className="bg-white rounded border border-gray-200 p-4">
                            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                Remarks
                            </h2>
                            <div className="text-xs text-gray-900 whitespace-pre-line">{header.remarks}</div>
                        </div>
                    )}
                </div>

                {/* Right Column: Financials */}
                <div className="col-span-4 space-y-4">
                    <div className="bg-white rounded border border-gray-200 p-4 shadow-sm">
                        <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            Financial Summary
                        </h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                                <Field label="Taxable Value" value={header.taxable_value} isCurrency />
                            </div>

                            <div className="space-y-3 pb-4 border-b border-gray-100">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600">CGST</span>
                                    <span className="font-medium">₹{header.cgst?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600">SGST</span>
                                    <span className="font-medium">₹{header.sgst?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600">IGST</span>
                                    <span className="font-medium">₹{header.igst?.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-base font-semibold text-gray-900">Total Value</span>
                                    <span className="text-xl font-bold text-blue-600">
                                        ₹{header.total_invoice_value?.toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 text-right mt-1">Inclusive of GST</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
