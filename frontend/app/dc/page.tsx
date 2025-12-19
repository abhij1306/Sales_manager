"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, Eye, Truck, CheckCircle, Clock, Calendar as CalendarIcon, FileText } from "lucide-react";
import { api, DCListItem, DCStats } from "@/lib/api";
import Pagination from "@/components/Pagination";

export default function DCListPage() {
  const router = useRouter();
  const [dcs, setDCs] = useState<DCListItem[]>([]);
  const [stats, setStats] = useState<DCStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [dateFilter, setDateFilter] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
      (dc.po_number?.toString() || "").includes(searchQuery) ||
      (dc.consignee_name && dc.consignee_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "All Status" || dc.status === statusFilter;

    // Simple date match (exact string match for now, can be enhanced)
    const matchesDate = !dateFilter || dc.dc_date === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination Logic
  const paginatedDCs = filteredDCs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'bg-success/10 text-success border border-success/20';
      case 'Pending': return 'bg-warning/10 text-warning border border-warning/20';
      case 'Draft': return 'bg-text-secondary/10 text-text-secondary border border-text-secondary/20';
      default: return 'bg-blue-50 text-blue-800 border-indigo-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary font-medium">Loading Delivery Challans...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-text-primary tracking-tight">Delivery Challans</h1>
          <p className="text-[13px] text-text-secondary mt-1">Manage your outbound delivery notes and status.</p>
        </div>
        <button
          onClick={() => router.push("/dc/create")}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create New Challan
        </button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Challans */}
          <div className="glass-card p-6 flex items-start justify-between">
            <div>
              <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Total Challans</p>
              <h3 className="text-[24px] font-bold text-text-primary mt-2">
                {stats.total_challans}
              </h3>
              <div className="flex items-center mt-2 text-success text-[12px] font-medium">
                {/* Placeholder change */}
                <span>+5% from last month</span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-primary">
              <Truck className="w-6 h-6" />
            </div>
          </div>

          {/* Pending Delivery */}
          <div className="glass-card p-6 flex items-start justify-between">
            <div>
              <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Pending Delivery</p>
              <h3 className="text-[24px] font-bold text-text-primary mt-2">
                {stats.pending_delivery}
              </h3>
              <div className="flex items-center mt-2 text-warning text-[12px] font-medium">
                <span>Needs Attention</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Completed */}
          <div className="glass-card p-6 flex items-start justify-between">
            <div>
              <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Completed</p>
              <h3 className="text-[24px] font-bold text-text-primary mt-2">
                {stats.completed_delivery}
              </h3>
              <div className="flex items-center mt-2 text-success text-[12px] font-medium">
                <span>98% delivery rate</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Card */}
      <div className="glass-card overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-border bg-gray-50/30 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search DC, PO, or Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-4 w-full sm:w-auto items-center">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-white border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[140px]"
              >
                <option>All Status</option>
                <option>Pending</option>
                <option>Delivered</option>
              </select>
              <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-[38px]"
              />
            </div>

          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-text-secondary border-b border-border text-[11px] uppercase tracking-wider font-semibold">
                <th className="px-6 py-4">DC Number</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer / Recipient</th>
                <th className="px-6 py-4">Associated PO</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Total Value</th>
                <th className="px-6 py-4 text-center w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-white/50">
              {filteredDCs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-12 h-12 text-border mb-3" />
                      <h3 className="text-lg font-medium text-text-primary">No delivery challans found</h3>
                      <p className="text-text-secondary text-sm mt-1 max-w-sm">
                        Try adjusting your search or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedDCs.map((dc) => (
                  <tr key={dc.dc_number} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-3">
                      <span className="text-[13px] font-semibold text-primary hover:text-blue-700 cursor-pointer" onClick={() => router.push(`/dc/${dc.dc_number}`)}>
                        {dc.dc_number}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[13px] text-text-secondary font-medium">{dc.dc_date}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-indigo-50 flex items-center justify-center text-[10px] text-indigo-700 font-bold uppercase border border-indigo-100">
                          {dc.consignee_name ? dc.consignee_name.substring(0, 2) : 'CN'}
                        </div>
                        <span className="text-[13px] text-text-primary font-medium">{dc.consignee_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <LinkWrapper href={`/po/${dc.po_number}`} className="px-2 py-1 bg-gray-50 text-text-secondary text-[11px] rounded border border-border font-medium hover:bg-gray-100 transition-colors inline-block">
                        PO-{dc.po_number}
                      </LinkWrapper>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${getStatusColor(dc.status)}`}>
                        {dc.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-[13px] font-semibold text-text-primary">
                      {dc.total_value > 0 ? `₹${dc.total_value.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => router.push(`/dc/${dc.dc_number}`)}
                        className="text-text-secondary hover:text-primary transition-colors p-1 rounded hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Integrated */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredDCs.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}

// Simple internal helper to avoid Next.js link wrapping issues if needed, or just use button/span for now since filtering by PO usually goes to PO list
function LinkWrapper({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const router = useRouter();
  return (
    <span onClick={() => router.push(href)} className={`cursor-pointer ${className}`}>
      {children}
    </span>
  )
}
