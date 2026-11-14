---
colors:
  ground: "light #f3f6f9 / dark #0b111c"
  surface: "light #ffffff / dark #111b2e"
  well: "light #eef3f7 / dark #090f1a"
  glass: "light rgba(255, 255, 255, 0.84) / dark rgba(15, 23, 42, 0.82)"
  glass-strong: "light rgba(255, 255, 255, 0.94) / dark rgba(15, 23, 42, 0.92)"
  text: "light #0f172a / dark #f8fafc"
  secondary: "light #334155 / dark #cbd5e1"
  muted: "light #526377 / dark #94a3b8"
  accent: "light #0f766e / dark #2dd4bf"
  accent-ink: "light #ffffff / dark #042f2e"
  ok-ink: "light #047857 / dark #6ee7b7"
  warn-ink: "light #92400e / dark #fcd34d"
  danger-ink: "light #be123c / dark #fda4af"
  border: "light rgba(15, 23, 42, 0.11) / dark rgba(255, 255, 255, 0.13)"
  border-strong: "light rgba(15, 23, 42, 0.2) / dark rgba(255, 255, 255, 0.22)"
typography:
  sans: "Figtree (400, 500, 600, 700)"
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
  - DiagnosticsPanel
  - TerrainViewport3D
  - TimeSeriesChart
  - ThermoLoopChart
  - DataSourceBadges
  - TokenModal
---

# PHASE-ZERO Design System

## Overview

PHASE-ZERO ("Observatório de Vidro Mineral") is a map-first geospatial InSAR triage workstation for tailings dam monitoring. At initial load, 100% of the viewport stays open for the interactive MapLibre canvas paired with a single floating glass capsule (`FloatingHud`) at the top edge and a compact guidance prompt pill along the lower safe area. Diagnostic charts, Mann-Kendall trend indicators, and the interactive `18x18` (`80m x 80m`) 3D terrain mesh surface inside `ObservatorySheet` only after the operator selects a dam marker, calibrated scenario, catalog search result, or custom coordinate on the map.

## Colors

All semantic tokens live in `frontend/app/globals.css` under `--pz-*` custom properties resolved dynamically via CSS `light-dark()` alongside explicit `<meta name="color-scheme">` and `@media (prefers-color-scheme: dark)` synchronization.

| Token | Light | Dark | Role |
| :--- | :--- | :--- | :--- |
| `--pz-ground` | `#f3f6f9` | `#0b111c` | Full-bleed viewport backdrop behind map tiles |
| `--pz-surface` | `#ffffff` | `#111b2e` | Crisp sub-panels, inputs, dialogs |
| `--pz-well` | `#eef3f7` | `#090f1a` | Recessed chart wells and 3D canvas containers |
| `--pz-glass` | `rgba(255, 255, 255, 0.84)` | `rgba(15, 23, 42, 0.82)` | Top HUD bar and floating prompt pill |
| `--pz-glass-strong` | `rgba(255, 255, 255, 0.94)` | `rgba(15, 23, 42, 0.92)` | Main diagnostic sheet and popovers |
| `--pz-text` | `#0f172a` | `#f8fafc` | Primary headings, metric figures, active controls |
| `--pz-secondary` | `#334155` | `#cbd5e1` | Body prose, labels, table values |
| `--pz-muted` | `#526377` | `#94a3b8` | Metadata hints, axes, footer disclaimer |
| `--pz-accent` | `#0f766e` | `#2dd4bf` | Active scenario pill, primary CTA, focus highlight |
| `--pz-accent-ink` | `#ffffff` | `#042f2e` | Foreground text on solid `--pz-accent` pills |
| `--pz-ok-ink` | `#047857` | `#6ee7b7` | Normal status (`pz-status-green`, active token) |
| `--pz-warn-ink` | `#92400e` | `#fcd34d` | Attention status (`pz-status-yellow`) |
| `--pz-danger-ink` | `#be123c` | `#fda4af` | Critical alert status (`pz-status-red`) |
| `--pz-border` | `rgba(15, 23, 42, 0.11)` | `rgba(255, 255, 255, 0.13)` | Hairline borders for cards and wells |
| `--pz-border-strong` | `rgba(15, 23, 42, 0.2)` | `rgba(255, 255, 255, 0.22)` | Focused controls and divider emphasis |

## Typography

Two typefaces loaded cleanly via `next/font/google` in `frontend/app/layout.tsx` and mapped in `frontend/tailwind.config.js`:

- **Display & UI (`--font-sans` -> `Figtree`)**: Weights `400`, `500`, `600`, `700`. Used for HUD controls, location titles, analytical cards, and status diagnostics.
- **Technical Telemetry (`--font-mono` -> `JetBrains Mono`)**: Weights `400`, `500`, `600`. Strictly paired with `.tabular-nums` (`font-variant-numeric: tabular-nums`) on latitude/longitude pairs, ISO date spans, coherence thresholds, deformation velocity values (`mm/yr`), and SVG chart axis ticks.

## Layout

