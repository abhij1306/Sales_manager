"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Printer, FileText, Package, Truck, Lock } from "lucide-react";
import { api } from "@/lib/api";

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

const Input = ({ label, value, onChange, type = "text", placeholder = "", required = false, readOnly = false }: any) => (
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

export default function InvoiceDetailPage() {
    const router = useRouter();
    const params = useParams();
    const invoiceId = params?.id as string;
    const [activeTab, setActiveTab] = useState('details');

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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

    const { header, items = [], linked_dcs = [] } = data;

    return (
        <div className="space-y-6">
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
                        <h1 className="text-[20px] font-semibold text-text-primary flex items-center gap-3">
                            Invoice {header.invoice_number}
                            {linked_dcs && linked_dcs.length > 0 && (
                                <span className="text-[11px] font-medium text-text-secondary bg-gray-100 px-2 py-0.5 rounded border border-border flex items-center gap-1">
                                    DC: {linked_dcs.map((dc: any, i: number) => (
                                        <span key={dc.dc_number} className="text-primary cursor-pointer hover:underline" onClick={() => router.push(`/dc/${dc.id || dc.dc_number}`)}>
                                            {dc.dc_number}{i < linked_dcs.length - 1 ? ',' : ''}
                                        </span>
                                    ))}
                                </span>
                            )}
                        </h1>
                        <p className="text-[13px] text-text-secondary mt-0.5">
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
                        Print Invoice
                    </button>
                </div>
            </div>

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
                            <Input label="Invoice Number" value={header.invoice_number} readOnly />
                            <Input label="Invoice Date" value={header.invoice_date} readOnly />
                            <Input label="GEMC / E-way Bill" value={header.gemc_number} readOnly />
                            <Input label="Challan No" value={header.linked_dc_numbers} readOnly />

                            <Input label="Challan Date" value={header.dc_date || ''} readOnly />
                            <Input label="Buyer's Order No" value={header.buyers_order_no} readOnly />
                            <Input label="Buyer's Order Date" value={header.buyers_order_date} readOnly />
                            <Input label="Despatch Doc No" value={header.despatch_doc_no} readOnly />

                            <Input label="SRV No" value={header.srv_no} readOnly />
                            <Input label="SRV Date" value={header.srv_date} readOnly />
                            <div className="md:col-span-2">
                                <Input label="Buyer Name" value={header.buyer_name} readOnly />
                            </div>

                            <Input label="Buyer GSTIN" value={header.buyer_gstin} readOnly />
                            <Input label="State" value={header.buyer_state} readOnly />
                            <Input label="Place of Supply" value={header.place_of_supply} readOnly />
                        </div>
                    )}

                    {activeTab === 'transport' && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input label="Vehicle Number" value={header.vehicle_no} readOnly />
                            <Input label="LR Number" value={header.lr_no} readOnly />
                            <Input label="Transporter" value={header.transporter} readOnly />
                            <Input label="Destination" value={header.destination} readOnly />

                            <Input label="Terms of Delivery" value={header.terms_of_delivery} readOnly />
                            <Input label="Mode of Payment" value={header.mode_of_payment} readOnly />
                            <Input label="Payment Terms" value={header.payment_terms} readOnly />
                        </div>
                    )}
                </div>
            </div>

            {/* Items Table */}
            {items && items.length > 0 && (
                <div className="glass-card overflow-hidden">
                    <div className="p-4 border-b border-border bg-gray-50/30">
                        <h3 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary" /> Invoice Items
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
                                {items.map((item: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-text-primary">{item.po_sl_no}</td>
                                        <td className="px-4 py-3 text-sm text-text-primary">{item.description}</td>
                                        <td className="px-4 py-3 text-sm text-text-primary text-right">{item.quantity}</td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">{item.unit}</td>
                                        <td className="px-4 py-3 text-sm text-text-primary text-right">₹{item.rate?.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm text-text-primary text-right font-medium">₹{item.taxable_value?.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm text-text-primary text-right">₹{item.cgst_amount?.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm text-text-primary text-right">₹{item.sgst_amount?.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm text-text-primary text-right font-semibold">₹{item.total_amount?.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
                                <span className="text-sm font-semibold text-text-primary">₹{header.taxable_value?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-border">
                                <span className="text-sm text-text-secondary">CGST (9%)</span>
                                <span className="text-sm font-semibold text-text-primary">₹{header.cgst?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-border">
                                <span className="text-sm text-text-secondary">SGST (9%)</span>
                                <span className="text-sm font-semibold text-text-primary">₹{header.sgst?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t-2 border-primary">
                                <span className="text-sm font-semibold text-text-primary">Total Invoice Value</span>
                                <span className="text-lg font-bold text-primary">₹{header.total_invoice_value?.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-border">
                            <h4 className="text-xs font-semibold text-text-secondary uppercase">Amount in Words</h4>
                            <div className="space-y-2">
                                <div className="text-xs text-text-secondary">
                                    <span className="font-semibold">CGST (in words):</span>
                                    <div className="mt-1 text-text-primary">{amountInWords(header.cgst || 0)}</div>
                                </div>
                                <div className="text-xs text-text-secondary">
                                    <span className="font-semibold">SGST (in words):</span>
                                    <div className="mt-1 text-text-primary">{amountInWords(header.sgst || 0)}</div>
                                </div>
                                <div className="text-xs text-text-secondary">
                                    <span className="font-semibold">Total (in words):</span>
                                    <div className="mt-1 text-text-primary">{amountInWords(header.total_invoice_value || 0)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Linked DCs */}
            {linked_dcs && linked_dcs.length > 0 && (
                <div className="glass-card overflow-hidden">
                    <div className="p-4 border-b border-border bg-gray-50/30">
                        <h2 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
                            <Truck className="w-4 h-4 text-primary" />
                            Linked Delivery Challans
                        </h2>
                    </div>
                    <div className="p-4">
                        {linked_dcs.map((dc: any) => (
                            <button
                                key={dc.dc_number}
                                onClick={() => router.push(`/dc/${dc.dc_number}`)}
                                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between"
                            >
                                <div>
                                    <div className="text-sm font-semibold text-text-primary">{dc.dc_number}</div>
                                    <div className="text-xs text-text-secondary">{dc.dc_date}</div>
                                </div>
                                <ArrowLeft className="w-4 h-4 text-text-secondary rotate-180" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
