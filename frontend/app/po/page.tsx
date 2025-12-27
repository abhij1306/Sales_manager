"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, POListItem, POStats } from "@/lib/api";
import {
    Upload, X, CheckCircle, XCircle, Loader2, Plus,
    Search, Filter, TrendingUp, DollarSign, FileText,
    ArrowRight, LayoutList, Clock
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassInput } from "@/components/ui/glass/GlassInput";
import Pagination from "@/components/Pagination";

interface UploadResult {
    filename: string;
    success: boolean;
    po_number: number | null;
    message: string;
}

interface BatchUploadResponse {
    total: number;
    successful: number;
    failed: number;
    results: UploadResult[];
}

export default function POPage() {
    const router = useRouter();
    const [pos, setPOs] = useState<POListItem[]>([]);
    const [stats, setStats] = useState<POStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadResults, setUploadResults] = useState<BatchUploadResponse | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Statuses");

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        const fetchData = async () => {
            try {
                // In a real implementation with Auth, these calls would automatically include the Bearer token
                // via the api client wrapper or interceptor.
                const [posData, statsData] = await Promise.all([
                    api.listPOs(),
                    api.getPOStats()
                ]);
                setPOs(posData);
                setStats(statsData);
            } catch (err) {
                console.error("Failed to load PO data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setSelectedFiles(files);
        setUploadResults(null);
    };

    const removeFile = (index: number) => {
        setSelectedFiles(files => files.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;

        setUploading(true);
        setUploadResults(null);

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const response: { success: boolean, results: any[] } = await api.uploadPOBatch(selectedFiles);

            const results: BatchUploadResponse = {
                total: response.results.length,
                successful: response.results.filter((r: any) => r.success).length,
                failed: response.results.filter((r: any) => !r.success).length,
                results: response.results.map((r: any) => ({
                    filename: r.filename || 'Unknown',
                    success: r.success || false,
                    po_number: r.po_number || null,
                    message: r.message || (r.success ? 'Uploaded successfully' : 'Upload failed')
                }))
            };

            setUploadResults(results);

            if (results.successful > 0) {
                const [updatedPos, updatedStats] = await Promise.all([
                    api.listPOs(),
                    api.getPOStats()
                ]);
                setPOs(updatedPos);
                setStats(updatedStats);
            }

            setSelectedFiles([]);
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploading(false);
        }
    };

    // Filter Logic
    const filteredPOs = pos.filter(po => {
        const matchesSearch =
            po.po_number.toString().includes(searchQuery) ||
            (po.supplier_name && po.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()));

        const status = po.po_status || 'New';
        const matchesStatus = statusFilter === 'All Statuses' || status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const paginatedPOs = filteredPOs.slice(
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
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Purchase Orders</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage procurement requests and track status
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <GlassButton
                            variant="primary"
                            onClick={() => router.push('/po/create')}
                            className="flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create New PO
                        </GlassButton>
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept=".html"
                                multiple
                                onChange={handleFileSelect}
                                disabled={uploading}
                                className="hidden"
                            />
                            <div className="h-10 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl shadow-sm text-sm font-medium flex items-center gap-2 transition-all">
                                <Upload className="w-4 h-4" />
                                Upload Files
                            </div>
                        </label>
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GlassCard className="p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <LayoutList className="w-16 h-16" />
                            </div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Open Orders</p>
                            <div className="flex items-end gap-2 mt-2">
                                <h3 className="text-3xl font-bold text-gray-900">{stats.open_orders_count}</h3>
                                <span className="mb-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-6 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Clock className="w-16 h-16" />
                            </div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Approval</p>
                            <div className="flex items-end gap-2 mt-2">
                                <h3 className="text-3xl font-bold text-gray-900">{stats.pending_approval_count}</h3>
                                <span className="mb-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Action Required</span>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-6 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <DollarSign className="w-16 h-16" />
                            </div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Value (YTD)</p>
                            <div className="mt-2">
                                <h3 className="text-3xl font-bold text-gray-900">₹{stats.total_value_ytd.toLocaleString('en-IN')}</h3>
                                <div className="flex items-center mt-1 text-xs font-medium text-green-600">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    <span>{stats.total_value_change}% from last month</span>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* Upload Status Area */}
                {(selectedFiles.length > 0 || uploadResults) && (
                    <GlassCard className="p-6">
                        {selectedFiles.length > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-medium text-gray-900">Selected Files ({selectedFiles.length})</h3>
                                    <GlassButton
                                        onClick={handleUpload}
                                        loading={uploading}
                                        size="sm"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload All
                                    </GlassButton>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {selectedFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                                            <span className="text-sm text-gray-700">{file.name}</span>
                                            <button
                                                onClick={() => removeFile(idx)}
                                                disabled={uploading}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {uploadResults && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <h3 className="font-medium text-gray-900 mb-3">Upload Results</h3>
                                <div className="flex gap-4 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                        <span><strong>{uploadResults.successful}</strong> successful</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <XCircle className="w-5 h-5 text-red-500" />
                                        <span><strong>{uploadResults.failed}</strong> failed</span>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {uploadResults.results.map((result, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-3 rounded-lg border flex items-start gap-3 ${
                                                result.success
                                                    ? 'bg-green-50/50 border-green-100'
                                                    : 'bg-red-50/50 border-red-100'
                                            }`}
                                        >
                                            {result.success ? (
                                                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                            )}
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{result.filename}</div>
                                                <div className={`text-xs mt-0.5 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                                                    {result.message}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </GlassCard>
                )}

                {/* Main List */}
                <GlassCard className="p-0 overflow-hidden min-h-[500px] flex flex-col">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-100 bg-white/40 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full sm:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search POs..."
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
                                <option>Active</option>
                                <option>New</option>
                                <option>Closed</option>
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
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">PO Number</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Value</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ordered</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Dispatched</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedPOs.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                    <FileText className="w-8 h-8 text-gray-400" />
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900">No orders found</h3>
                                                <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
                                                    Try adjusting your search filters or create a new purchase order to get started.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedPOs.map((po) => (
                                        <tr key={po.po_number} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">{po.po_number}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-[200px]">{po.supplier_name}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {po.po_date || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                                                ₹{po.po_value?.toLocaleString('en-IN') || '0'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                                {po.total_ordered_quantity?.toLocaleString() || '0'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                                {po.total_dispatched_quantity?.toLocaleString() || '0'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`
                                                    inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                                                    ${po.total_pending_quantity > 0
                                                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                        : 'bg-green-50 text-green-700 border-green-100'
                                                    }
                                                `}>
                                                    {po.total_pending_quantity > 0 ? 'Pending' : 'Completed'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Link
                                                    href={`/po/${po.po_number}`}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                >
                                                    <ArrowRight className="w-4 h-4" />
                                                </Link>
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
                            totalItems={filteredPOs.length}
                            itemsPerPage={pageSize}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </GlassCard>
            </div>
        </DashboardLayout>
    );
}
