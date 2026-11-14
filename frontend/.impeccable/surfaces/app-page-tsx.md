---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: []
---

# Surface Brief: PHASE-ZERO Observatório de Vidro Mineral

- **Scope:** `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `hooks/useAnalysis.ts`, and modular components (`components/*`, `lib/*`)
- **Visitor Mode:** Operate
- **Audience & Job:** Evaluators (NASA Space Apps Challenge) and geotechnical risk analysts who want a clean, map-first InSAR screening experience where the full-bleed free vector/satellite map leads and local diagnostic details, 3D terrain mesh, and temporal/thermo charts appear smoothly after picking a dam or coordinate on the map.
- **Memorable Moment:** Picking any dam or clicking anywhere on the 60fps MapLibre GL JS map triggers a smooth `flyTo` camera focus and smoothly reveals the frosted mineral-glass observatory sheet below with synchronized 3D mesh, physical filters, and temporal deconvolution curves, seamlessly adapting between Light and Dark themes.

## Direction contract

THESIS:
PHASE-ZERO places a full-viewport WebGL MapLibre vector/satellite/3D-terrain observatory at the center of the screen, keeping the map open and uncluttered until the user picks a dam, clicks a coordinate, or selects a scenario, when a translucent mineral-glass sheet smoothly expands to reveal the structural diagnosis, 3D mesh, physical compensations, and charts.

OWN-WORLD:
Dual adaptive light/dark mineral-glass palette driven by `color-scheme: light dark` and CSS `light-dark()`: airy alabaster ground (`#F6F8FA`) and frosted white glass (`rgba(255,255,255,0.82)`) in Light mode; deep oceanic slate (`#0B111C`) and obsidian glass (`rgba(15,23,42,0.82)`) in Dark mode, paired with mineral teal accent (`#0D9488` light / `#2DD4BF` dark), subtle hairline borders, and crisp semantic triage inks (`#16A34A`/`#22C55E`, `#D97706`/`#F59E0B`, `#E11D48`/`#F43F5E`) with geometric shape distinction. Typography pairs `Figtree` for crisp UI and headings with `JetBrains Mono` tabular numerals strictly for coordinates, dates, and physical measurements.

STORY:
On load, the user sees Brazil's interactive dam catalog over a clean MapLibre canvas with only floating glass pills at the top (brand, unified search/coordinate bar, 4 scenario quick-picks, theme & layer controls, Earthdata token trigger) and a calm bottom prompt inviting them to choose a location on the map. Picking a dam or clicking any coordinate smoothly flies the camera (`flyTo`) to the target, highlights its pulse ring, and animates open the bottom mineral-glass observatory sheet (with expand, collapse, and close controls) displaying the structural status, 3 decision metrics, 3D 80m × 80m terrain mesh, 4 physical compensation toggles, coherence slider (`γ`), and temporal/thermo charts.

FIRST VIEWPORT:
Full-bleed MapLibre GL JS canvas (`100vw × 100dvh`) with a single floating top HUD row (`PHASE-ZERO` pill, unified search/Lat-Lon/period popover trigger, 4 scenario quick-pills, Claro/Escuro theme toggle, Vetorial/Satélite/3D layer switcher, and Earthdata Token button). Before selection, only a compact floating hint pill and dam status legend sit gently at the bottom edge. After selecting a site, the frosted mineral-glass sheet (`max-h-[46vh]` default, expandable to `82vh`) rises smoothly using `@starting-style` and compositor transforms, organizing status + KPIs, 3D terrain mesh, temporal/thermo charts, and physical compensations into a clean, non-overlapping grid.

FORM:
Observatório de Vidro Mineral (`model-pick`, user-selected top grounded direction from Impeccable visual decision round), seed:da54b005731eaf20.

FINISH:
unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
