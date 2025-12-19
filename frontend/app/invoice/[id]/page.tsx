"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit2, Save, X, Printer, Truck, FileText, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";

export default function InvoiceDetailPage() {
    const router = useRouter();
    const params = useParams();
    const invoiceId = params?.id as string;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        if (!invoiceId) return;

        const loadData = async () => {
            try {
                const invoiceData = await api.getInvoiceDetail(decodeURIComponent(invoiceId));
                setData(invoiceData);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load Invoice:", err);
                setLoading(false);
            }
        };

        loadData();
    }, [invoiceId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-primary font-medium">Loading...</div>
            </div>
        );
    }

    if (!data || !data.header) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-text-secondary">Invoice not found</div>
            </div>
        );
    }

    const { header, linked_dcs } = data;

    const Field = ({ label, value, isCurrency = false }: { label: string; value: any; isCurrency?: boolean }) => (
        <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-text-secondary mb-1">{label}</label>
            <div className={`text-sm text-text-primary ${isCurrency ? 'font-bold' : ''}`}>
                {isCurrency && value !== null && value !== undefined
                    ? `₹${value.toLocaleString('en-IN')}`
                    : (value || '-')}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="text-text-secondary hover:text-text-primary transition-colors p-1"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-[20px] font-semibold text-text-primary flex items-center gap-3 tracking-tight">
                            Invoice {header.invoice_number}
                        </h1>
                        <p className="text-[13px] text-text-secondary mt-1">
                            Issued Date: {header.invoice_date}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Print Order
                    </button>
                    {editMode ? (
                        <>
                            <button
                                onClick={() => setEditMode(false)}
                                className="px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50 flex items-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    alert('Save functionality coming soon');
                                }}
                                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Save
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setEditMode(true)}
                            className="px-4 py-2 text-sm font-medium bg-white text-text-primary border border-border rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                            <Edit2 className="w-4 h-4" />
                            Edit Invoice
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Details */}
                <div className="md:col-span-8 space-y-6">
                    {/* Basic Info */}
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-border bg-gray-50/30">
                            <h2 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Invoice Information
                            </h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Field label="Invoice Number" value={header.invoice_number} />
                            <Field label="Invoice Date" value={header.invoice_date} />
                            <Field label="Place of Supply" value={header.place_of_supply} />

                            <Field label="PO Reference(s)" value={header.po_numbers} />
                            <Field label="Customer GSTIN" value={header.customer_gstin} />
                        </div>
                    </div>

                    {/* Linked DCs */}
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-border bg-gray-50/30">
                            <h2 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
                                <Truck className="w-4 h-4 text-primary" />
                                Linked Delivery Challans
                            </h2>
                        </div>
                        {linked_dcs && linked_dcs.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 text-text-secondary font-semibold text-[11px] uppercase tracking-wider border-b border-border">
                                        <tr>
                                            <th className="px-6 py-3">DC Number</th>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Consignee</th>
                                            <th className="px-6 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50 bg-white">
                                        {linked_dcs.map((dc: any) => (
                                            <tr key={dc.dc_number} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-3 font-semibold text-text-primary text-[13px]">{dc.dc_number}</td>
                                                <td className="px-6 py-3 text-text-secondary text-[13px]">{dc.dc_date}</td>
                                                <td className="px-6 py-3 text-text-secondary text-[13px]">{dc.consignee_name}</td>
                                                <td className="px-6 py-3 text-right">
                                                    <button
                                                        onClick={() => router.push(`/dc/${dc.dc_number}`)}
                                                        className="text-primary hover:text-blue-700 text-[12px] font-medium flex items-center gap-1 justify-end"
                                                    >
                                                        View DC <ChevronRight className="w-3 h-3" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-6 text-text-secondary italic text-sm text-center">No Delivery Challans linked directly.</div>
                        )}
                    </div>

                    {/* Remarks */}
                    {header.remarks && (
                        <div className="glass-card p-6">
                            <h2 className="text-[14px] font-semibold text-text-primary mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Remarks
                            </h2>
                            <div className="text-[13px] text-text-secondary whitespace-pre-line leading-relaxed">{header.remarks}</div>
                        </div>
                    )}
                </div>

                {/* Right Column: Financials */}
                <div className="md:col-span-4 space-y-6">
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-border bg-gray-50/30">
                            <h2 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Financial Summary
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="pb-4 border-b border-border">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[13px] text-text-secondary">Taxable Value</span>
                                    <span className="text-[14px] font-semibold text-text-primary">₹{header.taxable_value?.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-3 pb-4 border-b border-border">
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-text-secondary">CGST</span>
                                    <span className="font-medium text-text-primary">₹{header.cgst?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-text-secondary">SGST</span>
                                    <span className="font-medium text-text-primary">₹{header.sgst?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-text-secondary">IGST</span>
                                    <span className="font-medium text-text-primary">₹{header.igst?.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-[14px] font-semibold text-text-primary">Total Value</span>
                                    <span className="text-[20px] font-bold text-primary">
                                        ₹{header.total_invoice_value?.toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-[10px] text-text-secondary text-right">Inclusive of all taxes</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
