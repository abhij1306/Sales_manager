"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, InvoiceListItem, InvoiceStats } from "@/lib/api";
import { Plus, Search, Filter, Download, ListFilter, TrendingUp, AlertCircle, FileText, CheckCircle } from "lucide-react";

export default function InvoicePage() {
    const router = useRouter();
    const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
    const [stats, setStats] = useState<InvoiceStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Statuses");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [invoicesData, statsData] = await Promise.all([
                    api.listInvoices(),
                    api.getInvoiceStats()
                ]);
                setInvoices(invoicesData);
                setStats(statsData);
            } catch (err) {
                console.error("Failed to load invoice data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Helper to determine status color (Mock logic)
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Paid': return 'bg-green-100 text-green-700';
            case 'Pending': return 'bg-yellow-100 text-yellow-700';
            case 'Overdue': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    // Filter logic
    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch =
            inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inv.customer_gstin && inv.customer_gstin.toLowerCase().includes(searchQuery.toLowerCase()));

        // Mock status filtering since status isn't real yet
        // const matchesStatus = statusFilter === 'All Statuses' || inv.status === statusFilter;

        return matchesSearch;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Page Header */}
            <div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">GST Invoices</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage invoices, track payments, and link delivery challans.</p>
                    </div>
                    <button
                        onClick={() => router.push('/invoice/create')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Create New Invoice
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total Invoiced */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Invoiced</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                ₹{stats.total_invoiced.toLocaleString('en-IN')}
                            </h3>
                            <div className="flex items-center mt-2 text-green-600 text-sm font-medium">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                <span>{stats.total_invoiced_change}% from last month</span>
                            </div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                    </div>

                    {/* Pending Payments */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Pending Payments</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                ₹{stats.pending_payments.toLocaleString('en-IN')}
                            </h3>
                            <div className="mt-2 text-gray-500 text-sm">
                                {stats.pending_payments_count} Invoices unpaid
                            </div>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg">
                            <AlertCircle className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>

                    {/* GST Collected */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total GST Collected</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                ₹{stats.gst_collected.toLocaleString('en-IN')}
                            </h3>
                            <div className="flex items-center mt-2 text-green-600 text-sm font-medium">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                <span>{stats.gst_collected_change}% from last month</span>
                            </div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
            )}

            {/* Filters & Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search Invoice # or Customer"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option>All Statuses</option>
                            <option>Paid</option>
                            <option>Pending</option>
                            <option>Overdue</option>
                        </select>
                        <Filter className="w-4 h-4 absolute right-3 top-3 text-gray-400 pointer-events-none" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                        <ListFilter className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full whitespace-nowrap">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice #</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Linked Challans</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Taxable Amt</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Amt</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredInvoices.map((invoice) => {
                                // Mock status assignment for demo (random/hash based on ID)
                                const statuses = ['Paid', 'Pending', 'Overdue'];
                                const status = statuses[invoice.invoice_number.charCodeAt(invoice.invoice_number.length - 1) % 3];

                                return (
                                    <tr key={invoice.invoice_number} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(status)} flex w-fit items-center gap-1`}>
                                                <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                                {status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => router.push(`/invoice/${invoice.invoice_number}`)}
                                                className="text-blue-600 font-medium hover:text-blue-800 hover:underline"
                                            >
                                                {invoice.invoice_number}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {invoice.invoice_date}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {invoice.customer_gstin || 'Unknown Customer'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {invoice.linked_dc_numbers ? invoice.linked_dc_numbers.split(',').map((dc, i) => (
                                                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded border border-gray-200">
                                                        {dc.trim()}
                                                    </span>
                                                )) : (
                                                    <span className="text-gray-400 text-xs italic">None</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-blue-600 font-medium">
                                            {invoice.taxable_value ? `₹${invoice.taxable_value.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                                            {invoice.total_invoice_value ? `₹${invoice.total_invoice_value.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button className="text-gray-400 hover:text-gray-600">
                                                <div className="w-1 h-1 bg-current rounded-full mb-1 mx-auto" />
                                                <div className="w-1 h-1 bg-current rounded-full mb-1 mx-auto" />
                                                <div className="w-1 h-1 bg-current rounded-full mx-auto" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredInvoices.length === 0 && (
                    <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No invoices found</h3>
                        <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filters</p>
                    </div>
                )}

                {/* Pagination (Mock) */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredInvoices.length}</span> of <span className="font-medium">{filteredInvoices.length}</span> entries
                    </span>
                    <div className="flex gap-2">
                        <button disabled className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-400 text-sm disabled:opacity-50">Previous</button>
                        <button className="px-3 py-1 border border-blue-500 rounded bg-blue-600 text-white text-sm">1</button>
                        <button disabled className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-400 text-sm disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
