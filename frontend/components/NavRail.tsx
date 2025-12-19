"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    FileText,
    Truck,
    Receipt,
    BarChart3,
    StickyNote,
    Package,
    Layers,
    Archive
} from "lucide-react";

export default function NavRail() {
    const pathname = usePathname();

    const sections = [
        {
            title: "",
            items: [
                { href: "/", icon: LayoutDashboard, label: "Dashboard" } // Changed icon to match "Internal ERP" style
            ]
        },
        {
            title: "MANAGEMENT PORTAL",
            items: [
                { href: "/po", icon: FileText, label: "Purchase Orders" },
                { href: "/dc", icon: Truck, label: "Delivery Challans" },
                { href: "/invoice", icon: Receipt, label: "Sales & Invoices" },
            ]
        },
        {
            title: "INVENTORY",
            items: [
                // { href: "/stock", icon: Archive, label: "Stock Levels" },
                { href: "/reports", icon: BarChart3, label: "Reports" },
                { href: "/po-notes", icon: StickyNote, label: "PO Notes Templates" },
            ]
        }
    ];

    return (
        <div className="w-64 bg-white border-r border-border flex flex-col h-full font-sans shrink-0">
            {/* Logo Section */}
            <div className="p-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                        <Package className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-text-primary leading-tight">Internal ERP</h1>
                        <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Management Portal</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
                {sections.map((section, idx) => (
                    <div key={idx}>
                        {section.title && (
                            <h3 className="px-3 text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-3 opacity-80">
                                {section.title}
                            </h3>
                        )}
                        <ul className="space-y-1">
                            {section.items.map((item) => {
                                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                                const Icon = item.icon;

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium ${isActive
                                                ? "bg-blue-50 text-primary"
                                                : "text-text-secondary hover:bg-gray-50 hover:text-text-primary"
                                                }`}
                                        >
                                            <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-text-secondary group-hover:text-text-primary"}`} />
                                            <span>{item.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* Profile Footer */}
            <div className="p-4 border-t border-border bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-primary font-bold border border-blue-200">
                        JD
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">John Doe</p>
                        <p className="text-xs text-text-secondary truncate">Admin User</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
