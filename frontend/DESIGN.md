---
colors:
  ground: "light #f8fafc / dark #090a0f"
  surface: "light #ffffff / dark #121520"
  well: "light #f1f5f9 / dark #0a0c13"
  glass: "light rgba(255, 255, 255, 0.88) / dark rgba(14, 17, 25, 0.82)"
  glass-strong: "light rgba(255, 255, 255, 0.96) / dark rgba(11, 13, 20, 0.94)"
  text: "light #090d16 / dark #f8fafc"
  secondary: "light #334155 / dark #94a3b8"
  muted: "light #64748b / dark #64748b"
  accent: "light #0284c7 / dark #38bdf8"
  accent-ink: "light #ffffff / dark #02121f"
  ok-ink: "light #059669 / dark #34d399"
  warn-ink: "light #d97706 / dark #fbbf24"
  danger-ink: "light #e11d48 / dark #fb7185"
  border: "light rgba(15, 23, 42, 0.08) / dark rgba(255, 255, 255, 0.08)"
  border-strong: "light rgba(15, 23, 42, 0.16) / dark rgba(255, 255, 255, 0.18)"
typography:
  sans: "Inter (400, 500, 600, 700)"
  mono: "JetBrains Mono (400, 500, 600)"
rounded:
  pill: "9999px"
  sheet: "24px"
  card: "16px"
  well: "12px"
  sm: "8px"
spacing:
  base: "4px"
  compact: "8px"
  card: "16px"
  sheet: "20px"
  hud-inset: "12px / 16px"
components:
  - FloatingHud
  - ObservatoryMap
  - ObservatorySheet
  - StatusCard
  - AppeearsThermoPluvioPanel
  - TimeSeriesChart
  - ThermoLoopChart
  - MetricsGrid
  - TerrainViewport3D
  - DataSourceBadges
  - TokenModal
---

# PHASE-ZERO Design System

## Overview

PHASE-ZERO is an aerospace-grade InSAR triage and hydrothermal monitoring workstation for tailings dams and geotechnical assets. It couples satellite interferometry (NISAR L-band and Sentinel-1 C-band) with satellite-derived hydroclimatic observations (NASA GPM precipitation and MODIS Land Surface Temperature).

## Visual Identity & Palette

The design language uses a precision **Deep Aerospace Obsidian & Titanium** aesthetic:
- **Obsidian Dark Mode (`#090a0f`)**: Ultra-deep space backdrop designed for reading satellite imagery, SAR heatmaps, and high-frequency time series with zero eye fatigue.
- **Electric Orbital Blue (`#38bdf8`)**: Active satellite cues, telemetry highlights, and primary actions.
- **Micro Hairline Borders (`rgba(255, 255, 255, 0.08)`)**: Crisp 1px geometric precision.
- **Live Status Rings**: Animated ping/pulse indicator for real-time mission status (Green / Yellow / Red).

## Typography

- **Interface Sans (`Inter`)**: Neutral, highly legible Swiss-style geometry with tight tracking (`tracking-tight`) for headings and uppercase tracking for micro-telemetry labels.
- **Telemetry Mono (`JetBrains Mono`)**: Fixed-width digits with `.tabular-nums` for coordinates, velocities, mm/c slopes, and precipitation values.
