"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, ReconciliationItem, DCWithoutInvoice, SupplierSummary } from '@/lib/api';
import {
    FileBarChart,
    TrendingUp,
    AlertCircle,
    FileText,
    Truck,
    Download,
    Calendar
} from "lucide-react";
import Pagination from "@/components/Pagination";

export default function ReportsPage() {
    const router = useRouter();
    const [activeReport, setActiveReport] = useState("reconciliation");
    const [reconciliationData, setReconciliationData] = useState<ReconciliationItem[]>([]);
    const [dcWithoutInvoice, setDcWithoutInvoice] = useState<DCWithoutInvoice[]>([]);
    const [supplierSummary, setSupplierSummary] = useState<SupplierSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReportData();
    }, []);

    const loadReportData = async () => {
        setLoading(true);
        try {
            const [reconData, dcData, supplierData] = await Promise.all([
                api.getReport("po-dc-invoice-reconciliation"),
                api.getReport("dc-without-invoice"),
                api.getReport("supplier-summary")
            ]);

            setReconciliationData(reconData);
            setDcWithoutInvoice(dcData);
            setSupplierSummary(supplierData);
        } catch (err) {
            console.error("Failed to load report:", err);
        } finally {
            setLoading(false);
        }
    };

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [activeReport]);

    const getCurrentDataLength = () => {
        switch (activeReport) {
            case "reconciliation": return reconciliationData.length;
            case "dc-without-invoice": return dcWithoutInvoice.length;
            case "supplier-summary": return supplierSummary.length;
            default: return 0;
        }
    };

    const getPaginatedData = <T,>(data: T[]) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-[20px] font-semibold text-text-primary tracking-tight">Reports & Analytics</h1>
                <p className="text-[13px] text-text-secondary mt-1">Monitor discrepancies, track pending deliverables, and analyze supplier performance.</p>
            </div>

            {/* Visual KPI Cards for Quick Insights (Placeholder Data mostly) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 flex flex-col justify-between h-[140px]">
                    <div className="flex justify-between items-start">
                        <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Pending Reconciliations</p>
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-[24px] font-bold text-text-primary">
                            {reconciliationData.filter(r => r.pending_qty > 0).length}
                        </h3>
                        <p className="text-[12px] text-text-secondary mt-1">Items pending delivery</p>
                    </div>
                </div>

                <div className="glass-card p-6 flex flex-col justify-between h-[140px]">
                    <div className="flex justify-between items-start">
                        <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Uninvoiced Challans</p>
                        <div className="p-2 bg-blue-50 rounded-lg text-primary">
                            <FileText className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-[24px] font-bold text-text-primary">
                            {dcWithoutInvoice.length}
                        </h3>
                        <div className="flex items-center mt-1 text-primary text-[12px] font-medium">
                            <span>Requires Attention</span>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 flex flex-col justify-between h-[140px]">
                    <div className="flex justify-between items-start">
                        <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Total Sales (Year)</p>
                        <div className="p-2 bg-green-50 rounded-lg text-success">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-[24px] font-bold text-text-primary">
                            ₹{(supplierSummary.reduce((acc, curr) => acc + (curr.total_po_value || 0), 0) / 100000).toFixed(2)} L
                        </h3>
                        <div className="flex items-center mt-1 text-text-secondary text-[12px]">
                            <span>Year to date</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Tabs & Content */}
            <div className="glass-card overflow-hidden">
                <div className="border-b border-border bg-gray-50/30">
                    <div className="flex px-4 pt-2">
                        <button
                            onClick={() => setActiveReport("reconciliation")}
                            className={`px-4 py-3 text-[13px] font-semibold transition-all relative top-[1px] border-b-2 mr-4 ${activeReport === "reconciliation"
                                ? "border-primary text-primary bg-transparent"
                                : "border-transparent text-text-secondary hover:text-text-primary"
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <Truck className="w-3.5 h-3.5" />
                                PO-DC Reconciliation
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveReport("dc-without-invoice")}
                            className={`px-4 py-3 text-[13px] font-semibold transition-all relative top-[1px] border-b-2 mr-4 ${activeReport === "dc-without-invoice"
                                ? "border-primary text-primary bg-transparent"
                                : "border-transparent text-text-secondary hover:text-text-primary"
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5" />
                                DCs Without Invoice
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveReport("supplier-summary")}
                            className={`px-4 py-3 text-[13px] font-semibold transition-all relative top-[1px] border-b-2 mr-4 ${activeReport === "supplier-summary"
                                ? "border-primary text-primary bg-transparent"
                                : "border-transparent text-text-secondary hover:text-text-primary"
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <FileBarChart className="w-3.5 h-3.5" />
                                Supplier Summary
                            </span>
                        </button>
                    </div>
                </div>

                <div className="p-0">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-border bg-white flex justify-end">
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-border text-text-secondary text-xs font-medium rounded hover:bg-gray-50 transition-colors">
                            <Download className="w-3.5 h-3.5" />
                            Export CSV
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="text-primary font-medium">Loading report...</div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            {/* PO-DC Reconciliation Report */}
                            {activeReport === "reconciliation" && (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 text-text-secondary border-b border-border text-[11px] uppercase tracking-wider font-semibold">
                                            <th className="px-6 py-4">PO Number</th>
                                            <th className="px-6 py-4">Item</th>
                                            <th className="px-6 py-4 max-w-xs">Material</th>
                                            <th className="px-6 py-4 text-right">Ordered</th>
                                            <th className="px-6 py-4 text-right">Dispatched</th>
                                            <th className="px-6 py-4 text-right">Pending</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50 bg-white">
                                        {getPaginatedData(reconciliationData).map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-3 text-[13px] font-semibold text-text-primary">{row.po_number}</td>
                                                <td className="px-6 py-3 text-[13px] text-text-secondary">{row.po_item_no}</td>
                                                <td className="px-6 py-3 text-[13px] text-text-primary truncate max-w-xs" title={row.material_description || row.material_code}>
                                                    {row.material_description || row.material_code}
                                                </td>
                                                <td className="px-6 py-3 text-right text-[13px] font-medium text-text-secondary">{row.ord_qty}</td>
                                                <td className="px-6 py-3 text-right text-[13px] font-medium text-text-secondary">{row.dispatched_qty}</td>
                                                <td className={`px-6 py-3 text-right text-[13px] font-bold ${row.pending_qty > 0 ? 'text-warning' : 'text-success'}`}>
                                                    {row.pending_qty}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* DCs Without Invoice Report */}
                            {activeReport === "dc-without-invoice" && (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 text-text-secondary border-b border-border text-[11px] uppercase tracking-wider font-semibold">
                                            <th className="px-6 py-4">DC Number</th>
                                            <th className="px-6 py-4">DC Date</th>
                                            <th className="px-6 py-4">PO Number</th>
                                            <th className="px-6 py-4">Consignee</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50 bg-white">
                                        {getPaginatedData(dcWithoutInvoice).map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-3 text-[13px] font-semibold text-text-primary">{row.dc_number}</td>
                                                <td className="px-6 py-3 text-[13px] text-text-secondary">{row.dc_date}</td>
                                                <td className="px-6 py-3 text-[13px] text-text-primary font-medium">{row.po_number || "-"}</td>
                                                <td className="px-6 py-3 text-[13px] text-text-secondary">{row.consignee_name || "-"}</td>
                                                <td className="px-6 py-3 text-right">
                                                    <button
                                                        onClick={() => router.push(`/invoice/create?dc=${row.dc_number}`)}
                                                        className="text-[11px] font-medium text-primary hover:underline"
                                                    >
                                                        Create Invoice
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Supplier Summary Report */}
                            {activeReport === "supplier-summary" && (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 text-text-secondary border-b border-border text-[11px] uppercase tracking-wider font-semibold">
                                            <th className="px-6 py-4">Supplier</th>
                                            <th className="px-6 py-4 text-center">PO Count</th>
                                            <th className="px-6 py-4 text-right">Total Value</th>
                                            <th className="px-6 py-4 text-right">Last PO Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50 bg-white">
                                        {getPaginatedData(supplierSummary).map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-3 text-[13px] font-semibold text-text-primary">{row.supplier_name}</td>
                                                <td className="px-6 py-3 text-center text-[13px] text-text-secondary font-medium">{row.po_count}</td>
                                                <td className="px-6 py-3 text-right text-[13px] font-bold text-text-primary">
                                                    ₹{(row.total_po_value || 0).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-3 text-right text-[13px] text-text-secondary">{row.last_po_date || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            <Pagination
                                currentPage={currentPage}
                                totalItems={getCurrentDataLength()}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
