"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, FileText, Loader2, Lock, Package } from "lucide-react";
import { api } from "@/lib/api";
import type { InvoiceFormData, InvoiceItemUI } from "@/types/ui";
import { createDefaultInvoiceForm, invoiceUiToApi, validateInvoiceForm } from "@/lib/uiAdapters";
import type { ChangeEvent } from "react";

// ============================================================================
// CONSTANTS
// ============================================================================

const BUYER_DEFAULTS = {
    name: 'Sr. Accounts Officer (PB), M/S Bharat Heavy Electrical Ltd.',
    gstin: '23AAACB4146P1ZN',
    state: 'MP',
    place_of_supply: 'BHOPAL, MP'
};

const TAX_RATES = { cgst: 9.0, sgst: 9.0 };

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function numberToWords(num: number): string {
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    function convertLessThanThousand(n: number): string {
        if (n === 0) return '';
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertLessThanThousand(n % 100) : '');
    }

    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;

    let result = '';
    if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
    if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
    if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
    if (remainder > 0) result += convertLessThanThousand(remainder);

    return result.trim();
}

function amountInWords(amount: number): string {
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    let words = 'Rupees ' + numberToWords(rupees);
    if (paise > 0) words += ' and Paise ' + numberToWords(paise);
    words += ' Only';

    return words;
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface InputProps {
    label: string;
    value: string;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
    readOnly?: boolean;
}

const Input = ({ label, value, onChange, type = "text", placeholder = "", required = false, readOnly = false }: InputProps) => (
    <div>
        <label className="block text-[11px] uppercase tracking-wider font-semibold text-text-secondary mb-1">
            {label} {required && <span className="text-danger">*</span>}
        </label>
        <div className="relative">
            <input
                type={type}
                value={value}
                onChange={onChange}
                readOnly={readOnly}
                placeholder={placeholder}
                className={`w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-text-primary ${readOnly ? 'bg-gray-50 text-text-secondary cursor-not-allowed' : 'bg-white'
                    }`}
            />
            {readOnly && <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-text-secondary" />}
        </div>
    </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CreateInvoicePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dcId = searchParams?.get('dc');

    const [activeTab, setActiveTab] = useState('details');
    const [loading, setLoading] = useState(!!dcId);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItemUI[]>([]);

    // Use strict UI type for form data
    const [formData, setFormData] = useState<InvoiceFormData>(
        createDefaultInvoiceForm(dcId || undefined)
    );

    useEffect(() => {
        if (!dcId) {
            setError("No DC specified. Please create invoice from a Delivery Challan.");
            setLoading(false);
            return;
        }

        const loadDC = async () => {
            try {
                const data = await api.getDCDetail(dcId);
                if (!data || !data.header) {
                    setError("Failed to load DC details");
                    setLoading(false);
                    return;
                }

                setFormData(prev => ({
                    ...prev,
                    dcNumber: data.header.dc_number || '',
                    buyersOrderNo: data.header.po_number?.toString() || '',
                    buyersOrderDate: data.header.po_date || ''
                }));

                if (data.items && data.items.length > 0) {
                    const items: InvoiceItemUI[] = data.items.map((item: any) => {
                        const qty = item.dispatch_qty || item.dispatch_quantity || 0;
                        const rate = item.po_rate || 0;
                        const taxableValue = qty * rate;
                        const cgstAmount = (taxableValue * TAX_RATES.cgst) / 100;
                        const sgstAmount = (taxableValue * TAX_RATES.sgst) / 100;
                        const total = taxableValue + cgstAmount + sgstAmount;

                        return {
                            lotNumber: item.lot_no?.toString() || '',
                            description: item.description || item.material_description || '',
                            hsnCode: item.hsn_code || '',
                            quantity: qty,
                            unit: 'NO',
                            rate: rate,
                            taxableValue,
                            tax: {
                                cgstRate: TAX_RATES.cgst,
                                cgstAmount,
                                sgstRate: TAX_RATES.sgst,
                                sgstAmount,
                                igstRate: 0,
                                igstAmount: 0
                            },
                            totalAmount: total
                        };
                    });

                    setInvoiceItems(items);

                    const totals = items.reduce((acc, item) => ({
                        taxable: acc.taxable + item.taxableValue,
                        cgst: acc.cgst + item.tax.cgstAmount,
                        sgst: acc.sgst + item.tax.sgstAmount,
                        total: acc.total + item.totalAmount
                    }), { taxable: 0, cgst: 0, sgst: 0, total: 0 });

                    setFormData(prev => ({
                        ...prev,
                        taxable_value: totals.taxable,
                        cgst: totals.cgst,
                        sgst: totals.sgst,
                        total_invoice_value: totals.total
                    }));
                }

                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch DC:", err);
                setError(err instanceof Error ? err.message : "Failed to load DC details");
                setLoading(false);
            }
        };

        loadDC();
    }, [dcId]);

    const handleSubmit = async () => {
        if (saving) return;

        if (!formData.invoice_number || !formData.invoice_number.trim()) {
            setError("Invoice Number is required");
            return;
        }

        setError(null);
        setSaving(true);

        try {
            const payload = {
                invoice_number: formData.invoice_number,
                invoice_date: formData.invoice_date, dc_number: formData.dc_number,
                buyer_name: formData.buyer_name, buyer_gstin: formData.buyer_gstin,
                buyer_state: formData.buyer_state, place_of_supply: formData.place_of_supply,
                buyers_order_no: formData.buyers_order_no, buyers_order_date: formData.buyers_order_date,
                vehicle_no: formData.vehicle_no, lr_no: formData.lr_no,
                transporter: formData.transporter, destination: formData.destination,
                terms_of_delivery: formData.terms_of_delivery, gemc_number: formData.gemc_number,
                mode_of_payment: formData.mode_of_payment, payment_terms: formData.payment_terms,
                despatch_doc_no: formData.despatch_doc_no, srv_no: formData.srv_no,
                srv_date: formData.srv_date, remarks: formData.remarks
            };

            const response = await api.createInvoice(payload);
            if (response.invoice_number) {
                router.push(`/invoice/${response.invoice_number}`);
            } else {
                router.push('/invoice');
            }
        } catch (err) {
            console.error("Failed to create invoice:", err);
            setError(err instanceof Error ? err.message : "Failed to create invoice");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (!dcId) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <FileText className="w-16 h-16 text-text-secondary mb-4" />
                <p className="text-text-secondary">Please create invoice from a Delivery Challan</p>
                <button onClick={() => router.push('/dc')} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700">
                    Go to Delivery Challans
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-text-secondary hover:text-text-primary transition-colors p-1">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-[20px] font-semibold text-text-primary flex items-center gap-3">
                            Create GST Invoice
                            <span className="text-[11px] font-medium text-text-secondary bg-gray-100 px-2 py-0.5 rounded border border-border flex items-center gap-1">
                                DC: <span className="text-primary cursor-pointer hover:underline" onClick={() => router.push(`/dc/${dcId}`)}>{formData.dc_number}</span>
                            </span>
                        </h1>
                        <p className="text-[13px] text-text-secondary mt-0.5">
                            Date: {formData.invoice_date}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50 transition-colors"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || invoiceItems.length === 0}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> Save
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="glass-card p-4 bg-red-50 border-red-200">
                    <div className="flex items-center gap-2 text-red-700">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="glass-card overflow-hidden">
                <div className="border-b border-border">
                    <div className="flex gap-8 px-6">
                        <button onClick={() => setActiveTab('details')} className={`py-3 text-sm font-medium transition-colors relative ${activeTab === 'details' ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                            Invoice and Despatch Details
                            {activeTab === 'details' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>}
                        </button>
                        <button onClick={() => setActiveTab('transport')} className={`py-3 text-sm font-medium transition-colors relative ${activeTab === 'transport' ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                            Transport and Payment
                            {activeTab === 'transport' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>}
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'details' && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input label="Invoice Number" value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} required placeholder="e.g., INV/2024-25/001" />
                            <Input label="Invoice Date" type="date" value={formData.invoice_date} onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })} required />
                            <Input label="GEMC / E-way Bill" value={formData.gemc_number || ''} onChange={(e) => setFormData({ ...formData, gemc_number: e.target.value })} placeholder="Optional" />
                            <Input label="Challan No" value={formData.dc_number} readOnly />

                            <Input label="Challan Date" value={formData.challan_date || ''} readOnly />
                            <Input label="Buyer's Order No" value={formData.buyers_order_no || ''} readOnly />
                            <Input label="Buyer's Order Date" value={formData.buyers_order_date || ''} readOnly />
                            <Input label="Despatch Doc No" value={formData.despatch_doc_no || ''} onChange={(e) => setFormData({ ...formData, despatch_doc_no: e.target.value })} />

                            <Input label="SRV No" value={formData.srv_no || ''} onChange={(e) => setFormData({ ...formData, srv_no: e.target.value })} />
                            <Input label="SRV Date" type="date" value={formData.srv_date || ''} onChange={(e) => setFormData({ ...formData, srv_date: e.target.value })} />
                            <div className="md:col-span-2">
                                <Input label="Buyer Name" value={formData.buyer_name} onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })} required />
                            </div>

                            <Input label="Buyer GSTIN" value={formData.buyer_gstin || ''} onChange={(e) => setFormData({ ...formData, buyer_gstin: e.target.value })} />
                            <Input label="State" value={formData.buyer_state || ''} onChange={(e) => setFormData({ ...formData, buyer_state: e.target.value })} />
                            <Input label="Place of Supply" value={formData.place_of_supply || ''} onChange={(e) => setFormData({ ...formData, place_of_supply: e.target.value })} />
                        </div>
                    )}

                    {activeTab === 'transport' && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input label="Vehicle Number" value={formData.vehicle_no || ''} onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value })} placeholder="e.g., MP04-AA-1234" />
                            <Input label="LR Number" value={formData.lr_no || ''} onChange={(e) => setFormData({ ...formData, lr_no: e.target.value })} />
                            <Input label="Transporter" value={formData.transporter || ''} onChange={(e) => setFormData({ ...formData, transporter: e.target.value })} />
                            <Input label="Destination" value={formData.destination || ''} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} />

                            <Input label="Terms of Delivery" value={formData.terms_of_delivery || ''} onChange={(e) => setFormData({ ...formData, terms_of_delivery: e.target.value })} />
                            <Input label="Mode of Payment" value={formData.mode_of_payment || ''} onChange={(e) => setFormData({ ...formData, mode_of_payment: e.target.value })} />
                            <Input label="Payment Terms" value={formData.payment_terms || ''} onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })} />
                        </div>
                    )}
                </div>
            </div>

            {/* Items Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border bg-gray-50/30">
                    <h3 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" /> Invoice Items (from DC)
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-text-secondary font-semibold text-[11px] uppercase tracking-wider border-b border-border">
                            <tr>
                                <th className="px-4 py-3">Lot No</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3 text-right">Qty</th>
                                <th className="px-4 py-3">Unit</th>
                                <th className="px-4 py-3 text-right">Rate</th>
                                <th className="px-4 py-3 text-right">Taxable Value</th>
                                <th className="px-4 py-3 text-right">CGST (9%)</th>
                                <th className="px-4 py-3 text-right">SGST (9%)</th>
                                <th className="px-4 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 bg-white">
                            {invoiceItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3 text-sm text-text-primary">{item.lotNumber}</td>
                                    <td className="px-4 py-3 text-sm text-text-primary">{item.description}</td>
                                    <td className="px-4 py-3 text-sm text-text-primary text-right">{item.quantity}</td>
                                    <td className="px-4 py-3 text-sm text-text-secondary">{item.unit}</td>
                                    <td className="px-4 py-3 text-sm text-text-primary text-right">₹{item.rate.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm text-text-primary text-right font-medium">₹{item.taxableValue.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm text-text-primary text-right">₹{item.tax.cgstAmount.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm text-text-primary text-right">₹{item.tax.sgstAmount.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm text-text-primary text-right font-semibold">₹{item.totalAmount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tax Summary */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border bg-gray-50/30">
                    <h3 className="text-[14px] font-semibold text-text-primary">Tax Summary</h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-border">
                                <span className="text-sm text-text-secondary">Taxable Value</span>
                                <span className="text-sm font-semibold text-text-primary">₹{(formData.taxable_value || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-border">
                                <span className="text-sm text-text-secondary">CGST (9%)</span>
                                <span className="text-sm font-semibold text-text-primary">₹{(formData.cgst || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-border">
                                <span className="text-sm text-text-secondary">SGST (9%)</span>
                                <span className="text-sm font-semibold text-text-primary">₹{(formData.sgst || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t-2 border-primary">
                                <span className="text-sm font-semibold text-text-primary">Total Invoice Value</span>
                                <span className="text-lg font-bold text-primary">₹{(formData.total_invoice_value || 0).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-border">
                            <h4 className="text-xs font-semibold text-text-secondary uppercase">Amount in Words</h4>
                            <div className="space-y-2">
                                <div className="text-xs text-text-secondary">
                                    <span className="font-semibold">CGST (in words):</span>
                                    <div className="mt-1 text-text-primary">{amountInWords(formData.cgst || 0)}</div>
                                </div>
                                <div className="text-xs text-text-secondary">
                                    <span className="font-semibold">SGST (in words):</span>
                                    <div className="mt-1 text-text-primary">{amountInWords(formData.sgst || 0)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
