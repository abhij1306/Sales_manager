"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, FileText, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function CreateInvoicePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dcId = searchParams.get('dc');

    const [loading, setLoading] = useState(!!dcId); // Loading if fetching DC data
    const [saving, setSaving] = useState(false);
    const [dcData, setDcData] = useState<any>(null);

    // Form State
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

        // Fetch DC Data to auto-populate
        fetch(`http://localhost:8000/api/dc/${dcId}`)
            .then(res => res.json())
            .then(data => {
                setDcData(data);
                if (data.header) {
                    setFormData(prev => ({
                        ...prev,
                        linked_dc_numbers: data.header.dc_number,
                        po_numbers: data.header.po_number?.toString() || '',
                        customer_gstin: data.header.consignee_gstin || '',
                    }));
                }
                // Auto-calculate taxable value from items
                if (data.items) {
                    const totalTaxable = data.items.reduce((acc: number, item: any) => {
                        const qty = item.dispatch_qty || 0;
                        const rate = item.po_rate || 0;
                        return acc + (qty * rate);
                    }, 0);
                    setFormData(prev => ({ ...prev, taxable_value: totalTaxable }));
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch DC:", err);
                setLoading(false);
            });
    }, [dcId]);

    // Format helpers
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    // Calculations
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
            // Parse DC numbers
            const dcNumbers = formData.linked_dc_numbers.split(',').map(s => s.trim()).filter(Boolean);

            // Call API
            await api.createInvoice(formData, dcNumbers);

            alert('Invoice Created Successfully!');
            router.push('/invoice'); // Redirect to list
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
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const Input = ({ label, field, type = "text", placeholder = "", required = false, readOnly = false }: any) => (
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type={type}
                value={formData[field as keyof typeof formData]}
                onChange={(e) => setFormData({ ...formData, [field]: e.target.value })} // Basic text/number update
                readOnly={readOnly}
                placeholder={placeholder}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${readOnly ? 'bg-gray-50 text-gray-500 border-gray-200' : 'border-gray-300 text-gray-900'
                    }`}
            />
        </div>
    );

    // Numeric input handler
    const handleNumberChange = (field: string, val: string) => {
        setFormData({ ...formData, [field]: parseFloat(val) || 0 });
    };

    const NumberInput = ({ label, field }: any) => (
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 text-sm">₹</span>
                <input
                    type="number"
                    value={formData[field as keyof typeof formData] || ''}
                    onChange={(e) => handleNumberChange(field, e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-right text-gray-900"
                />
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Create GST Invoice</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {dcId ? `Generating from DC #${formData.linked_dc_numbers}` : 'Create New Invoice'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Invoice
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Main Form */}
                <div className="col-span-8 space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Invoice Details</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <Input label="Invoice Number" field="invoice_number" required placeholder="e.g. INV/23-24/001" />
                            <Input label="Invoice Date" field="invoice_date" type="date" required />
                            <Input label="Linked DC(s)" field="linked_dc_numbers" placeholder="Comma separated DC numbers" />
                            <Input label="PO Number(s)" field="po_numbers" placeholder="Comma separated PO numbers" />
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Customer Details</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <Input label="Customer GSTIN" field="customer_gstin" />
                            <Input label="Place of Supply" field="place_of_supply" placeholder="State Name / Code" />
                        </div>
                    </div>

                    {/* Remarks */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Additional Notes</h3>
                        <textarea
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                            placeholder="Terms of delivery, payment terms, or any other remarks..."
                        />
                    </div>
                </div>

                {/* Financials Sidebar */}
                <div className="col-span-4 space-y-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Financials</h3>
                        <div className="space-y-4">
                            <NumberInput label="Taxable Value" field="taxable_value" />

                            <div className="pt-4 border-t border-gray-100 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <NumberInput label="CGST" field="cgst" />
                                    <NumberInput label="SGST" field="sgst" />
                                </div>
                                <NumberInput label="IGST" field="igst" />
                            </div>

                            <div className="pt-4 border-t border-gray-200 mt-4">
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-sm font-semibold text-gray-900">Total Invoice Value</label>
                                    <span className="text-2xl font-bold text-blue-600">
                                        {formatCurrency(formData.total_invoice_value)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 text-right">Includes all taxes</p>
                            </div>
                        </div>
                    </div>

                    {/* Helper Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex gap-2">
                            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <div className="text-sm text-blue-900">
                                <p className="font-medium mb-1">Auto-Calculation</p>
                                <p>Total value is automatically calculated as Taxable + CGST + SGST + IGST.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
