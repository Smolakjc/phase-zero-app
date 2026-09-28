import "./globals.css";
import React from "react";

export const metadata = {
  title: "PHASE-ZERO // NISAR Surface Anomaly Detection",
  description: "Environmental Compensation for SAR-Based Surface Anomaly Detection",
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
