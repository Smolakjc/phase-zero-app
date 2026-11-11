import "./globals.css";
import React from "react";
import { Fraunces, Instrument_Sans } from "next/font/google";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" });
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", axes: ["opsz"] });

export const metadata = {
  title: "Phase Zero — Deslocamentos do solo por radar",
  description:
    "Detecta movimentos mínimos do terreno em imagens de radar SAR, descontando atmosfera, marés e temperatura.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
