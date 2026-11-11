# PHASE-ZERO v5.0 // 100% TypeScript Monorepo

> **NASA Space Apps Challenge — Dancing with the SARs**  
> Compensação Ambiental para Detecção de Anomalias de Superfície via Radar InSAR (NISAR Banda L & Sentinel-1/OPERA Banda C) combinada com modelagem termo-hidrometeorológica **NASA POWER**, topografia **Open-Meteo DEM** e busca de granules **NASA CMR / Earthdata Cloud HDF5**.

---

## 1. Arquitetura do Monorepo (v5.0)

```text
phase-zero-app/
├── package.json                # npm workspaces + scripts unificados (dev, build, test, lint, typecheck)
├── tsconfig.base.json          # strict: true, zero explicit any
├── docs/
│   └── ADR-001-hdf5.md         # Decisão arquitetural sobre leitura de HDF5 remoto em TypeScript
├── packages/
│   └── shared/                 # @phase-zero/shared (constantes físicas, schemas Zod, tipos)
├── backend/                    # Fastify + TypeScript (:8000)
│   └── src/
│       ├── app.ts / server.ts / config.ts
│       ├── routes/             # POST /api/analyze, GET /api/scenarios, GET /api/health
│       ├── services/           # pipeline, classifier, nasaPower, terrain, cmr, h5Stream
│       ├── domain/presets.ts   # 4 cenários calibrados (Itaipu, Gongo Soco, Maceió, Brumadinho)
│       ├── lib/                # math, interp (B-spline zoom2D / bilinear2D), geo (proj4 UTM), http, cache
│       ├── scripts/extract-h5.ts
│       └── __tests__/          # Testes unitários + Paridade Golden (±0.01) contra Python v4.2
├── frontend/                   # Next.js 14 + Tailwind CSS + TypeScript strict (:3000)
│   ├── app/                    # Composição principal do dashboard
│   ├── components/             # header, search, token, badges, viewport, diagnostics, charts
│   ├── hooks/useAnalysis.ts    # Estado global, debounce de 300ms e cancelamento via AbortController
│   ├── lib/                    # api, colors, projection3d, tokenStorage
│   └── e2e/                    # Testes E2E com Playwright
└── scripts/
    └── legacy/dump_golden.py   # Gerador de fixtures golden a partir do motor Python v4.2
```

---

## 2. Como Executar

### Pré-requisitos
- **Node.js ≥ 20** e **npm ≥ 10**

### Instalação e Desenvolvimento (Windows, macOS e Linux)
```bash
npm install
npm run dev
```
- **Frontend (Next.js):** `http://localhost:3000`
- **Backend (Fastify):** `http://localhost:8000` (`GET /api/health`, `GET /api/scenarios`, `POST /api/analyze`)

### Qualidade, Testes e Build
```bash
npm run lint        # ESLint (proíbe explicit any)
npm run typecheck   # TypeScript strict: true nos 3 pacotes
npm test            # Vitest (unitários + paridade numérica golden ±0.01)
npm run build       # Compila shared, backend e frontend
npm run test:e2e    # Testes E2E Playwright
```

### CLI Extratora de HDF5 Offline
```bash
npm run extract -- <caminho/entrada.h5> <caminho/saida.json>
```

