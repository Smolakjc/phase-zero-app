"use client";
import React, { useState, useEffect, useRef } from "react";
import type { DamCatalogItem } from "@phase-zero/shared";
import { DamMapPanel } from "../components/map/DamMapPanel";
import { FALLBACK_DAMS, fetchDamCatalog, findDamByCoords } from "../lib/dams";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SCENARIO_TO_DAM_ID: Record<string, string> = {
  itaipu_normal: "itaipu_pr",
  gongo_soco_active: "sul_superior_gongo_soco",
  maceio_subsidence: "maceio_mutange",
  brumadinho_hist: "brumadinho_b1",
};

export default function PhaseZeroDashboard() {
  const [scenarioId, setScenarioId] = useState("gongo_soco_active");
  const [applyIono, setApplyIono] = useState(true);
  const [applyTropo, setApplyTropo] = useState(true);
  const [applyTides, setApplyTides] = useState(true);
  const [applyPower, setApplyPower] = useState(true);
  const [minCoherence, setMinCoherence] = useState(0.40);

  const [startDate, setStartDate] = useState("2026-03-01");
  const [endDate, setEndDate] = useState("2026-09-15");

  const [customLat, setCustomLat] = useState("-19.9419");
  const [customLon, setCustomLon] = useState("-43.5997");
  const [customName, setCustomName] = useState("Barragem Sul Superior / Mina Gongo Soco (Barão de Cocais, MG)");
  const [dams, setDams] = useState<DamCatalogItem[]>(FALLBACK_DAMS);
  const [selectedDamId, setSelectedDamId] = useState<string | null>("sul_superior_gongo_soco");
  const [isFreePoint, setIsFreePoint] = useState(false);

  const [earthdataToken, setEarthdataToken] = useState("");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const [data, setData] = useState<any>(null);
  const [selectedPixel, setSelectedPixel] = useState<any>(null);
  const screenPointsRef = useRef<any[]>([]);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const skipNextEffectRef = useRef<boolean>(false);

  const [rotAzimuth, setRotAzimuth] = useState(34);
  const [rotPitch, setRotPitch] = useState(54);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("nasa_earthdata_token");
    if (saved) setEarthdataToken(saved);

    const ctrl = new AbortController();
    fetchDamCatalog(API_BASE, ctrl.signal).then((list) => {
      setDams(list);
    });
    return () => ctrl.abort();
  }, []);

  const saveToken = (val: string) => {
    setEarthdataToken(val);
    localStorage.setItem("nasa_earthdata_token", val);
  };

  const runAnalysis = (
    overrideScenario?: string,
    sDate?: string,
    eDate?: string,
    lat?: number,
    lon?: number,
    name?: string
  ) => {
    const activeSc = overrideScenario || scenarioId;
    if (analyzeAbortRef.current) {
      analyzeAbortRef.current.abort();
    }
    const ctrl = new AbortController();
    analyzeAbortRef.current = ctrl;

    setLoadingAnalysis(true);
    fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        scenario_id: activeSc,
        apply_ionosphere: applyIono,
        apply_troposphere: applyTropo,
        apply_solid_tides: applyTides,
        apply_nasa_power: applyPower,
        min_coherence: minCoherence,
        start_date: sDate || startDate,
        end_date: eDate || endDate,
        custom_lat: lat ?? parseFloat(customLat),
        custom_lon: lon ?? parseFloat(customLon),
        custom_name: name ?? customName,
        earthdata_token: earthdataToken,
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        if (res.grid_pixels?.length) {
          const prevId = selectedPixel?.id || "px_10_9";
          const found = res.grid_pixels.find((p: any) => p.id === prevId) || res.grid_pixels[0];
          setSelectedPixel(found);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Erro ao conectar ao backend:", err);
      })
      .finally(() => {
        if (analyzeAbortRef.current === ctrl) {
          setLoadingAnalysis(false);
        }
      });
  };

  useEffect(() => {
    if (skipNextEffectRef.current) {
      skipNextEffectRef.current = false;
      return;
    }
    runAnalysis();
  }, [scenarioId, applyIono, applyTropo, applyTides, applyPower, minCoherence]);

  const handleSelectScenario = (id: string, defaultStart: string, defaultEnd: string) => {
    if (scenarioId !== id) {
      skipNextEffectRef.current = true;
    }
    setScenarioId(id);
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    const mappedDamId = SCENARIO_TO_DAM_ID[id] ?? null;
    const matchedDam = mappedDamId ? dams.find((d) => d.id === mappedDamId) ?? null : null;
    if (matchedDam) {
      setSelectedDamId(matchedDam.id);
      setIsFreePoint(false);
      setCustomLat(String(matchedDam.lat));
      setCustomLon(String(matchedDam.lon));
      setCustomName(matchedDam.name);
    }
    runAnalysis(id, defaultStart, defaultEnd);
  };

  const handleSelectDam = (dam: DamCatalogItem) => {
    if (scenarioId !== "custom") {
      skipNextEffectRef.current = true;
    }
    setSelectedDamId(dam.id);
    setIsFreePoint(false);
    setScenarioId("custom");
    setStartDate(dam.default_start);
    setEndDate(dam.default_end);
    setCustomLat(String(dam.lat));
    setCustomLon(String(dam.lon));
    setCustomName(dam.name);
    runAnalysis("custom", dam.default_start, dam.default_end, dam.lat, dam.lon, dam.name);
  };

  const handleSelectFreePoint = (lat: number, lon: number) => {
    const nearby = findDamByCoords(dams, lat, lon);
    if (nearby) {
      handleSelectDam(nearby);
      return;
    }
    if (scenarioId !== "custom") {
      skipNextEffectRef.current = true;
    }
    const label = "Ponto Livre no Mapa";
    setSelectedDamId(null);
    setIsFreePoint(true);
    setScenarioId("custom");
    setCustomLat(String(lat));
    setCustomLon(String(lon));
    setCustomName(label);
    runAnalysis("custom", startDate, endDate, lat, lon, label);
  };

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 25;
    const az = (rotAzimuth * Math.PI) / 180;
    const pitch = (rotPitch * Math.PI) / 180;

    const allElevs = data.grid_pixels.map((p: any) => p.elevation_m);
    const minElev = Math.min(...allElevs);
    const maxElev = Math.max(...allElevs);
    const meanElev = (minElev + maxElev) / 2.0;
    const elevSpan = Math.max(maxElev - minElev, 12.0);

    const project3D = (r: number, c: number, elev: number) => {
      const x0 = (c - 8.5) * 23;
      const y0 = (r - 8.5) * 23;
      const zNorm = ((elev - meanElev) / elevSpan) * 95.0;

      const xr = x0 * Math.cos(az) - y0 * Math.sin(az);
      const yr = x0 * Math.sin(az) + y0 * Math.cos(az);

      const screenX = cx + xr;
      const screenY = cy + yr * Math.cos(pitch) - zNorm * Math.sin(pitch);
      const depth = yr * Math.sin(pitch) + zNorm * Math.cos(pitch);
      return { x: screenX, y: screenY, depth };
    };

    const gridMap: Record<string, any> = {};
    const projectedList: any[] = [];

    data.grid_pixels.forEach((px: any) => {
      const pt = project3D(px.row, px.col, px.elevation_m);
      const item = { ...pt, px };
      gridMap[`${px.row}_${px.col}`] = item;
      projectedList.push(item);
    });

    ctx.lineWidth = 1.1;
    for (let r = 0; r < 18; r++) {
      for (let c = 0; c < 18; c++) {
        const curr = gridMap[`${r}_${c}`];
        if (!curr) continue;
        ctx.strokeStyle = curr.px.masked ? "rgba(51, 65, 85, 0.28)" : "rgba(56, 189, 248, 0.25)";

        if (c + 1 < 18 && gridMap[`${r}_${c + 1}`]) {
          const right = gridMap[`${r}_${c + 1}`];
          ctx.beginPath();
          ctx.moveTo(curr.x, curr.y);
          ctx.lineTo(right.x, right.y);
          ctx.stroke();
        }
        if (r + 1 < 18 && gridMap[`${r + 1}_${c}`]) {
          const down = gridMap[`${r + 1}_${c}`];
          ctx.beginPath();
          ctx.moveTo(curr.x, curr.y);
          ctx.lineTo(down.x, down.y);
          ctx.stroke();
        }
      }
    }

    projectedList.sort((a, b) => a.depth - b.depth);

    const getColor = (px: any) => {
      if (px.masked) {
        return px.zone.includes("ÁGUA")
          ? "rgba(14, 116, 144, 0.32)"
          : "rgba(30, 41, 59, 0.38)";
      }
      const v = px.residual_mm;
      if (Math.abs(v) < 3.5) return "rgba(16, 185, 129, 0.94)";
      if (Math.abs(v) >= 18.0) return "rgba(244, 63, 94, 0.96)";
      return "rgba(245, 158, 11, 0.94)";
    };

    const renderedPts: any[] = [];
    projectedList.forEach((item: any) => {
      const { x, y, px } = item;
      const isSelected = selectedPixel?.id === px.id;
      const radius = isSelected ? 11.0 : px.masked ? 4.8 : 7.4;

      ctx.fillStyle = getColor(px);
      ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(15, 23, 42, 0.9)";
      ctx.lineWidth = isSelected ? 3.0 : 1.0;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      renderedPts.push({ x, y, radius: 12, px });
    });
    screenPointsRef.current = renderedPts;

    const los = data.scenario_meta.los_vector;
    const startX = cx + los.losUnitVectorX * 180;
    const startY = 62 + los.losUnitVectorY * 55;
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.4;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(cx, cy - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 12px monospace";
    ctx.fillText(
      `🛰️ VETOR LOS [X:${los.losUnitVectorX}, Y:${los.losUnitVectorY} | Incidência:${los.incidenceAngle}°]`,
      18,
      26
    );
    ctx.fillStyle = "#10b981";
    ctx.fillText(
      `⛰️ RELEVO DEM REAL AUTO-ESCALADO: Min ${minElev.toFixed(1)}m | Máx ${maxElev.toFixed(1)}m`,
      18,
      46
    );
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(
      "👆 Clique em qualquer nó da malha 3D (80m×80m) para inspecionar a série temporal daquele bloco!",
      18,
      432
    );
  }, [data, rotAzimuth, rotPitch, selectedPixel]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    let closest: any = null;
    let minDist = 22;
    for (const pt of screenPointsRef.current) {
      const d = Math.hypot(pt.x - clickX, pt.y - clickY);
      if (d < minDist) {
        minDist = d;
        closest = pt.px;
      }
    }
    if (closest) setSelectedPixel(closest);
  };

  if (!data || !selectedPixel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-sky-400 font-mono gap-3">
        <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
        <span>Carregando PHASE-ZERO v4.2 (Métricas Calibradas)...</span>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    GREEN: "bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-950/50",
    YELLOW: "bg-amber-950/90 border-amber-500 text-amber-300 shadow-lg shadow-amber-950/50",
    RED: "bg-rose-950/90 border-rose-500 text-rose-300 shadow-lg shadow-rose-950/50",
  };

  const ts = selectedPixel.pixel_time_series;
  const loop = ts.thermo_loop;
  const dates = data.dates;

  return (
    <div className="w-full max-w-[96vw] mx-auto py-4 px-2 md:px-5 space-y-4">
      {/* HEADER */}
      <header className="animate-enter-1 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-800/90 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded bg-sky-950 text-sky-400 border border-sky-700">
              NASA SPACE APPS 2026 // DANCING WITH THE SARs
            </span>
            <span className="px-2.5 py-0.5 text-xs font-mono rounded bg-slate-900 text-emerald-400 border border-slate-700">
              🛰️ {data.scenario_meta.asf_status?.latest_granule}
            </span>
            <button
              onClick={() => setShowTokenModal(!showTokenModal)}
              className={`px-2.5 py-0.5 text-xs font-mono rounded border transition ${
                earthdataToken
                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-600"
                  : "bg-amber-950/80 text-amber-300 border-amber-600 hover:bg-amber-900"
              }`}
            >
              {earthdataToken ? "🔑 NASA Earthdata Token: Ativo" : "🔑 Configurar Token NASA Earthdata"}
            </button>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white mt-1.5">
            PHASE-ZERO <span className="text-sky-400 font-light text-xl md:text-2xl">// Compensação Ambiental para Detecção de Anomalias via Radar SAR</span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "itaipu_normal", label: "🟢 Itaipu (PR) - Estável", s: "2026-03-01", e: "2026-09-15" },
            { id: "gongo_soco_active", label: "🟡 Gongo Soco (MG) - Ativa", s: "2026-03-01", e: "2026-09-15" },
            { id: "maceio_subsidence", label: "🔴 Maceió (AL) - Subsidência", s: "2026-03-01", e: "2026-09-15" },
            { id: "brumadinho_hist", label: "🔴 Brumadinho (2018-2019)", s: "2018-07-01", e: "2019-01-20" },
          ].map((sc) => (
            <button
              key={sc.id}
              onClick={() => handleSelectScenario(sc.id, sc.s, sc.e)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 border ${
                scenarioId === sc.id
                  ? "bg-sky-600 text-white border-sky-400 scale-[1.02] shadow-lg shadow-sky-900/50"
                  : "bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800"
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </header>

      {showTokenModal && (
        <div className="animate-enter-1 bg-slate-900 border border-amber-500/50 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="text-xs space-y-1">
            <div className="font-bold text-amber-300">
              🔑 Conexão Autenticada NASA Earthdata Cloud (urs.earthdata.nasa.gov)
            </div>
            <p className="text-slate-400">
              Cole aqui o seu Bearer Token gerado no perfil Earthdata para leitura direta de granules .h5 da NASA via fsspec/h5py.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="password"
              value={earthdataToken}
              onChange={(e) => saveToken(e.target.value)}
              placeholder="Cole seu Bearer Token (eyJ0eXAi...)"
              className="px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-emerald-300 w-full md:w-80"
            />
            <button
              onClick={() => {
                setShowTokenModal(false);
                runAnalysis();
              }}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              Salvar & Aplicar
            </button>
          </div>
        </div>
      )}

      {/* MAPA INTERATIVO DE BARRAGENS */}
      <DamMapPanel
        dams={dams}
        selectedDamId={selectedDamId}
        activeLat={Number.isFinite(parseFloat(customLat)) ? parseFloat(customLat) : -19.9419}
        activeLon={Number.isFinite(parseFloat(customLon)) ? parseFloat(customLon) : -43.5997}
        isFreePoint={isFreePoint}
        loading={loadingAnalysis}
        onSelectDam={handleSelectDam}
        onSelectFreePoint={handleSelectFreePoint}
      />

      {/* BARRA DE DATAS E BUSCA LIVRE */}
      <div className="animate-enter-2 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <span className="px-2 py-1 rounded bg-sky-950/90 text-sky-300 font-mono font-bold border border-sky-800">
            FLUXO DE ANÁLISE:
          </span>
          <span><b>1º</b> Selecione uma barragem no mapa ou informe Lat/Lon</span>
          <span className="text-slate-600">→</span>
          <span><b>2º</b> Ative/Desative os 4 filtros à direita</span>
          <span className="text-slate-600">→</span>
          <span><b>3º</b> Veja as 3 Métricas e clique na Malha 3D</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full 2xl:w-auto">
          <label className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-xs">
            <span className="text-slate-400 font-mono">Início:</span>
            <input
              type="date"
              aria-label="Data de início"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sky-300 font-mono focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-xs">
            <span className="text-slate-400 font-mono">Fim:</span>
            <input
              type="date"
              aria-label="Data de fim"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sky-300 font-mono focus:outline-none"
            />
          </label>

          <input
            type="text"
            aria-label="Nome do Local"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Nome do Local"
            className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white w-44"
          />
          <input
            type="text"
            aria-label="Latitude"
            value={customLat}
            onChange={(e) => setCustomLat(e.target.value)}
            placeholder="Lat"
            className="px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-sky-300 w-24"
          />
          <input
            type="text"
            aria-label="Longitude"
            value={customLon}
            onChange={(e) => setCustomLon(e.target.value)}
            placeholder="Lon"
            className="px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-sky-300 w-24"
          />
          <button
            type="button"
            onClick={() => runAnalysis(scenarioId, startDate, endDate)}
            className="px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition"
          >
            {loadingAnalysis ? "Processando..." : "🔄 Atualizar Período"}
          </button>
          <button
            type="button"
            onClick={() => {
              const latNum = parseFloat(customLat);
              const lonNum = parseFloat(customLon);
              if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) return;
              const matched = findDamByCoords(dams, latNum, lonNum);
              setSelectedDamId(matched ? matched.id : null);
              setIsFreePoint(!matched);
              if (scenarioId !== "custom") {
                skipNextEffectRef.current = true;
              }
              setScenarioId("custom");
              runAnalysis("custom", startDate, endDate, latNum, lonNum, customName);
            }}
            className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
          >
            🌍 Buscar Lat/Lon Live
          </button>
        </div>
      </div>

      {/* PAINEL CENTRAL: VIEWPORT 3D + RACK FÍSICO COM AS 3 MÉTRICAS */}
      <div className="animate-enter-3 grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-sky-400">
                1. Viewport Topográfico 3D Interativo (Malha Auto-Normalizada 80m)
              </h2>
              <p className="text-xs text-slate-400">
                {data.scenario_meta.name} — <span className="text-slate-300">{data.scenario_meta.regime_info}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <label className="flex items-center gap-1.5 text-slate-300">
                Girar:
                <input
                  type="range"
                  min="-85"
                  max="85"
                  value={rotAzimuth}
                  onChange={(e) => setRotAzimuth(Number(e.target.value))}
                  className="w-20 accent-sky-400 cursor-pointer"
                />
              </label>
              <label className="flex items-center gap-1.5 text-slate-300">
                Inclinar:
                <input
                  type="range"
                  min="25"
                  max="78"
                  value={rotPitch}
                  onChange={(e) => setRotPitch(Number(e.target.value))}
                  className="w-20 accent-sky-400 cursor-pointer"
                />
              </label>
              <button
                onClick={() => {
                  setRotAzimuth(34);
                  setRotPitch(54);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700"
              >
                Reset 3D
              </button>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={960}
            height={450}
            onClick={handleCanvasClick}
            className="w-full h-[380px] md:h-[450px] bg-[#02050b] rounded-xl border border-slate-800/90 cursor-pointer shadow-inner"
          />

          <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2.5 text-xs font-mono bg-slate-950 p-3 rounded-xl border border-sky-500/30">
            <div className="md:col-span-2">
              <span className="text-slate-500 block">Setor Clicado (Pixel 80m×80m):</span>
              <span className="text-sky-300 font-bold text-sm">{selectedPixel.zone}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Coerência Radar (γ):</span>
              <span className={selectedPixel.masked ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                {selectedPixel.coherence} {selectedPixel.masked ? "(Mascarado)" : "(Confiável)"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Altitude Real do Bloco:</span>
              <span className="text-slate-200">{selectedPixel.elevation_m} m</span>
            </div>
            <div>
              <span className="text-slate-500 block">Anomalia Residual:</span>
              <span className="text-rose-400 font-extrabold text-sm">{selectedPixel.residual_mm} mm</span>
            </div>
          </div>
        </div>

        {/* RACK DE COMPENSAÇÃO FÍSICA + QUADRO EXPLICATIVO DAS 3 MÉTRICAS */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-sky-400 mb-2.5">
              2. Diagnóstico & Métricas de Decisão
            </h2>

            {/* ALERTA PRINCIPAL */}
            <div className={`p-3.5 rounded-xl border transition-all duration-300 ${statusColors[data.status.code]} mb-3`}>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-mono uppercase opacity-80">Diagnóstico Automático</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/30">
                  Score (γ): {data.status.max_weighted_anomaly_score}
                </span>
              </div>
              <div className="text-base font-extrabold mt-1 tracking-tight">
                {data.status.code === "GREEN" && "🟢 "}
                {data.status.code === "YELLOW" && "🟡 "}
                {data.status.code === "RED" && "🔴 "}
                {data.status.label}
              </div>
              <p className="text-[11px] mt-1 leading-relaxed opacity-95">{data.status.description}</p>
            </div>

            {/* QUADRO NOVO: AS 3 MÉTRICAS QUE DECIDEM A COR */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 mb-3 space-y-2">
              <div className="text-[11px] font-mono uppercase text-sky-400 font-bold">
                📊 Índices Atuais Calculados vs. Regras de Cor:
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">1. Velocidade</span>
                  <span className="text-xs font-bold text-white">
                    {data.status.residual_trend_mm_per_pass} mm/ciclo
                  </span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">2. Aceleração</span>
                  <span className="text-xs font-bold text-white">
                    {data.status.acceleration_index_mm} mm
                  </span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">3. Score (γ)</span>
                  <span className="text-xs font-bold text-sky-400">
                    {data.status.max_weighted_anomaly_score}
                  </span>
                </div>
              </div>
              <div className="text-[10px] font-mono text-slate-400 space-y-0.5 pt-1 border-t border-slate-900">
                <div>🟢 <b>VERDE:</b> |Vel| &lt; 0.35 mm/ciclo e Score &lt; 5.0</div>
                <div>🟡 <b>AMARELO:</b> |Vel| 0.35 a 1.45, |Acel| &lt; 4.5 e Score &lt; 20.0</div>
                <div>🔴 <b>VERMELHO:</b> |Vel| &ge; 1.45, |Acel| &ge; 4.5 ou Score &ge; 20.0</div>
              </div>
            </div>

            {/* 4 TOGGLES DE COMPENSAÇÃO FÍSICA */}
            <div className="space-y-2">
              {[
                {
                  label: "1. Ionospheric Split-Spectrum Screen",
                  sub: "Corrige atraso de elétrons na Banda L (~24 cm)",
                  val: applyIono,
                  set: setApplyIono,
                },
                {
                  label: "2. Wet & Hydrostatic Troposphere",
                  sub: "Corrige atraso de nuvens, vapor e pressão",
                  val: applyTropo,
                  set: setApplyTropo,
                },
                {
                  label: "3. Solid Earth Tides (Maré Terrestre)",
                  sub: "Subtrai oscilação gravitacional (Sol/Lua)",
                  val: applyTides,
                  set: setApplyTides,
                },
                {
                  label: "4. NASA POWER Thermo-Hydro Model",
                  sub: "Subtrai dilatação térmica solar (TS/SW) e chuva",
                  val: applyPower,
                  set: setApplyPower,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => item.set(!item.val)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    item.val
                      ? "bg-slate-950/90 border-sky-500/40 hover:border-sky-400"
                      : "bg-slate-950/40 border-slate-800 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="pr-2">
                    <div className="text-xs font-bold text-slate-100">{item.label}</div>
                    <div className="text-[10px] text-slate-400">{item.sub}</div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded transition ${
                      item.val ? "bg-emerald-600 text-white" : "bg-rose-950 text-rose-300 border border-rose-800"
                    }`}
                  >
                    {item.val ? "ON" : "OFF"}
                  </span>
                </div>
              ))}
            </div>

            {/* SLIDER DE COERÊNCIA */}
            <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Filtro de Qualidade: Coerência Mínima (γ)</span>
                <span className="text-sky-400 font-bold">{minCoherence.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={minCoherence}
                onChange={(e) => setMinCoherence(parseFloat(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* GRÁFICOS INFERIORES */}
      <div className="animate-enter-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-sky-400">
                3. Deconvolução Temporal ({ dates[0] } até { dates[dates.length - 1] }) — [{selectedPixel.zone}]
              </h2>
              <p className="text-xs text-slate-400">
                Sinal Bruto (cinza), Movimento Ambiental Esperado NASA POWER (amarelo) e Anomalia Residual (verde/amarelo/vermelho).
              </p>
            </div>
            <div className="flex gap-4 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">── Bruto</span>
              <span className="text-amber-400">-- Clima (NASA POWER)</span>
              <span className="text-rose-400 font-bold">━━ Anomalia Residual</span>
            </div>
          </div>

          <svg viewBox="0 0 760 240" className="w-full h-[230px] bg-[#02050b] rounded-xl border border-slate-800">
            {[-20, -10, 0, 10, 20].map((val) => {
              const y = 115 - val * 3.8;
              return (
                <g key={val}>
                  <line x1="50" y1={y} x2="735" y2={y} stroke="#1e293b" strokeWidth="1" />
                  <text x="8" y={y + 4} fill="#64748b" fontSize="10" fontFamily="monospace">
                    {val > 0 ? `+${val}` : val}mm
                  </text>
                </g>
              );
            })}

            {dates.map((d: string, i: number) => {
              if (i % 3 !== 0 && i !== dates.length - 1) return null;
              const x = 55 + (i / Math.max(1, dates.length - 1)) * 670;
              return (
                <text key={i} x={x - 24} y={228} fill="#64748b" fontSize="10" fontFamily="monospace">
                  {d}
                </text>
              );
            })}

            <polyline
              fill="none"
              stroke="#64748b"
              strokeWidth="1.8"
              points={ts.observed_raw_mm
                .map((v: number, i: number) => `${55 + (i / Math.max(1, dates.length - 1)) * 670},${115 - v * 3.8}`)
                .join(" ")}
            />

            <polyline
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.2"
              strokeDasharray="5,4"
              points={ts.expected_environmental_mm
                .map((v: number, i: number) => `${55 + (i / Math.max(1, dates.length - 1)) * 670},${115 - v * 3.8}`)
                .join(" ")}
            />

            <polyline
              fill="none"
              stroke={
                data.status.code === "GREEN"
                  ? "#10b981"
                  : data.status.code === "YELLOW"
                  ? "#f59e0b"
                  : "#f43f5e"
              }
              strokeWidth="3.5"
              points={ts.residual_anomaly_mm
                .map((v: number, i: number) => `${55 + (i / Math.max(1, dates.length - 1)) * 670},${115 - v * 3.8}`)
                .join(" ")}
            />
          </svg>
        </div>

        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-sky-400">
                4. Thermo-Mechanical Response Loop [{selectedPixel.id}]
              </h2>
              <p className="text-xs text-slate-400">
                Temperatura Superficial TS (°C) vs. Deslocamento Corrigido (mm).
              </p>
            </div>
            <span className="text-xs font-mono text-sky-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              Taxa: {data.status.residual_trend_mm_per_pass} mm/ciclo
            </span>
          </div>

          <svg viewBox="0 0 500 240" className="w-full h-[230px] bg-[#02050b] rounded-xl border border-slate-800">
            <line x1="45" y1="115" x2="475" y2="115" stroke="#1e293b" strokeWidth="1" />
            <line x1="260" y1="20" x2="260" y2="210" stroke="#1e293b" strokeWidth="1" />
            <text x="345" y="228" fill="#64748b" fontSize="10" fontFamily="monospace">
              Temp. Superficial TS (°C) →
            </text>
            <text x="12" y="18" fill="#64748b" fontSize="10" fontFamily="monospace">
              ↑ Deslocamento LOS (mm)
            </text>

            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.4"
              points={loop
                .map((pt: any) => {
                  const x = 65 + ((pt.surface_temp_c - 10) / 28) * 380;
                  const y = 115 - pt.displacement_mm * 3.6;
                  return `${x},${y}`;
                })
                .join(" ")}
            />

            {loop.map((pt: any, idx: number) => {
              const x = 65 + ((pt.surface_temp_c - 10) / 28) * 380;
              const y = 115 - pt.displacement_mm * 3.6;
              return (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r={idx === loop.length - 1 ? 6 : 3.2}
                  fill={idx === loop.length - 1 ? "#f43f5e" : "#38bdf8"}
                />
              );
            })}
          </svg>
        </div>
      </div>

      <footer className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs font-mono text-slate-400">
        <div>⚠️ {data.disclaimer}</div>
        <div className="text-sky-400 font-bold">PHASE-ZERO v4.2 // 3-Tier Calibrated Metrics HUD</div>
      </footer>
    </div>
  );
}
