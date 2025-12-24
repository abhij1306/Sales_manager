/**
 * PO Dependency Analysis Report Component
 * Shows which POs are blocking at dispatch vs billing stage
 */

interface PODependencyData {
    period: string;
    coverage: {
        no_dc: {
            count: number;
            pos: Array<{ po_number: string; supplier: string }>;
        };
        dc_but_no_invoice: {
            count: number;
            pos: Array<{ po_number: string; supplier: string }>;
        };
        fully_invoiced: {
            count: number;
            pos: Array<{ po_number: string; supplier: string }>;
        };
    };
    total_pos: number;
}

interface PODependencyReportProps {
    data: PODependencyData;
    aiSummary?: string;
}

export default function PODependencyReport({ data, aiSummary }: PODependencyReportProps) {
    const categories = [
        {
            key: 'no_dc',
            title: 'No Delivery Challan',
            description: 'POs blocked at dispatch stage',
            color: 'bg-danger',
            textColor: 'text-danger',
            data: data.coverage.no_dc
        },
        {
            key: 'dc_but_no_invoice',
            title: 'DC Created, Not Invoiced',
            description: 'POs blocked at billing stage',
            color: 'bg-warning',
            textColor: 'text-warning',
            data: data.coverage.dc_but_no_invoice
        },
        {
            key: 'fully_invoiced',
            title: 'Fully Invoiced',
            description: 'POs completed',
            color: 'bg-success',
            textColor: 'text-success',
            data: data.coverage.fully_invoiced
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-[18px] font-semibold text-text-primary">PO Dependency Analysis</h2>
                <p className="text-[12px] text-text-secondary mt-1">
                    Total POs: {data.total_pos} • Analyzing dispatch and billing coverage
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                {categories.map((cat) => (
                    <div key={cat.key} className="glass-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                            <p className={`text-[24px] font-bold ${cat.textColor}`}>
                                {cat.data.count}
                            </p>
                        </div>
                        <p className="text-[13px] font-semibold text-text-primary mb-1">{cat.title}</p>
                        <p className="text-[11px] text-text-secondary">{cat.description}</p>
                        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${cat.color}`}
                                style={{ width: `${(cat.data.count / data.total_pos) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
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

            {/* Detailed Breakdown */}
            <div className="space-y-4">
                {categories.map((cat) => (
                    <div key={cat.key} className="glass-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-[14px] font-semibold text-text-primary">{cat.title}</h3>
                                <p className="text-[12px] text-text-secondary mt-0.5">{cat.data.count} POs</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full ${cat.color}/10 ${cat.textColor} text-[12px] font-medium`}>
                                {Math.round((cat.data.count / data.total_pos) * 100)}% of total
                            </div>
                        </div>

                        {cat.data.pos.length > 0 ? (
                            <div className="space-y-2">
                                {cat.data.pos.slice(0, 10).map((po, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <div>
                                            <p className="text-[13px] font-medium text-text-primary">{po.po_number}</p>
                                            <p className="text-[11px] text-text-secondary truncate max-w-[300px]">{po.supplier}</p>
                                        </div>
                                    </div>
                                ))}
                                {cat.data.pos.length > 10 && (
                                    <p className="text-[12px] text-text-secondary text-center pt-2">
                                        +{cat.data.pos.length - 10} more POs
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-[12px] text-text-secondary italic text-center py-4">
                                No POs in this category
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Actions: None enabled (Phase 2) */}
        </div>
    );
}
