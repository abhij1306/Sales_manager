"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, DCDetail, DCListItem } from "@/lib/api";
import {
    ChevronLeft, Save, Edit, Trash2, Plus,
    Calendar, Building, FileText, Package, Truck,
    AlertTriangle, Check, X, Printer, Receipt, MapPin
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassInput } from "@/components/ui/glass/GlassInput";

// Field Component
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

const EditableField = ({ label, value, onChange, type = "text", readOnly = false }: any) => (
    <div className="flex flex-col">
         <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1">
            {label}
        </span>
        {readOnly ? (
            <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200 cursor-not-allowed">
                {value}
            </span>
        ) : (
            <input
                type={type}
                value={value || ''}
                onChange={onChange}
                className="text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
        )}
    </div>
);

export default function DCDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id: dcId } = use(params); // Use dc_number

    const [data, setData] = useState<DCDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasInvoice, setHasInvoice] = useState(false);

    useEffect(() => {
        loadDC();
    }, [dcId]);

    const loadDC = async () => {
        try {
            const dcData = await api.getDCDetail(dcId);
            setData(dcData);

            // Check for invoice link
            const invoiceCheck = await api.checkDCHasInvoice(dcId);
            setHasInvoice(invoiceCheck.has_invoice);

        } catch (err) {
            console.error("Failed to load DC:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!data) return;
        setSaving(true);
        try {
            // await api.updateDC(dcId, data);
            setEditMode(false);
        } catch (err) {
            console.error("Failed to save DC:", err);
            alert("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this DC?")) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/dc/${dcId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || "Failed to delete");
            }

            router.push('/dc');
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
                            href="/dc"
                            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">DC #{header.dc_number}</h1>
                                {hasInvoice ? (
                                    <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200 uppercase tracking-wide flex items-center gap-1">
                                        <Receipt className="w-3 h-3" /> Invoiced
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200 uppercase tracking-wide">
                                        Pending Invoice
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" />
                                {header.dc_date} • Linked to PO #{header.po_number}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!hasInvoice && (
                            <GlassButton
                                onClick={() => router.push(`/invoice/create?dc=${dcId}`)}
                                variant="primary"
                                className="mr-2 bg-green-600 hover:bg-green-700 shadow-green-500/20 border-transparent"
                            >
                                <Receipt className="w-4 h-4 mr-2" />
                                Create Invoice
                            </GlassButton>
                        )}

                        {editMode ? (
                            <>
                                <GlassButton onClick={() => setEditMode(false)} variant="ghost" disabled={saving}>
                                    Cancel
                                </GlassButton>
                                <GlassButton onClick={handleSave} loading={saving}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </GlassButton>
                            </>
                        ) : (
                            <>
                                <GlassButton onClick={handleDelete} variant="danger" className="mr-2">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </GlassButton>
                                {!hasInvoice && (
                                    <GlassButton onClick={() => setEditMode(true)} variant="secondary">
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit DC
                                    </GlassButton>
                                )}
                                <GlassButton variant="secondary">
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print
                                </GlassButton>
                            </>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Header Details */}
                    <div className="space-y-6">
                        <GlassCard className="p-5">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                                <Truck className="w-4 h-4 text-blue-500" />
                                Shipping Details
                            </h3>
                            <div className="space-y-4">
                                {editMode ? (
                                    <>
                                        <EditableField label="DC Number" value={header.dc_number} readOnly />
                                        <EditableField label="Consignee Name" value={header.consignee_name} onChange={(e: any) => setData({...data, header: {...header, consignee_name: e.target.value}})} />
                                        <EditableField label="Vehicle No" value={header.vehicle_no} onChange={(e: any) => setData({...data, header: {...header, vehicle_no: e.target.value}})} />
                                        <EditableField label="Transport Mode" value={header.mode_of_transport} onChange={(e: any) => setData({...data, header: {...header, mode_of_transport: e.target.value}})} />
                                    </>
                                ) : (
                                    <>
                                        <Field label="Consignee Name" value={header.consignee_name} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="Vehicle No" value={header.vehicle_no} />
                                            <Field label="Transport" value={header.mode_of_transport} />
                                        </div>
                                        <Field label="Consignee Address" value={header.consignee_address} className="col-span-2" />
                                    </>
                                )}
                            </div>
                        </GlassCard>

                        <GlassCard className="p-5">
                             <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-purple-500" />
                                References
                            </h3>
                             <div className="space-y-4">
                                 <Field label="Linked PO" value={header.po_number} />
                                 <Field label="E-Way Bill" value={header.eway_bill_no} />
                                 <Field label="LR Number" value={header.lr_no} />
                             </div>
                        </GlassCard>
                    </div>

                    {/* Dispatched Items */}
                    <div className="lg:col-span-2">
                        <GlassCard className="p-0 overflow-hidden min-h-[500px] flex flex-col">
                            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-900">Dispatched Items</h3>
                                <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-lg">
                                    {items.length} Items
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-4">Item Details</th>
                                            <th className="px-6 py-4">Lot</th>
                                            <th className="px-6 py-4 text-right">HSN</th>
                                            <th className="px-6 py-4 text-right">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{item.material_description}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">Code: {item.material_code}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                                        Lot #{item.lot_no}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-gray-600">
                                                    {item.hsn_code}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-bold text-gray-900 text-lg">
                                                        {item.dispatched_quantity}
                                                    </span>
                                                    <span className="text-xs text-gray-500 ml-1">{item.unit}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
