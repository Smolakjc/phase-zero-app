import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import React from "react";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PHASE-ZERO — Observatório InSAR e Compensação Ambiental",
  description:
    "Plataforma de triagem interferométrica SAR (NISAR Banda L e Sentinel-1 Banda C) com mapa interativo em tempo real, tema claro/escuro e compensação climática NASA POWER.",
};

const COLOR_SCHEME_INIT_SCRIPT =
  '(function(){try{var v=localStorage.getItem("color-scheme");var m=document.querySelector(\'meta[name="color-scheme"]\');if(m&&(v==="light"||v==="dark")){m.content=v;}}catch(e){}})();';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: COLOR_SCHEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-[var(--pz-ground)] text-[var(--pz-text)] font-sans antialiased selection:bg-[var(--pz-accent)]/20 selection:text-[var(--pz-accent)]">
        {children}
      </body>
    </html>
  );
}
