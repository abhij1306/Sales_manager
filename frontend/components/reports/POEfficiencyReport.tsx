/**
 * PO Fulfillment Efficiency Report Component
 * Displays fulfillment % per PO with best/worst performers
 */

interface POEfficiencyData {
    period: string;
    pos: Array<{
        po_number: string;
        supplier_name: string;
        ordered: number;
        dispatched: number;
        fulfillment_pct: number;
    }>;
    insights: {
        best_po: {
            po_number: string | null;
            fulfillment_pct: number;
        };
        worst_po: {
            po_number: string | null;
            fulfillment_pct: number;
        };
        zero_fulfillment_count: number;
        zero_fulfillment_pos: string[];
    };
}

interface POEfficiencyReportProps {
    data: POEfficiencyData;
    aiSummary?: string;
}

export default function POEfficiencyReport({ data, aiSummary }: POEfficiencyReportProps) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-[18px] font-semibold text-text-primary">PO Fulfillment Efficiency</h2>
                <p className="text-[12px] text-text-secondary mt-1">Period: {data.period}</p>
            </div>

            {/* Key Insights */}
            <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-4">
                    <p className="text-[11px] text-text-secondary uppercase mb-2">Best Performer</p>
                    <p className="text-[20px] font-bold text-success">
                        {data.insights.best_po.po_number || 'N/A'}
                    </p>
                    <p className="text-[12px] text-text-secondary mt-1">
                        {data.insights.best_po.fulfillment_pct}% fulfilled
                    </p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[11px] text-text-secondary uppercase mb-2">Worst Performer</p>
                    <p className="text-[20px] font-bold text-danger">
                        {data.insights.worst_po.po_number || 'N/A'}
                    </p>
                    <p className="text-[12px] text-text-secondary mt-1">
                        {data.insights.worst_po.fulfillment_pct}% fulfilled
                    </p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[11px] text-text-secondary uppercase mb-2">Zero Fulfillment</p>
                    <p className="text-[20px] font-bold text-warning">
                        {data.insights.zero_fulfillment_count}
                    </p>
                    <p className="text-[12px] text-text-secondary mt-1">POs with 0% dispatch</p>
                </div>
            </div>

            {/* AI Summary */}
            {aiSummary && (
                <div className="glass-card p-4 bg-primary/5 border border-primary/20">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary text-lg">✨</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-[12px] font-semibold text-text-primary mb-1">AI Insight</p>
                            <p className="text-[13px] text-text-secondary leading-relaxed">{aiSummary}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* PO Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-border">
                            <tr>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase">PO Number</th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase">Supplier</th>
                                <th className="px-4 py-3 text-right text-[11px] font-semibold text-text-secondary uppercase">Ordered</th>
                                <th className="px-4 py-3 text-right text-[11px] font-semibold text-text-secondary uppercase">Dispatched</th>
                                <th className="px-4 py-3 text-right text-[11px] font-semibold text-text-secondary uppercase">Fulfillment %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {data.pos.slice(0, 20).map((po) => (
                                <tr key={po.po_number} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-[13px] font-medium text-text-primary">{po.po_number}</td>
                                    <td className="px-4 py-3 text-[12px] text-text-secondary truncate max-w-[200px]">{po.supplier_name}</td>
                                    <td className="px-4 py-3 text-[13px] text-text-primary text-right">{po.ordered.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-[13px] text-text-primary text-right">{po.dispatched.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-[12px] font-medium ${po.fulfillment_pct === 0 ? 'bg-danger/10 text-danger' :
                                            po.fulfillment_pct < 50 ? 'bg-warning/10 text-warning' :
                                                'bg-success/10 text-success'
                                            }`}>
                                            {po.fulfillment_pct}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {data.pos.length > 20 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-border text-center">
                        <p className="text-[12px] text-text-secondary">Showing 20 of {data.pos.length} POs</p>
                    </div>
                )}
            </div>

            {/* Actions: None enabled (Phase 2) */}
        </div>
    );
}