- **Full-Viewport Map Canvas**: `100vw x 100dvh` WebGL canvas powered by `maplibre-gl` (`^4.7.1`) with OpenFreeMap (`positron` in Light mode, `dark` in Dark mode, `liberty` for Topographic), Esri World Imagery + Labels for Satellite, and AWS Terrarium DEM tiles (`elevation-tiles-prod`) for optional 3D terrain relief.
- **Floating Top HUD (`FloatingHud`)**: Single frosted capsule anchored at `top-3 left-3 right-3` (`top-4 left-4 right-4` on `sm+`) fitting on a single horizontal row at desktop widths (`1440px`), folding scenario presets into the Search/Catalog popover below `lg` (`1024px`).
- **Progressive Bottom Sheet (`ObservatorySheet`)**: Anchored above the bottom edge once `hasSelection` becomes `true`. Uses tabbed mobile navigation (`Diagnóstico`, `Malha 3D`, `Séries & Loop`) under `lg` and a balanced 12-column grid on desktop (`xl`/`lg`), leaving room around the map center when `flyTo` pads downward.
- **Safe-Area Prompt Pill**: Bottom guidance badge offsets `bottom-[76px] right-16` on mobile viewports so MapLibre's attribution toggle, scale bar, and zoom controls remain unobstructed.

## Elevation & Depth

Depth relies on subtle mineral glass translucency and calibrated shadows rather than heavy opaque stacking:

- **`.pz-glass`**: `background: var(--pz-glass)` with `backdrop-filter: blur(18px) saturate(1.25)` and `var(--pz-shadow)`.
- **`.pz-glass-strong`**: `background: var(--pz-glass-strong)` with `backdrop-filter: blur(22px) saturate(1.3)` for reading dense diagnostic numbers cleanly over satellite or dark vector basemaps.
- **Directional Shadows**: `--pz-shadow` resolves to `0 18px 48px rgba(15, 23, 42, 0.12)` in Light mode and `0 22px 56px rgba(2, 6, 23, 0.55)` in Dark mode.
- **Entry Motion**: `.pz-sheet-reveal` (`340ms cubic-bezier(0.16, 1, 0.3, 1)`) and `.pz-popover-reveal` (`280ms cubic-bezier(0.16, 1, 0.3, 1)`) use CSS `@starting-style` transitions, automatically collapsing under `@media (prefers-reduced-motion: reduce)`.

## Shapes

| Class / Role | Radius | Applied To |
| :--- | :--- | :--- |
| Pill | `9999px` | Scenario chips, basemap switchers, `3D` terrain toggle, prompt pill, status pills |
| Sheet | `24px` (`rounded-3xl`) | `ObservatorySheet` floating workstation panel |
| Card | `16px` (`rounded-2xl`) | HUD dock bar, search/catalog popover, diagnostic panels, Earthdata modal |
| Well | `12px` (`rounded-xl`) | 3D terrain canvas frame, SVG chart containers, metric readouts |
| Control | `8px` (`rounded-lg`) | Date pickers, search inputs, physical model toggle chips |

## Components

- **`FloatingHud`**: Houses the `PHASE-ZERO` mark, Search/Catalog/Lat-Lon/Date trigger button, desktop scenario chips (`Itaipu (PR)`, `Gongo Soco (MG)`, `Maceió (AL)`, `Brumadinho (MG)`), layer pills (`Mapa`, `Satélite`, `Topo`, `3D`), Light/Dark/System theme toggle (`theme-toggle-btn`), and Earthdata Token indicator (`pz-status-green` when configured).
- **`ObservatoryMap`**: Manages MapLibre instance creation, dynamic Light/Dark vector basemap switches without losing state, dam marker rendering with `.pz-marker-active` pulse states, free-coordinate pin drops, and padded camera transitions.
- **`ObservatorySheet`**: Progressive disclosure sheet with `Expandir`/`Compactar` height mode, `Fechar` return-to-map control, `DataSourceBadges`, inline date updates, responsive mobile tabs, and the required NISAR monitoring disclaimer footer.
- **`DiagnosticsPanel`, `TerrainViewport3D`, `TimeSeriesChart`, `ThermoLoopChart`, `TokenModal`**: Theme-aware analytical modules consuming `--pz-*` tokens directly across HTML, Canvas 2D, SVG geometry, and native `<dialog>` top-layer modals.

## Do's and Don'ts

- **Do** keep the initial state unobstructed: show zero diagnostic panels or charts until a target is chosen on the map, scenario strip, or search catalog.
- **Do** pair `JetBrains Mono` with `.tabular-nums` for coordinates, velocity metrics (`mm/yr`), dates, and chart ticks.
- **Do** preserve high-contrast ink tokens (`--pz-ok-ink`, `--pz-warn-ink`, `--pz-danger-ink`) inside status cards in both Light and Dark themes.
- **Don't** hardcode dark-only hex fills inside SVG charts, Canvas 2D renderers, or overlays; resolve theme colors or CSS variables dynamically.
- **Don't** place floating pills over MapLibre's bottom-right zoom/attribution controls on mobile screens (`390px`).
- **Don't** remove the footer disclaimer (`Satellite InSAR is a broad-area monitoring and triage layer, not a standalone structural safety system. Uses NISAR Provisional Data.`).
