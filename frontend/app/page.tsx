"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, DashboardSummary, ActivityItem } from "@/lib/api";
import { FileText, Truck, Receipt, TrendingUp, Plus, MoveUpRight, Clock } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [summaryData, activityData] = await Promise.all([
          api.getDashboardSummary(),
          api.getRecentActivity(10)
        ]);

        setSummary(summaryData);
        setActivity(activityData);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'dispatched': return 'bg-blue-100 text-blue-700';
      case 'active': return 'bg-green-100 text-green-700';
      case 'new': return 'bg-blue-50 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'PO': return 'bg-blue-50 text-blue-700';
      case 'Invoice': return 'bg-green-50 text-green-700';
      case 'DC': return 'bg-purple-50 text-purple-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, Admin. Here is your daily overview.</p>
        </div>
        <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 shadow-sm">
          Today: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Sales */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Sales (Month)</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">
              ₹{summary.total_sales_month.toLocaleString('en-IN')}
            </h3>
            <div className="flex items-center mt-2 text-green-600 text-sm font-medium">
              <MoveUpRight className="w-3 h-3 mr-1" />
              <span>+{summary.sales_growth}% vs last month</span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        {/* Pending POs */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Pending POs</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">
              {summary.pending_pos} Orders
            </h3>
            <div className="flex items-center mt-2 text-orange-600 text-sm font-medium">
              <Plus className="w-3 h-3 mr-1" />
              <span>{summary.new_pos_today} new today</span>
            </div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
        </div>

        {/* Active Challans */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Active Challans</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">
              {summary.active_challans} Active
            </h3>
            <div className="flex items-center mt-2 text-gray-500 text-sm font-medium">
              <span>{summary.active_challans_growth}</span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <Truck className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        {/* Total PO Value */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total PO Value</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">
              ₹{summary.total_po_value.toLocaleString('en-IN')}
            </h3>
            <div className="flex items-center mt-2 text-green-600 text-sm font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>+{summary.po_value_growth}% growth</span>
            </div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <Receipt className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
            <button
              onClick={() => router.push("/reports")}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Party Name</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activity.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">{item.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getTypeStyle(item.type)}`}>
                        {item.type}-{item.number}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.party}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-right font-medium">
                      {item.amount ? `₹${item.amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-4">
              <button
                onClick={() => router.push("/po/create")}
                className="w-full flex items-center gap-4 p-4 border border-gray-100 bg-white hover:bg-gray-50 rounded-xl transition-all shadow-sm hover:shadow-md group"
              >
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-900">New Purchase Order</div>
                  <div className="text-xs text-gray-500">Draft a new PO for suppliers</div>
                </div>
              </button>

              <button
                onClick={() => router.push("/dc/create")}
                className="w-full flex items-center gap-4 p-4 border border-gray-100 bg-white hover:bg-gray-50 rounded-xl transition-all shadow-sm hover:shadow-md group"
              >
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-900">New Delivery Challan</div>
                  <div className="text-xs text-gray-500">Generate DC for dispatch</div>
                </div>
              </button>

              <button
                onClick={() => router.push("/invoice/create")}
                className="w-full flex items-center gap-4 p-4 border border-gray-100 bg-white hover:bg-gray-50 rounded-xl transition-all shadow-sm hover:shadow-md group"
              >
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-900">Create Invoice</div>
                  <div className="text-xs text-gray-500">Create GST invoice for sales</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
