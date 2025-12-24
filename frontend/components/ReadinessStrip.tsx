import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, AlertCircle, Clock, Activity } from "lucide-react";

export default function ReadinessStrip() {
    // Mock steps for system health
    const steps = [
        { label: "DB Connected", status: "completed" },
        { label: "Auth Secure", status: "completed" },
        { label: "Sync Active", status: "current" }
    ];

    return (
        <div className="w-full px-4 py-3 bg-white/40 backdrop-blur-md rounded-xl border border-white/20 shadow-sm">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <Activity className="w-3 h-3 text-blue-500" />
                    <span>System Status</span>
                </div>
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
            </div>

            <div className="mt-3 space-y-2">
                {steps.map((step, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                        <span className={cn(
                            "font-medium",
                            step.status === 'completed' ? "text-gray-700" : "text-blue-700"
                        )}>{step.label}</span>
                        {step.status === 'completed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                            <div className="w-3.5 h-3.5 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
