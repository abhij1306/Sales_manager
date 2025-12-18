"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import KpiCard from "@/components/KpiCard";
import { FileText, Truck, Receipt, Plus, TrendingUp, Package } from "lucide-react";

interface DashboardSummary {
  total_pos: number;
  total_dcs: number;
  total_invoices: number;
  total_po_value: number;
}

interface ActivityItem {
  type: string;
  number: string;
  date: string;
  party: string;
  value: number | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("http://localhost:8000/api/dashboard/summary").then(r => r.json()),
      fetch("http://localhost:8000/api/activity?limit=10").then(r => r.json())
    ]).then(([summaryData, activityData]) => {
      setSummary(summaryData);
      setActivity(activityData);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load dashboard:", err);
      setLoading(false);
    });
  }, []);

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back. Here's your daily overview.</p>
      </div>

      {/* KPI Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div onClick={() => router.push("/po")} className="cursor-pointer">
          <KpiCard
            title="Purchase Orders"
            value={summary.total_pos}
            icon={<FileText className="w-5 h-5" />}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
        </div>
        <div onClick={() => router.push("/dc")} className="cursor-pointer">
          <KpiCard
            title="Delivery Challans"
            value={summary.total_dcs}
            icon={<Truck className="w-5 h-5" />}
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
        </div>
        <div onClick={() => router.push("/invoice")} className="cursor-pointer">
          <KpiCard
            title="Invoices"
            value={summary.total_invoices}
            icon={<Receipt className="w-5 h-5" />}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
          />
        </div>
        <div className="cursor-default">
          <KpiCard
            title="Total PO Value"
            value={`₹${(summary.total_po_value ?? 0).toLocaleString()}`}
            icon={<TrendingUp className="w-5 h-5" />}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <button
              onClick={() => router.push("/reports")}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {activity.map((item, idx) => (
              <div key={idx} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.type === "PO" ? "bg-blue-100" :
                      item.type === "DC" ? "bg-green-100" :
                        "bg-purple-100"
                      }`}>
                      {item.type === "PO" && <FileText className="w-5 h-5 text-blue-600" />}
                      {item.type === "DC" && <Truck className="w-5 h-5 text-green-600" />}
                      {item.type === "INVOICE" && <Receipt className="w-5 h-5 text-purple-600" />}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.number}</div>
                      <div className="text-sm text-gray-500">{item.party || "-"}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {item.value && (
                      <div className="font-medium text-gray-900">₹{item.value.toLocaleString()}</div>
                    )}
                    <div className="text-sm text-gray-500">{item.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/po")}
              className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left group"
            >
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-gray-900">New Purchase Order</div>
                <div className="text-sm text-gray-500">Upload PO HTML file</div>
              </div>
            </button>

            <button
              onClick={() => router.push("/dc")}
              className="w-full flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left group"
            >
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-gray-900">New Delivery Challan</div>
                <div className="text-sm text-gray-500">Generate DC for dispatch</div>
              </div>
            </button>

            <button
              onClick={() => router.push("/invoice")}
              className="w-full flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left group"
            >
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Create Invoice</div>
                <div className="text-sm text-gray-500">Create GST invoice for sales</div>
              </div>
            </button>

            <button
              onClick={() => router.push("/reports")}
              className="w-full flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors text-left group"
            >
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-gray-900">View Reports</div>
                <div className="text-sm text-gray-500">Reconciliation & summaries</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
