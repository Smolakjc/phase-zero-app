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
      className={`bg-[#131820] border border-[#222933] rounded-lg p-4 flex flex-col justify-between gap-3 ${className}`}
    >
      <div className="flex flex-wrap justify-between items-start gap-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[#eef2f6]">{title}</h2>
          <p className="text-xs text-[#8a96a8] mt-0.5">{subtitle}</p>
        </div>
        {rightSlot}
      </div>
      {children}
    </section>
  );
}
