"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, POListItem } from "@/lib/api";
import { Upload, X, CheckCircle, XCircle, Loader2, Plus } from "lucide-react";

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
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadResults, setUploadResults] = useState<BatchUploadResponse | null>(null);

    useEffect(() => {
        loadPOs();
    }, []);

    const loadPOs = async () => {
        try {
            const data = await api.listPOs();
            setPOs(data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to load POs:", err);
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setSelectedFiles(files);
        setUploadResults(null); // Clear previous results
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

            // Reload PO list if any were successful
            if (results.successful > 0) {
                await loadPOs();
            }

            // Clear selected files
            setSelectedFiles([]);
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Failed to upload files");
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Purchase Orders</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and track all purchase orders</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push('/po/create')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create PO
                    </button>
                    <label className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Select PO Files
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

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
                <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
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
                <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
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

            {/* PO List Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                PO Number
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Value
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amendment
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {pos.map((po) => (
                            <tr key={po.po_number} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Link
                                        href={`/po/${po.po_number}`}
                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        {po.po_number}
                                    </Link>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {po.po_date || "-"}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${po.po_status === 'Active' ? 'bg-green-100 text-green-800' :
                                        po.po_status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                        {po.po_status || 'New'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {po.po_value ? `₹${po.po_value.toLocaleString()}` : "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {po.amend_no || 0}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {pos.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No purchase orders found. Upload PO HTML files to get started.
                    </div>
                )}
            </div>
        </div>
    );
}
