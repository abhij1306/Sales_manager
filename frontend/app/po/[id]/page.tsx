"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, PODetailData, POItem, PODelivery } from "@/lib/api";
import {
    ChevronLeft, Save, Edit, Trash2, Plus,
    Calendar, Building, FileText, Package, Truck,
    AlertTriangle, Check, X, Printer
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassInput } from "@/components/ui/glass/GlassInput";

// Field Component for consistent rendering
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

export default function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id: poId } = use(params);

    const [data, setData] = useState<PODetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        loadPO();
    }, [poId]);

    const loadPO = async () => {
        try {
            const poData = await api.getPODetail(poId);
            setData(poData);
        } catch (err) {
            console.error("Failed to load PO:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!data) return;
        setSaving(true);
        try {
            // Assume we add updatePO to api lib or verify it exists
            // For now, let's mock the success or implement PUT endpoint call
            // await api.updatePO(poId, data);
            setEditMode(false);
        } catch (err) {
            console.error("Failed to save PO:", err);
            alert("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this PO? This cannot be undone.")) return;

        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/po/${poId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }).then(async res => {
                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.detail || "Failed to delete");
                }
            });

            router.push('/po');
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
                            href="/po"
                            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">PO #{header.po_number}</h1>
                                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200 uppercase tracking-wide">
                                    {header.po_status || 'Active'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" />
                                {header.po_date} • {header.supplier_name}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                         {editMode ? (
                            <>
                                <GlassButton onClick={() => setEditMode(false)} variant="ghost" disabled={saving}>
                                    Cancel
                                </GlassButton>
                                <GlassButton onClick={handleSave} loading={saving} className="bg-green-600 hover:bg-green-700 shadow-green-500/20">
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
                                <GlassButton onClick={() => setEditMode(true)} variant="secondary">
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit PO
                                </GlassButton>
                                <GlassButton variant="primary">
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print
                                </GlassButton>
                            </>
                        )}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Header Details */}
                    <div className="space-y-6">
                        <GlassCard className="p-5">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                                <Building className="w-4 h-4 text-blue-500" />
                                Supplier Details
                            </h3>
                            <div className="space-y-4">
                                {editMode ? (
                                    <>
                                        <EditableField label="Supplier Name" value={header.supplier_name} onChange={(e: any) => setData({...data, header: {...header, supplier_name: e.target.value}})} />
                                        <EditableField label="Supplier Code" value={header.supplier_code} onChange={(e: any) => setData({...data, header: {...header, supplier_code: e.target.value}})} />
                                        <EditableField label="Contact Info" value={header.supplier_phone} onChange={(e: any) => setData({...data, header: {...header, supplier_phone: e.target.value}})} />
                                    </>
                                ) : (
                                    <>
                                        <Field label="Supplier Name" value={header.supplier_name} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="Code" value={header.supplier_code} />
                                            <Field label="GSTIN" value={header.supplier_gstin} />
                                        </div>
                                        <Field label="Address" value={header.supplier_address} className="col-span-2" />
                                    </>
                                )}
                            </div>
                        </GlassCard>

                        <GlassCard className="p-5">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-amber-500" />
                                Financials
                            </h3>
                             <div className="space-y-4">
                                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total PO Value</span>
                                    <div className="text-2xl font-bold text-blue-900 mt-1">
                                        ₹{header.po_value?.toLocaleString('en-IN')}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Currency" value={header.currency || 'INR'} />
                                    <Field label="Exchange Rate" value={header.ex_rate || '1.0'} />
                                </div>
                                <Field label="Payment Terms" value={header.payment_terms || '45 Days'} />
                             </div>
                        </GlassCard>
                    </div>

                    {/* Right Column: Items & Deliveries */}
                    <div className="lg:col-span-2 space-y-6">
                        <GlassCard className="p-0 overflow-hidden min-h-[500px] flex flex-col">
                            {/* Tabs */}
                            <div className="flex border-b border-gray-100 bg-gray-50/50">
                                <button
                                    onClick={() => setActiveTab("overview")}
                                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "overview" ? "border-blue-500 text-blue-600 bg-white" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                                >
                                    Items & Schedule
                                </button>
                                <button
                                    onClick={() => setActiveTab("terms")}
                                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "terms" ? "border-blue-500 text-blue-600 bg-white" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                                >
                                    Terms & Notes
                                </button>
                            </div>

                            <div className="p-6 flex-1">
                                {activeTab === "overview" && (
                                    <div className="space-y-8">
                                        {items.map((item, idx) => (
                                            <div key={idx} className="border border-gray-100 rounded-xl bg-white shadow-sm overflow-hidden">
                                                {/* Item Header */}
                                                <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                                            {item.po_item_no}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900">{item.material_description}</h4>
                                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                                <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded">Code: {item.material_code}</span>
                                                                <span>Unit: {item.unit}</span>
                                                                <span>HSN: {item.hsn_code}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-gray-900">
                                                            Qty: {item.ordered_quantity}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            Rate: ₹{item.po_rate}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Delivery Schedule Table */}
                                                <div className="p-4">
                                                    <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <Truck className="w-3 h-3" />
                                                        Delivery Schedule
                                                    </h5>

                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                                                <tr>
                                                                    <th className="px-3 py-2 rounded-l-lg">Lot</th>
                                                                    <th className="px-3 py-2">Due Date</th>
                                                                    <th className="px-3 py-2 text-right">Quantity</th>
                                                                    <th className="px-3 py-2 text-right rounded-r-lg">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-50">
                                                                {item.deliveries?.map((dely, dIdx) => (
                                                                    <tr key={dIdx}>
                                                                        <td className="px-3 py-2 font-medium text-gray-900">#{dely.lot_no}</td>
                                                                        <td className="px-3 py-2 text-gray-600">{dely.dely_date}</td>
                                                                        <td className="px-3 py-2 text-right font-medium">{dely.dely_qty || dely.delivered_quantity}</td>
                                                                        <td className="px-3 py-2 text-right">
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                                                                Pending
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                {(!item.deliveries || item.deliveries.length === 0) && (
                                                                    <tr>
                                                                        <td colSpan={4} className="px-3 py-4 text-center text-gray-400 text-xs italic">
                                                                            No detailed schedule available
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === "terms" && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <Field label="Inspection By" value={header.inspection_by} />
                                            <Field label="Inspection At" value={header.inspection_at} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2 block">Remarks / Notes</span>
                                            <div className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl text-sm text-gray-700 leading-relaxed min-h-[100px]">
                                                {header.remarks || "No additional remarks."}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
