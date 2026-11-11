"use client";

import React from "react";

export interface HorizontalGridLinesProps {
  ticks: readonly number[];
  mapY: (val: number) => number;
  xStart: number;
  xEnd: number;
  unit?: string;
}

export function HorizontalGridLines({
  ticks,
  mapY,
  xStart,
  xEnd,
  unit = "mm",
}: HorizontalGridLinesProps) {
  return (
    <g>
      {ticks.map((val) => {
        const y = mapY(val);
        return (
          <g key={val}>
            <line
              x1={xStart}
              y1={y}
              x2={xEnd}
              y2={y}
              stroke={val === 0 ? "#313b49" : "#18202c"}
              strokeWidth={val === 0 ? "1.3" : "1"}
            />
            <text x={8} y={y + 4} fill="#8a96a8" fontSize="10" fontFamily="monospace">
              {val > 0 ? `+${val}` : val}
              {unit}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function computeSymmetricTicks(values: readonly number[], minBound = 20): {
  extent: number;
  ticks: number[];
} {
  let maxAbs = minBound;
  for (let i = 0; i < values.length; i += 1) {
    const abs = Math.abs(values[i]);
    if (Number.isFinite(abs) && abs > maxAbs) {
      maxAbs = abs;
    }
  }
  const step = maxAbs > 60 ? 25 : maxAbs > 30 ? 15 : 10;
  const halfSteps = Math.max(2, Math.ceil(maxAbs / step));
  const extent = halfSteps * step;
  const ticks: number[] = [];
  for (let v = -extent; v <= extent; v += step) {
    ticks.push(v);
  }
  return { extent, ticks };
}
