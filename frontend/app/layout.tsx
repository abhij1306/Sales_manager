import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavRail from "@/components/NavRail";
import GlobalSearch from "@/components/GlobalSearch";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sales Manager",
  description: "PO-DC-Invoice Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen bg-background">
          <NavRail />
          <div className="flex-1 flex flex-col overflow-hidden scrollbar-stable">
            <header className="bg-white border-b border-border px-8 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-[20px] font-semibold text-text-primary">Sales Manager</h2>
              <div className="flex items-center gap-4">
                <GlobalSearch />
              </div>
            </header>
            <main className="flex-1 overflow-auto bg-background p-6">
              <div className="mx-auto max-w-[1200px] w-full">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
