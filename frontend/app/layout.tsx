import "./globals.css";
import type { Metadata, Viewport } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "PHASE-ZERO // NISAR Surface Anomaly Detection",
  description: "Environmental Compensation for SAR-Based Surface Anomaly Detection",
};

export const viewport: Viewport = {
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#050811] text-slate-100 antialiased selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
