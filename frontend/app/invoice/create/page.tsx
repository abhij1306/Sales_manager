"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, FileText, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

function CreateInvoicePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dcId = searchParams.get('dc');

    const [loading, setLoading] = useState(!!dcId);
    const [saving, setSaving] = useState(false);
    const [dcData, setDcData] = useState<any>(null);

    const [formData, setFormData] = useState({
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        linked_dc_numbers: '',
        po_numbers: '',
        customer_gstin: '',
        place_of_supply: '',
        taxable_value: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total_invoice_value: 0,
        remarks: ''
    });

    useEffect(() => {
        if (!dcId) return;

        const loadDC = async () => {
            try {
                const data = await api.getDCDetail(dcId);
                setDcData(data);
                if (data.header) {
                    setFormData(prev => ({
                        ...prev,
                        linked_dc_numbers: data.header.dc_number || '',
                        po_numbers: data.header.po_number?.toString() || '',
                        customer_gstin: data.header.supplier_gstin || data.header.consignee_gstin || '',
                        place_of_supply: data.header.consignee_address?.split(',').pop()?.trim() || '',
                    }));
                }
                if (data.items) {
                    const totalTaxable = data.items.reduce((acc: number, item: any) => {
                        const qty = item.dispatch_qty || 0;
                        const rate = item.po_rate || 0;
                        return acc + (qty * rate);
                    }, 0);
                    setFormData(prev => ({ ...prev, taxable_value: totalTaxable }));
                }
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch DC:", err);
                setLoading(false);
            }
        };

        loadDC();
    }, [dcId]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    useEffect(() => {
        const taxable = Number(formData.taxable_value) || 0;
        const cgst = Number(formData.cgst) || 0;
        const sgst = Number(formData.sgst) || 0;
        const igst = Number(formData.igst) || 0;

        const total = taxable + cgst + sgst + igst;
        setFormData(prev => ({ ...prev, total_invoice_value: total }));
    }, [formData.taxable_value, formData.cgst, formData.sgst, formData.igst]);

    const handleSave = async () => {
        if (!formData.invoice_number) {
            alert("Invoice Number is required");
            return;
        }

        setSaving(true);
        try {
            const dcNumbers = formData.linked_dc_numbers.split(',').map(s => s.trim()).filter(Boolean);
            await api.createInvoice(formData, dcNumbers);
            // alert('Invoice Created Successfully!'); // Optional: Remove alert, let redirect handle UX
            router.push('/invoice');
        } catch (err: any) {
            console.error("Save failed:", err);
            alert("Error saving invoice: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const Input = ({ label, field, type = "text", placeholder = "", required = false, readOnly = false }: any) => (
        <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-text-secondary mb-1">
                {label} {required && <span className="text-danger">*</span>}
            </label>
            <input
                type={type}
                value={formData[field as keyof typeof formData]}
                onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                readOnly={readOnly}
                placeholder={placeholder}
                className={`w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-text-primary bg-white ${readOnly ? 'bg-gray-50 text-text-secondary' : ''}`}
            />
        </div>
    );

    const handleNumberChange = (field: string, val: string) => {
        setFormData({ ...formData, [field]: parseFloat(val) || 0 });
    };

    const NumberInput = ({ label, field }: any) => (
        <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-text-secondary mb-1">{label}</label>
            <div className="relative">
                <span className="absolute left-3 top-2 text-text-secondary text-xs font-semibold">₹</span>
                <input
                    type="number"
                    value={formData[field as keyof typeof formData] || ''}
                    onChange={(e) => handleNumberChange(field, e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary font-bold text-right text-text-primary"
                />
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-text-secondary hover:text-text-primary transition-colors p-1">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-[20px] font-semibold text-text-primary tracking-tight">Create GST Invoice</h1>
                        <p className="text-[13px] text-text-secondary mt-1">
                            {dcId ? `Generating from DC #${formData.linked_dc_numbers}` : 'Create New Invoice'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Main Form */}
                <div className="md:col-span-8 space-y-6">
                    {/* Basic Details Card */}
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-border bg-gray-50/30">
                            <h3 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Basic Details
                            </h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Input label="Invoice Number" field="invoice_number" required placeholder="e.g. INV/23-24/001" />
                            <Input label="Invoice Date" field="invoice_date" type="date" required />
                            <Input label="Place of Supply" field="place_of_supply" placeholder="State Name / Code" />
                            <Input label="PO Number(s)" field="po_numbers" placeholder="Comma separated PO numbers" />
                            <Input label="Customer GSTIN" field="customer_gstin" />
                            <Input label="Linked DC(s)" field="linked_dc_numbers" placeholder="Comma separated DC numbers" />
                        </div>
                    </div>

                    {/* Remarks Card */}
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-border bg-gray-50/30">
                            <h3 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Additional Notes
                            </h3>
                        </div>
                        <div className="p-4">
                            <textarea
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary h-24 text-text-primary"
                                placeholder="Terms of delivery, payment terms, or any other remarks..."
                            />
                        </div>
                    </div>
                </div>

                {/* Financials Sidebar */}
                <div className="md:col-span-4 space-y-6">
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-border bg-gray-50/30">
                            <h3 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Financials
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <NumberInput label="Taxable Value" field="taxable_value" />

                            <div className="pt-4 border-t border-border space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <NumberInput label="CGST" field="cgst" />
                                    <NumberInput label="SGST" field="sgst" />
                                </div>
                                <NumberInput label="IGST" field="igst" />
                            </div>

                            <div className="pt-4 border-t border-border mt-2">
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-[13px] font-semibold text-text-primary">Total Invoice Value</label>
                                    <span className="text-[20px] font-bold text-primary">
                                        {formatCurrency(formData.total_invoice_value)}
                                    </span>
                                </div>
                                <p className="text-[11px] text-text-secondary text-right">Includes all taxes</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Float Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-border z-20 flex justify-end gap-3 max-w-[1240px] mx-auto w-full">
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Invoice
                </button>
            </div>
        </div>
    );
}

export default function CreateInvoicePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <CreateInvoicePageContent />
        </Suspense>
    );
}
