'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import { CommandBar } from "@/components/CommandBar";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // We remove the global sidebar here because DashboardLayout provides it.
  // We keep only CommandBar as global overlay.
  return (
    <html lang="en">
      <body className={inter.className}>
         {/* Render children directly. Pages using DashboardLayout will have their own sidebar.
             Pages like Login will be full screen. */}
         {children}
        <CommandBar />
      </body>
    </html>
  );
}
