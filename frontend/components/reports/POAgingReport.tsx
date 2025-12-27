/**
 * PO Aging & Risk Report Component
 * Displays age buckets with pending quantity distribution
 */

interface POAgingData {
    period: string;
    age_buckets: {
        "0_7_days": {
            po_count: number;
            pending_qty: number;
            percentage: number;
            pos: string[];
        };
        "8_30_days": {
            po_count: number;
            pending_qty: number;
            percentage: number;
            pos: string[];
        };
        "30_plus_days": {
            po_count: number;
            pending_qty: number;
            percentage: number;
            pos: string[];
        };
    };
    total_pending_qty: number;
}

interface POAgingReportProps {
    data: POAgingData;
    aiSummary?: string;
}

export default function POAgingReport({ data, aiSummary }: POAgingReportProps) {
    const buckets = [
        { key: "0_7_days", label: "0-7 Days", color: "bg-success", data: data.age_buckets["0_7_days"] },
        { key: "8_30_days", label: "8-30 Days", color: "bg-warning", data: data.age_buckets["8_30_days"] },
        { key: "30_plus_days", label: "30+ Days", color: "bg-danger", data: data.age_buckets["30_plus_days"] },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-[18px] font-semibold text-text-primary">PO Aging & Risk Analysis</h2>
                <p className="text-[12px] text-text-secondary mt-1">
                    Total Pending: {data.total_pending_qty.toLocaleString()} units
                </p>
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

            {/* Age Buckets */}
            <div className="grid grid-cols-3 gap-4">
                {buckets.map((bucket) => (
                    <div key={bucket.key} className="glass-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[12px] font-semibold text-text-secondary uppercase">{bucket.label}</p>
                            <div className={`w-3 h-3 rounded-full ${bucket.color}`} />
                        </div>
                        <p className="text-[24px] font-bold text-text-primary mb-1">
                            {bucket.data.pending_qty.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-text-secondary">
                            {bucket.data.po_count} POs • {bucket.data.percentage}% of total
                        </p>
                    </div>
                ))}
            </div>

            {/* Detailed Breakdown */}
            <div className="glass-card p-5">
                <h3 className="text-[14px] font-semibold text-text-primary mb-4">POs by Age Bucket</h3>
                <div className="space-y-4">
                    {buckets.map((bucket) => (
                        <div key={bucket.key}>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[13px] font-medium text-text-primary">{bucket.label}</p>
                                <p className="text-[12px] text-text-secondary">{bucket.data.po_count} POs</p>
                            </div>
                            {bucket.data.pos.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {bucket.data.pos.slice(0, 10).map((po) => (
                                        <span
                                            key={po}
                                            className="px-2 py-1 bg-gray-100 text-text-primary text-[11px] font-medium rounded"
                                        >
                                            {po}
                                        </span>
                                    ))}
                                    {bucket.data.pos.length > 10 && (
                                        <span className="px-2 py-1 text-text-secondary text-[11px]">
                                            +{bucket.data.pos.length - 10} more
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <p className="text-[12px] text-text-secondary italic">No POs in this bucket</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions: None enabled (Phase 2) */}
        </div>
    );
}
