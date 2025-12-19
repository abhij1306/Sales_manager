"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, Eye, Truck, CheckCircle, Clock } from "lucide-react";
import { api, DCListItem, DCStats } from "@/lib/api";

export default function DCListPage() {
  const router = useRouter();
  const [dcs, setDCs] = useState<DCListItem[]>([]);
  const [stats, setStats] = useState<DCStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dcData, statsData] = await Promise.all([
          api.listDCs(),
          api.getDCStats()
        ]);
        setDCs(dcData);
        setStats(statsData);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load DC data:", err);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredDCs = dcs.filter(dc => {
    const matchesSearch =
      dc.dc_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dc.po_number?.toString() || "").includes(searchQuery);

    const matchesStatus = statusFilter === "All Status" || dc.status === statusFilter;

    // Simple date match (exact string match for now, can be enhanced)
    const matchesDate = !dateFilter || dc.dc_date === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'bg-green-100 text-green-700';
      case 'Pending': return 'bg-yellow-100 text-yellow-700';
      case 'Draft': return 'bg-gray-100 text-gray-700';
      default: return 'bg-blue-50 text-blue-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading Delivery Challans...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Challans</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your outbound delivery notes and status.</p>
        </div>
        <button
          onClick={() => router.push("/dc/create")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create New Challan
        </button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Challans */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Challans</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                {stats.total_challans}
              </h3>
              <div className="flex items-center mt-2 text-green-600 text-sm font-medium">
                {/* Placeholder change */}
                <span>+0%</span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          {/* Pending Delivery */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Delivery</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                {stats.pending_delivery}
              </h3>
              <div className="flex items-center mt-2 text-gray-500 text-sm font-medium">
                <span>Needs Attention</span>
              </div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>

          {/* Completed */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                {stats.completed_delivery}
              </h3>
              <div className="flex items-center mt-2 text-green-600 text-sm font-medium">
                <span>+0%</span>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search DC or PO Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[140px]"
            >
              <option>All Status</option>
              <option>Pending</option>
              <option>Delivered</option>
            </select>
            <Filter className="w-4 h-4 absolute right-3 top-3 text-gray-400 pointer-events-none" />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">DC Number</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer / Recipient</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Associated PO</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Value</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDCs.map((dc) => (
                <tr key={dc.dc_number} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer" onClick={() => router.push(`/dc/${dc.dc_number}`)}>
                      {dc.dc_number}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{dc.dc_date}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {/* Placeholder Avatar */}
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 font-bold">
                        {dc.consignee_name ? dc.consignee_name.substring(0, 2).toUpperCase() : 'CN'}
                      </div>
                      <span className="text-sm text-gray-900 font-medium">{dc.consignee_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-blue-600 hover:underline cursor-pointer" onClick={() => router.push(`/po`)}>
                      PO-{dc.po_number}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(dc.status)}`}>
                      {dc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {dc.total_value > 0 ? `₹${dc.total_value.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => router.push(`/dc/${dc.dc_number}`)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDCs.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No delivery challans found matching your filters.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>Showing 1 to {filteredDCs.length} of {dcs.length} results</span>
        <div className="flex gap-2">
          <button disabled className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Previous</button>
          <button disabled className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
