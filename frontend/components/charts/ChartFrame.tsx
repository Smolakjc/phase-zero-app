"use client";

import React from "react";

export interface ChartFrameProps {
  title: string;
  subtitle: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ChartFrame({
  title,
  subtitle,
  rightSlot,
  children,
  className = "",
}: ChartFrameProps) {
  return (
    <section
      className={`bg-[var(--pz-surface)] border border-[var(--pz-border)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-sm hover:border-[var(--pz-border-strong)] transition-all duration-200 backdrop-blur-md ${className}`}
    >
      <div className="flex flex-wrap justify-between items-start gap-2.5">
        <div className="min-w-0">
          <h2 className="text-xs sm:text-sm font-bold tracking-tight text-[var(--pz-text)]">{title}</h2>
          <p className="text-[11px] text-[var(--pz-muted)] mt-0.5">{subtitle}</p>
        </div>
        {rightSlot}
      </div>
      {children}
    </section>
  );
}
