"use client";

import React from "react";

export interface PolylineProps {
  points: readonly { x: number; y: number }[];
  stroke: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

export function Polyline({
  points,
  stroke,
  strokeWidth = 2,
  strokeDasharray,
}: PolylineProps) {
  const formatted = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <polyline
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      points={formatted}
    />
  );
}

