"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, CheckCircle, AlertTriangle, Info, X } from "lucide-react";
import { api } from "@/lib/api";

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

export default function AlertsPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true); // Keep loading state for initial fetch
    const panelRef = useRef<HTMLDivElement>(null);

    const fetchAlerts = async () => {
        try {
            setLoading(true); // Set loading true before fetch
            const data = await api.getAlerts(false); // Assuming getAlerts fetches unacknowledged
            setAlerts(data);
            setUnreadCount(data.length);
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
            setAlerts([]); // Clear alerts on error
        } finally {
            setLoading(false); // Set loading false after fetch
        }
    };

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, []);

    const handleAcknowledge = async (alertId: string) => {
        try {
            await api.acknowledgeAlert(alertId);
            fetchAlerts(); // Refresh list after acknowledging
        } catch (error) {
            console.error('Failed to acknowledge alert:', error);
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case "error": return <AlertTriangle className="w-5 h-5 text-red-600" />;
            case "warning": return <AlertTriangle className="w-5 h-5 text-orange-600" />;
            case "info": return <Info className="w-5 h-5 text-blue-600" />;
            default: return <Info className="w-5 h-5 text-gray-600" />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "error": return "bg-red-50 border-red-200";
            case "warning": return "bg-orange-50 border-orange-200";
            case "info": return "bg-blue-50 border-blue-200";
            default: return "bg-gray-50 border-gray-200";
        }
    };

    return (
        <>
            {/* Alert Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <Bell className="w-5 h-5" />
                {alerts.length > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {alerts.length}
                    </span>
                )}
            </button>

            {/* Alerts Panel */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black bg-opacity-25 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="fixed top-16 right-4 w-96 bg-white rounded-lg shadow-2xl z-50 max-h-[600px] flex flex-col">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-gray-700" />
                                <h3 className="font-semibold text-gray-900">Alerts</h3>
                                {alerts.length > 0 && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                        {alerts.length}
                                    </span>
                                )}
                            </div>
                            <button onClick={() => setIsOpen(false)}>
                                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>

                        {/* Alerts List */}
                        <div className="flex-1 overflow-y-auto p-2">
                            {loading && (
                                <div className="text-center py-8 text-gray-500">Loading alerts...</div>
                            )}

                            {!loading && alerts.length === 0 && (
                                <div className="text-center py-8">
                                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                                    <div className="text-gray-900 font-medium">All clear!</div>
                                    <div className="text-sm text-gray-500">No pending alerts</div>
                                </div>
                            )}

                            {!loading && alerts.length > 0 && (
                                <div className="space-y-2">
                                    {alerts.map((alert) => (
                                        <div
                                            key={alert.id}
                                            className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {getSeverityIcon(alert.severity)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                                        {alert.message}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span className="px-2 py-0.5 bg-white rounded">
                                                            {alert.entity_type}
                                                        </span>
                                                        <span>{new Date(alert.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAcknowledge(alert.id)}
                                                    className="flex-shrink-0 p-1 hover:bg-white rounded transition-colors"
                                                    title="Acknowledge"
                                                >
                                                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {alerts.length > 0 && (
                            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center">
                                Click X to acknowledge alerts
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    );
}
