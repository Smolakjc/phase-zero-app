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
    <div className={`bg-slate-900/90 border border-slate-800 rounded-xl p-4 ${className}`}>
      <div className="flex flex-wrap justify-between items-start mb-3 gap-2">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-sky-400">
            {title}
          </h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        {rightSlot}
      </div>
      {children}
    </div>
  );
}

