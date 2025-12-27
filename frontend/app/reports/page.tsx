"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { api } from "@/lib/api";
import {
    Download, BarChart2, PieChart, FileText, Calendar
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [timeRange, setTimeRange] = useState("this_month");

    // Mock Data for Charts
    const salesData = [
        { name: 'Week 1', sales: 4000, target: 2400 },
        { name: 'Week 2', sales: 3000, target: 1398 },
        { name: 'Week 3', sales: 2000, target: 9800 },
        { name: 'Week 4', sales: 2780, target: 3908 },
    ];

    const handleExport = (type: string) => {
        // Mock Export Functionality
        const csvContent = "data:text/csv;charset=utf-8,Date,Type,Amount\n2023-12-01,PO,50000\n2023-12-05,Invoice,25000";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `report_${type}_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
                        <p className="text-sm text-gray-500">Analyze performance and export data</p>
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                        >
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                            <option value="this_quarter">This Quarter</option>
                            <option value="ytd">Year to Date</option>
                        </select>
                        <GlassButton onClick={() => handleExport("summary")} className="flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Export CSV
                        </GlassButton>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sales Performance Chart */}
                    <GlassCard className="p-6 h-[400px] flex flex-col">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-blue-500" />
                            Sales Performance
                        </h3>
                        <div className="flex-1 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={salesData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                    />
                                    <Legend />
                                    <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="target" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>

                    {/* Report Cards */}
                    <div className="space-y-6">
                        <GlassCard className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-900">GST Reconciliation</h3>
                                    <p className="text-sm text-gray-500 mt-1">Match GSTR-2A with Purchase Register</p>
                                </div>
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                    <FileText className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <GlassButton size="sm" variant="secondary" onClick={() => handleExport("gstr2a")}>
                                    Download JSON
                                </GlassButton>
                                <GlassButton size="sm" onClick={() => handleExport("gstr2a")}>
                                    Download Excel
                                </GlassButton>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-900">Stock Valuation</h3>
                                    <p className="text-sm text-gray-500 mt-1">Current inventory value by FIFO</p>
                                </div>
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <PieChart className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <GlassButton size="sm" onClick={() => handleExport("stock")}>
                                    Generate Report
                                </GlassButton>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
