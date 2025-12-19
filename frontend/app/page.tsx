"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, DashboardSummary, ActivityItem } from "@/lib/api";
import { FileText, Truck, Receipt, TrendingUp, Plus, MoveUpRight, Clock, ChevronRight } from "lucide-react";

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
      case 'paid': return 'bg-success/10 text-success border border-success/20';
      case 'pending': return 'bg-warning/10 text-warning border border-warning/20';
      case 'dispatched': return 'bg-primary/10 text-primary border border-primary/20';
      case 'active': return 'bg-success/10 text-success border border-success/20';
      case 'new': return 'bg-primary/10 text-primary border border-primary/20';
      default: return 'bg-gray-100 text-text-secondary border border-gray-200';
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
        <div className="text-text-secondary animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
          <p className="text-sm text-danger font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-[20px] font-semibold text-text-primary">Dashboard</h1>
          <p className="text-[13px] text-text-secondary mt-1">Welcome back, Admin. Here is your daily overview.</p>
        </div>
        <div className="px-4 py-2 glass-card text-sm text-text-secondary font-medium">
          Today: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="glass-card p-5 flex flex-col justify-between h-[140px]">
          <div className="flex justify-between items-start">
            <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Total Sales (Month)</p>
            <div className="p-2 bg-blue-50 rounded-lg text-primary">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-[24px] font-bold text-text-primary">
              ₹{summary.total_sales_month.toLocaleString('en-IN')}
            </h3>
            <div className="flex items-center mt-1 text-success text-[12px] font-medium">
              <MoveUpRight className="w-3 h-3 mr-1" />
              <span>+{summary.sales_growth}% vs last month</span>
            </div>
          </div>
        </div>

        {/* Pending POs */}
        <div className="glass-card p-5 flex flex-col justify-between h-[140px]">
          <div className="flex justify-between items-start">
            <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Pending POs</p>
            <div className="p-2 bg-orange-50 rounded-lg text-warning">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-[24px] font-bold text-text-primary">
              {summary.pending_pos} <span className="text-sm font-normal text-text-secondary">Orders</span>
            </h3>
            <div className="flex items-center mt-1 text-warning text-[12px] font-medium">
              <Plus className="w-3 h-3 mr-1" />
              <span>{summary.new_pos_today} new today</span>
            </div>
          </div>
        </div>

        {/* Active Challans */}
        <div className="glass-card p-5 flex flex-col justify-between h-[140px]">
          <div className="flex justify-between items-start">
            <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Active Challans</p>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-[24px] font-bold text-text-primary">
              {summary.active_challans} <span className="text-sm font-normal text-text-secondary">Active</span>
            </h3>
            <div className="flex items-center mt-1 text-text-secondary text-[12px] font-medium">
              <span>{summary.active_challans_growth} from last week</span>
            </div>
          </div>
        </div>

        {/* Total PO Value */}
        <div className="glass-card p-5 flex flex-col justify-between h-[140px]">
          <div className="flex justify-between items-start">
            <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Total PO Value</p>
            <div className="p-2 bg-green-50 rounded-lg text-success">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-[24px] font-bold text-text-primary">
              ₹{summary.total_po_value.toLocaleString('en-IN')}
            </h3>
            <div className="flex items-center mt-1 text-success text-[12px] font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>+{summary.po_value_growth}% growth</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-text-primary">Recent Transactions</h2>
            <button
              onClick={() => router.push("/reports")}
              className="text-[13px] text-primary hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead className="bg-gray-50/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-text-secondary uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-text-secondary uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-text-secondary uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-text-secondary uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {activity.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-[13px] text-text-secondary font-medium">{item.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[11px] font-bold ${getTypeStyle(item.type)}`}>
                        {item.type}-{item.number}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-text-secondary text-right font-medium">
                      {item.amount ? `₹${item.amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(item.status)}`}>
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
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-[16px] font-semibold text-text-primary mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/po/create")}
                className="w-full flex items-center gap-4 p-4 border border-border bg-white hover:bg-gray-50 rounded-xl transition-all shadow-sm hover:shadow-md group text-left"
              >
                <div className="w-10 h-10 bg-blue-50 text-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-text-primary text-[14px]">New Purchase Order</div>
                  <div className="text-[12px] text-text-secondary">Draft a new PO for suppliers</div>
                </div>
              </button>

              <button
                onClick={() => router.push("/dc/create")}
                className="w-full flex items-center gap-4 p-4 border border-border bg-white hover:bg-gray-50 rounded-xl transition-all shadow-sm hover:shadow-md group text-left"
              >
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-text-primary text-[14px]">New Delivery Challan</div>
                  <div className="text-[12px] text-text-secondary">Generate DC for dispatch</div>
                </div>
              </button>

              <button
                onClick={() => router.push("/invoice/create")}
                className="w-full flex items-center gap-4 p-4 border border-border bg-white hover:bg-gray-50 rounded-xl transition-all shadow-sm hover:shadow-md group text-left"
              >
                <div className="w-10 h-10 bg-green-50 text-success rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-text-primary text-[14px]">Create Invoice</div>
                  <div className="text-[12px] text-text-secondary">Create GST invoice for sales</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
