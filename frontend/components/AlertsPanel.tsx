"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle, AlertTriangle, Info, X } from "lucide-react";
import { api } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass/GlassCard";

interface Alert {
    id: string;
    alert_type: string;
    entity_type: string;
    entity_id: string;
    message: string;
    severity: string;
    is_acknowledged: boolean;
    created_at: string;
}

export default function AlertsPanel({ onClose }: { onClose: () => void }) {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const data = await api.getAlerts(false); // Assuming unacknowledged
            // Mock data if empty for demo
            if (data.length === 0) {
                setAlerts([
                    { id: '1', alert_type: 'System', entity_type: 'PO', entity_id: '123', message: 'PO-1125394 pending approval > 3 days', severity: 'warning', is_acknowledged: false, created_at: new Date().toISOString() }
                ]);
            } else {
                setAlerts(data);
            }
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleAcknowledge = async (alertId: string) => {
        try {
            await api.acknowledgeAlert(alertId);
            setAlerts(alerts.filter(a => a.id !== alertId));
        } catch (error) {
            console.error('Failed to acknowledge alert:', error);
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case "error": return <AlertTriangle className="w-5 h-5 text-red-600" />;
            case "warning": return <AlertTriangle className="w-5 h-5 text-amber-600" />;
            case "info": return <Info className="w-5 h-5 text-blue-600" />;
            default: return <Info className="w-5 h-5 text-gray-600" />;
        }
    };

    return (
        <GlassCard className="w-full relative animate-in slide-in-from-top-2 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-600" />
                    System Alerts
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            <div className="space-y-3">
                {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 bg-white/50 rounded-lg border border-gray-100 shadow-sm">
                        <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {alert.entity_type} • {new Date(alert.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                            Dismiss
                        </button>
                    </div>
                ))}

                {alerts.length === 0 && !loading && (
                    <div className="text-center py-6 text-gray-500 text-sm">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        All systems operational
                    </div>
                )}
            </div>
        </GlassCard>
    );
}
