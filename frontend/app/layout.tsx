'use client';

import { Inter } from "next/font/google";
import "./globals.css";
// NavRail removed - we use DashboardLayout now
// import NavRail from "@/components/NavRail";
import { VoiceAgent } from "@/components/VoiceAgent";
import { CommandBar } from "@/components/CommandBar";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // We remove the global sidebar here because DashboardLayout provides it.
  // We keep only the VoiceAgent and CommandBar as global overlays.
  return (
    <html lang="en">
      <body className={inter.className}>
         {/* Render children directly. Pages using DashboardLayout will have their own sidebar.
             Pages like Login will be full screen. */}
         {children}

        {/* Voice Agent - Floating button in bottom-right */}
        <VoiceAgent
          onAction={(action) => {
            console.log('Voice action received:', action);
            // Handle voice actions here
          }}
        />
        <CommandBar />
      </body>
    </html>
  );
}
