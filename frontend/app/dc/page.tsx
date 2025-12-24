"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, DCListItem, DCStats } from "@/lib/api";
import {
    Truck, Plus, Search, Filter, Calendar, FileCheck, ArrowRight,
    Loader2, Receipt, AlertCircle
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import Pagination from "@/components/Pagination";

export default function DCPage() {
    const router = useRouter();
    const [dcs, setDCs] = useState<DCListItem[]>([]);
    const [stats, setStats] = useState<DCStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Statuses");

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dcsData, statsData] = await Promise.all([
                    api.listDCs(),
                    api.getDCStats()
                ]);
                setDCs(dcsData);
                setStats(statsData);
            } catch (err) {
                console.error("Failed to load DC data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredDCs = dcs.filter(dc => {
        const matchesSearch =
            dc.dc_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (dc.consignee_name && dc.consignee_name.toLowerCase().includes(searchQuery.toLowerCase()));

        // Mock status logic if API doesn't return status yet
        const status = dc.status || 'Pending';
        const matchesStatus = statusFilter === 'All Statuses' || status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const paginatedDCs = filteredDCs.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Delivery Challans</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Track shipments and generate invoices
                        </p>
                    </div>
                    <GlassButton
                        variant="primary"
                        onClick={() => router.push('/dc/create')}
                        className="flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create New DC
                    </GlassButton>
                </div>

                {/* KPI Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GlassCard className="p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Truck className="w-16 h-16" />
                            </div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Challans</p>
                            <div className="flex items-end gap-2 mt-2">
                                <h3 className="text-3xl font-bold text-gray-900">{stats.total_challans}</h3>
                                <span className="mb-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                    Lifetime
                                </span>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <AlertCircle className="w-16 h-16" />
                            </div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Delivery</p>
                            <div className="flex items-end gap-2 mt-2">
                                <h3 className="text-3xl font-bold text-gray-900">{stats.pending_delivery}</h3>
                                <span className="mb-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">In Transit</span>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-6 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10">
                                <FileCheck className="w-16 h-16" />
                            </div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed</p>
                            <div className="mt-2">
                                <h3 className="text-3xl font-bold text-gray-900">{stats.completed_delivery}</h3>
                                <div className="flex items-center mt-1 text-xs font-medium text-green-600">
                                    <span>Successfully Delivered</span>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* Main List */}
                <GlassCard className="p-0 overflow-hidden min-h-[500px] flex flex-col">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-100 bg-white/40 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full sm:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by DC number or consignee..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/60 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                        <div className="relative w-full sm:w-auto">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full sm:w-48 pl-10 pr-8 py-2 bg-white/60 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                            >
                                <option>All Statuses</option>
                                <option>Pending</option>
                                <option>Delivered</option>
                                <option>Invoiced</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/30">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">DC Number</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Linked PO</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Consignee</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Value</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedDCs.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <Truck className="w-12 h-12 text-gray-200 mb-3" />
                                                <h3 className="text-lg font-medium text-gray-900">No delivery challans found</h3>
                                                <p className="text-gray-500 text-sm mt-1">
                                                    Create a delivery challan from a PO to get started.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedDCs.map((dc) => (
                                        <tr key={dc.dc_number} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <Link
                                                    href={`/dc/${dc.dc_number}`}
                                                    className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    {dc.dc_number}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {dc.dc_date}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Link
                                                    href={`/po/${dc.po_number}`}
                                                    className="text-sm font-medium text-gray-700 hover:text-blue-600"
                                                >
                                                    PO-{dc.po_number}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">
                                                {dc.consignee_name || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                                                ₹{dc.total_value?.toLocaleString('en-IN') || '0'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`
                                                    inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                                                    ${dc.status === 'Invoiced'
                                                        ? 'bg-green-50 text-green-700 border-green-100'
                                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                                    }
                                                `}>
                                                    {dc.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {dc.status !== 'Invoiced' && (
                                                        <Link
                                                            href={`/invoice/create?dc=${dc.dc_number}`}
                                                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Create Invoice"
                                                        >
                                                            <Receipt className="w-4 h-4" />
                                                        </Link>
                                                    )}
                                                    <Link
                                                        href={`/dc/${dc.dc_number}`}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    >
                                                        <ArrowRight className="w-4 h-4" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-gray-100">
                        <Pagination
                            currentPage={currentPage}
                            totalItems={filteredDCs.length}
                            itemsPerPage={pageSize}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </GlassCard>
            </div>
        </DashboardLayout>
    );
}
