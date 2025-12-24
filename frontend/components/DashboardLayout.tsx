'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Truck,
  Receipt,
  ClipboardCheck,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { GlassButton } from '@/components/ui/glass/GlassButton';

const NavItem = ({ href, icon: Icon, label, active }: { href: string, icon: any, label: string, active: boolean }) => (
  <Link href={href}>
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      active
        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
        : "text-gray-600 hover:bg-white/50 hover:text-gray-900"
    )}>
      <Icon className={cn("w-5 h-5", active ? "text-white" : "text-gray-500 group-hover:text-gray-700")} />
      <span className="font-medium text-sm">{label}</span>
    </div>
  </Link>
);

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/po', label: 'Purchase Orders', icon: FileText },
    { href: '/dc', label: 'Delivery Challans', icon: Truck },
    { href: '/invoice', label: 'GST Invoices', icon: Receipt },
    { href: '/srv', label: 'SRV Receipts', icon: ClipboardCheck },
  ];

  return (
    <div className="min-h-screen flex bg-[#f3f4f6]">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-white/80 backdrop-blur-xl border-r border-white/20 transition-transform duration-300 lg:translate-x-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
              <FileText className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              SenstoSales
            </span>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                active={pathname.startsWith(item.href)}
              />
            ))}
          </nav>

          <div className="pt-6 border-t border-gray-100">
            <GlassButton
              variant="ghost"
              className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/auth/login';
              }}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </GlassButton>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/50 backdrop-blur-md border-b border-white/20 lg:hidden">
          <span className="font-semibold text-gray-900">SenstoSales</span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-600 hover:bg-white/50 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
