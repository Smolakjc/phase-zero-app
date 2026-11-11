import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Archivo, Fira_Code } from "next/font/google";
import React from "react";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PHASE-ZERO — Triagem Interferométrica InSAR e Compensação Ambiental",
  description:
    "Sistema de triagem e compensação ambiental para detecção de anomalias de superfície via radar SAR (NISAR Banda L e Sentinel-1 Banda C).",
};

export const viewport: Viewport = {
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${firaCode.variable}`}>
      <body className="min-h-screen bg-[#0c0f14] text-[#eef2f6] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
