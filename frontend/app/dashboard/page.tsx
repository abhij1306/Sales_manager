"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, DashboardSummary, ActivityItem } from "@/lib/api";
import {
    TrendingUp, ShoppingBag, Truck, Receipt,
    ArrowRight, Activity, Clock, AlertCircle
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import Link from "next/link";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Mock data for chart if API doesn't provide history yet
const chartData = [
  { name: 'Jan', sales: 4000 },
  { name: 'Feb', sales: 3000 },
  { name: 'Mar', sales: 2000 },
  { name: 'Apr', sales: 2780 },
  { name: 'May', sales: 1890 },
  { name: 'Jun', sales: 2390 },
  { name: 'Jul', sales: 3490 },
];

export default function DashboardPage() {
    const router = useRouter();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/auth/login');
            return;
        }

        const fetchData = async () => {
            try {
                // 1. Get Summary Stats
                const summaryData = await api.getDashboardSummary();
                setSummary(summaryData);

                // 2. Fetch Recent Activity
                const activityData = await api.getRecentActivity();
                setActivities(activityData);

            } catch (err: any) {
                console.error("Failed to load dashboard:", err);
                // Handle various 401 messages
                if (err.message?.includes('401') ||
                    err.message?.includes('Unauthorized') ||
                    err.message?.includes('Not authenticated')) {
                    router.push('/auth/login');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [router]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Welcome Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Executive Overview</h1>
                        <p className="text-gray-500 mt-2 text-lg">
                            Real-time insights into procurement and sales performance.
                        </p>
                    </div>
                    <div className="flex gap-3">
                         <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                            System Operational
                        </span>
                    </div>
                </div>

                {/* KPI Grid */}
                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Sales */}
                        <GlassCard className="p-6 relative overflow-hidden group hover:border-blue-300 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <ShoppingBag className="w-24 h-24 text-blue-600" />
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <ShoppingBag className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Sales</span>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900">₹{(summary.total_sales_month || 0).toLocaleString()}</h3>
                            <div className="flex items-center mt-2 text-sm text-green-600 font-medium">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                {summary.sales_growth}% vs last month
                            </div>
                        </GlassCard>

                        {/* Pending POs */}
                        <GlassCard className="p-6 relative overflow-hidden group hover:border-amber-300 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Clock className="w-24 h-24 text-amber-600" />
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pending Orders</span>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900">{summary.pending_pos}</h3>
                            <div className="flex items-center mt-2 text-sm text-amber-600 font-medium">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                Needs attention
                            </div>
                        </GlassCard>

                        {/* Active Challans */}
                        <GlassCard className="p-6 relative overflow-hidden group hover:border-purple-300 transition-colors">
                             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Truck className="w-24 h-24 text-purple-600" />
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Deliveries</span>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900">{summary.active_challans}</h3>
                            <div className="flex items-center mt-2 text-sm text-gray-500 font-medium">
                                {summary.active_challans_growth} flow rate
                            </div>
                        </GlassCard>

                        {/* Total PO Value */}
                        <GlassCard className="p-6 relative overflow-hidden group hover:border-emerald-300 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Receipt className="w-24 h-24 text-emerald-600" />
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total PO Value</span>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900">₹{(summary.total_po_value || 0).toLocaleString()}</h3>
                            <div className="flex items-center mt-2 text-sm text-green-600 font-medium">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                +{summary.po_value_growth}% growth
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* Charts & Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Chart */}
                    <GlassCard className="lg:col-span-2 p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-lg text-gray-900">Revenue Trends</h3>
                            <select className="text-sm border-none bg-gray-50 rounded-lg px-2 py-1 text-gray-500 focus:ring-0 cursor-pointer">
                                <option>Last 6 Months</option>
                                <option>Year to Date</option>
                            </select>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{fill: '#6B7280', fontSize: 12}}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{fill: '#6B7280', fontSize: 12}}
                                        tickFormatter={(value) => `₹${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="sales"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorSales)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>

                    {/* Recent Activity */}
                    <GlassCard className="p-0 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 bg-white/50">
                            <h3 className="font-bold text-lg text-gray-900">Recent Activity</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[350px]">
                            {activities.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    No recent activity
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {activities.map((item, i) => (
                                        <div key={i} className="p-4 hover:bg-gray-50/50 transition-colors flex items-start gap-3">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-full mt-1">
                                                <Activity className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {item.description}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-gray-500">{item.type} #{item.number}</span>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                    <span className="text-xs text-gray-400">{item.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50/30">
                            <GlassButton variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                View All Activity <ArrowRight className="w-4 h-4 ml-2" />
                            </GlassButton>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </DashboardLayout>
    );
}
