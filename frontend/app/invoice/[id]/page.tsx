"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, InvoiceDetail } from "@/lib/api";
import {
    ChevronLeft, Save, Edit, Trash2, Printer,
    Receipt, Calendar, Building, CreditCard,
    FileCheck, MapPin, Truck
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";

const Field = ({ label, value, icon: Icon, className }: { label: string, value: string | number | undefined, icon?: any, className?: string }) => (
    <div className={`flex flex-col ${className}`}>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
            {Icon && <Icon className="w-3 h-3" />}
            {label}
        </span>
        <span className="text-sm font-medium text-gray-900 bg-gray-50/50 px-3 py-2 rounded-lg border border-gray-100 min-h-[38px] flex items-center">
            {value || '-'}
        </span>
    </div>
);

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id: invoiceId } = use(params);

    const [data, setData] = useState<InvoiceDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadInvoice();
    }, [invoiceId]);

    const loadInvoice = async () => {
        try {
            const invData = await api.getInvoiceDetail(invoiceId);
            setData(invData);
        } catch (err) {
            console.error("Failed to load Invoice:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this Invoice? This will revert the DC status.")) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/invoice/${invoiceId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || "Failed to delete");
            }

            router.push('/invoice');
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading || !data) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
            </DashboardLayout>
        );
    }

    const { header, items } = data;

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-6xl mx-auto">
                {/* Header Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/invoice"
                            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Invoice #{header.invoice_number}</h1>
                                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200 uppercase tracking-wide">
                                    Generated
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" />
                                {header.invoice_date} • Linked to DC {header.linked_dc_numbers}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <GlassButton onClick={handleDelete} variant="danger" className="mr-2">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </GlassButton>
                        <GlassButton variant="primary">
                            <Printer className="w-4 h-4 mr-2" />
                            Print PDF
                        </GlassButton>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Invoice Info */}
                    <div className="space-y-6">
                        <GlassCard className="p-5">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                                <Building className="w-4 h-4 text-blue-500" />
                                Buyer Details
                            </h3>
                            <div className="space-y-4">
                                <Field label="Buyer Name" value={header.buyer_name} />
                                <Field label="Buyer GSTIN" value={header.buyer_gstin} />
                                <Field label="Address" value={header.buyer_address} />
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="State" value={header.buyer_state} />
                                    <Field label="State Code" value={header.buyer_state_code} />
                                </div>
                            </div>
                        </GlassCard>

                         <GlassCard className="p-5">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                                <Truck className="w-4 h-4 text-purple-500" />
                                Shipping & Logistics
                            </h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Vehicle No" value={header.vehicle_no} />
                                    <Field label="LR No" value={header.lr_no} />
                                </div>
                                <Field label="Transporter" value={header.transporter} />
                                <Field label="Place of Supply" value={header.place_of_supply} icon={MapPin} />
                            </div>
                        </GlassCard>
                    </div>

                    {/* Invoice Items & Totals */}
                    <div className="lg:col-span-2 space-y-6">
                        <GlassCard className="p-0 overflow-hidden min-h-[500px] flex flex-col">
                            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-900">Line Items</h3>
                            </div>

                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-4 py-4 text-right">HSN</th>
                                            <th className="px-4 py-4 text-right">Qty</th>
                                            <th className="px-4 py-4 text-right">Rate</th>
                                            <th className="px-6 py-4 text-right">Taxable</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate">
                                                    {item.description}
                                                </td>
                                                <td className="px-4 py-4 text-right font-mono text-gray-600">
                                                    {item.hsn_sac}
                                                </td>
                                                <td className="px-4 py-4 text-right font-medium">
                                                    {item.quantity} {item.unit}
                                                </td>
                                                <td className="px-4 py-4 text-right text-gray-600">
                                                    ₹{item.rate}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                    ₹{item.taxable_value?.toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary Footer */}
                            <div className="bg-gray-50/50 p-6 border-t border-gray-100">
                                <div className="flex justify-end">
                                    <div className="w-72 space-y-3">
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>Taxable Value</span>
                                            <span>₹{header.taxable_value?.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>CGST</span>
                                            <span>₹{header.cgst?.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>SGST</span>
                                            <span>₹{header.sgst?.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>IGST</span>
                                            <span>₹{header.igst?.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="pt-3 border-t border-gray-200 flex justify-between text-lg font-bold text-gray-900">
                                            <span>Total Amount</span>
                                            <span>₹{header.total_invoice_value?.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
