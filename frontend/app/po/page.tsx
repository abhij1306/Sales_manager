"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, POListItem, POStats } from "@/lib/api";
import { Upload, X, CheckCircle, XCircle, Loader2, Plus, Search, Filter, Download, ListFilter, TrendingUp, AlertCircle, FileText, ClipboardList, Clock, DollarSign } from "lucide-react";

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

    useEffect(() => {
        const fetchData = async () => {
            try {
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
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/po/upload/batch`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const results: BatchUploadResponse = await response.json();
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
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Failed to upload files");
        } finally {
            setUploading(false);
        }
    };

    // Helper to determine status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-green-100 text-green-700';
            case 'Closed': return 'bg-gray-100 text-gray-700';
            case 'New': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    // Filter logic
    const filteredPOs = pos.filter(po => {
        const matchesSearch =
            po.po_number.toString().includes(searchQuery) ||
            (po.supplier_name && po.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()));

        // Mock status filtering matching the previous logic or potential new statuses
        const status = po.po_status || 'New';
        const matchesStatus = statusFilter === 'All Statuses' || status === statusFilter;

        return matchesSearch && matchesStatus;
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage procurement requests, track status, and view history.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push('/po/create')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Create New PO
                    </button>
                    <label className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Upload PO Files
                        <input
                            type="file"
                            accept=".html"
                            multiple
                            onChange={handleFileSelect}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            {/* KPI Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Open Orders */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Open Orders</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                {stats.open_orders_count}
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <ClipboardList className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>

                    {/* Pending Approval */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Pending Approval</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                {stats.pending_approval_count}
                            </h3>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg">
                            <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>

                    {/* Total Value (YTD) */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Value (YTD)</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                ₹{stats.total_value_ytd.toLocaleString('en-IN')}
                            </h3>
                            <div className="flex items-center mt-2 text-green-600 text-sm font-medium">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                <span>{stats.total_value_change}% from last month</span>
                            </div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Area (Conditional) */}
            {(selectedFiles.length > 0 || uploadResults) && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                    {/* Selected Files List */}
                    {selectedFiles.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium text-gray-900">
                                    Selected Files ({selectedFiles.length})
                                </h3>
                                <button
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" />
                                            Upload All
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="space-y-2">
                                {selectedFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                                        <span className="text-sm text-gray-700">{file.name}</span>
                                        <button
                                            onClick={() => removeFile(idx)}
                                            disabled={uploading}
                                            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upload Results */}
                    {uploadResults && (
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Upload Results</h3>
                            <div className="flex gap-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <span className="text-sm text-gray-700">
                                        <strong>{uploadResults.successful}</strong> successful
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <XCircle className="w-5 h-5 text-red-600" />
                                    <span className="text-sm text-gray-700">
                                        <strong>{uploadResults.failed}</strong> failed
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {uploadResults.results.map((result, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded border ${result.success
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-red-50 border-red-200'
                                            }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {result.success ? (
                                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                                            )}
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {result.filename}
                                                </div>
                                                <div className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                                                    {result.message}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Filters & Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by PO Number..."
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
                            <option>Active</option>
                            <option>New</option>
                            <option>Closed</option>
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
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">PO Number</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Created</th>

                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    PO Value
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ordered
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Dispatched
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Pending
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Linked Challans
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredPOs.map((po) => {
                                return (
                                    <tr key={po.po_number} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/po/${po.po_number}`}
                                                className="text-blue-600 font-medium hover:text-blue-800 hover:underline"
                                            >
                                                PO-{po.po_number}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {po.po_date || 'N/A'}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ₹{po.po_value?.toLocaleString('en-IN') || '0'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-medium">
                                            {po.total_ordered_qty?.toLocaleString() || '0'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-center font-medium">
                                            {po.total_dispatched_qty?.toLocaleString() || '0'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${po.total_pending_qty > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                                }`}>
                                                {po.total_pending_qty?.toLocaleString() || '0'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {po.linked_dc_numbers ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {(() => {
                                                        const dcs = po.linked_dc_numbers.split(',').map(d => d.trim()).filter(Boolean);

                                                        // If 2 or fewer, show them all
                                                        if (dcs.length <= 2) {
                                                            return dcs.map((dc, i) => (
                                                                <Link
                                                                    key={i}
                                                                    href={`/dc/${dc}`}
                                                                    className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-100 font-medium hover:bg-purple-100 hover:text-purple-900 transition-colors"
                                                                >
                                                                    {dc}
                                                                </Link>
                                                            ));
                                                        }

                                                        // If more than 2, show summary with hover dropdown
                                                        return (
                                                            <div className="relative group">
                                                                <button className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded border border-purple-200 font-bold hover:bg-purple-200 transition-colors">
                                                                    {dcs.length} Challans
                                                                </button>
                                                                {/* Hover Dropdown */}
                                                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 bg-white border border-gray-200 shadow-lg rounded-lg p-2 z-10">
                                                                    <div className="text-xs text-gray-400 mb-2 px-1">Linked Challans</div>
                                                                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                                                                        {dcs.map((dc, i) => (
                                                                            <Link
                                                                                key={i}
                                                                                href={`/dc/${dc}`}
                                                                                className="block px-2 py-1 text-xs text-purple-700 hover:bg-purple-50 rounded"
                                                                            >
                                                                                {dc}
                                                                            </Link>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">No DCs linked</span>
                                            )}
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

                {filteredPOs.length === 0 && (
                    <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No purchase orders found</h3>
                        <p className="text-gray-500 text-sm mt-1">Try uploading POs or adjusting your search</p>
                    </div>
                )}

                {/* Pagination (Mock) */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredPOs.length}</span> of <span className="font-medium">{filteredPOs.length}</span> entries
                    </span>
                    <div className="flex gap-2">
                        <button disabled className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-400 text-sm disabled:opacity-50">Previous</button>
                        <button className="px-3 py-1 border border-blue-500 rounded bg-blue-600 text-white text-sm">1</button>
                        <button disabled className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-400 text-sm disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>
        </div >
    );
}
