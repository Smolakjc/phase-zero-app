"use client";
import React, { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:8000";

export default function PhaseZeroDashboard() {
  const [scenarioId, setScenarioId] = useState("gongo_soco_active");
  const [applyIono, setApplyIono] = useState(true);
  const [applyTropo, setApplyTropo] = useState(true);
  const [applyTides, setApplyTides] = useState(true);
  const [applyPower, setApplyPower] = useState(true);
  const [minCoherence, setMinCoherence] = useState(0.40);

  // Datas Inicial e Final selecionáveis pelo usuário
  const [startDate, setStartDate] = useState("2026-03-01");
  const [endDate, setEndDate] = useState("2026-09-15");

  // Busca Customizada e Token NASA Earthdata (salvo apenas no navegador)
  const [customLat, setCustomLat] = useState("-25.408");
  const [customLon, setCustomLon] = useState("-54.588");
  const [customName, setCustomName] = useState("Usina de Itaipu (PR)");
  const [earthdataToken, setEarthdataToken] = useState("");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const [data, setData] = useState<any>(null);
  const [selectedPixel, setSelectedPixel] = useState<any>(null);
  const screenPointsRef = useRef<any[]>([]);

  const [rotAzimuth, setRotAzimuth] = useState(32);
  const [rotPitch, setRotPitch] = useState(55);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("nasa_earthdata_token");
    if (saved) setEarthdataToken(saved);
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
    setLoadingAnalysis(true);
    fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      .catch((err) => console.error("Erro ao conectar ao FastAPI:", err))
      .finally(() => setLoadingAnalysis(false));
  };

  useEffect(() => {
    runAnalysis();
  }, [scenarioId, applyIono, applyTropo, applyTides, applyPower, minCoherence]);

  const handleSelectScenario = (id: string, defaultStart: string, defaultEnd: string) => {
    setScenarioId(id);
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    runAnalysis(id, defaultStart, defaultEnd);
  };

  // Renderização do Viewport Topográfico 3D Ampliado
  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 38;
    const az = (rotAzimuth * Math.PI) / 180;
    const pitch = (rotPitch * Math.PI) / 180;

    const project3D = (r: number, c: number, elev: number) => {
      const x0 = (c - 8.5) * 24;
      const y0 = (r - 8.5) * 24;
      const z0 = (elev - 835) * 1.85;
      const xr = x0 * Math.cos(az) - y0 * Math.sin(az);
      const yr = x0 * Math.sin(az) + y0 * Math.cos(az);
      const screenX = cx + xr;
      const screenY = cy + yr * Math.cos(pitch) - z0 * Math.sin(pitch);
      return { x: screenX, y: screenY };
    };

    const getColor = (px: any) => {
      if (px.masked) {
        return px.zone.includes("ÁGUA")
          ? "rgba(14, 116, 144, 0.25)"
          : "rgba(30, 41, 59, 0.30)";
      }
      const v = px.residual_mm;
      if (Math.abs(v) < 3.5) return "rgba(16, 185, 129, 0.92)";
      if (v <= -12.0 || v >= 12.0) return "rgba(244, 63, 94, 0.95)";
      return "rgba(245, 158, 11, 0.92)";
    };

    const renderedPts: any[] = [];
    data.grid_pixels.forEach((px: any) => {
      const p = project3D(px.row, px.col, px.elevation_m);
      const isSelected = selectedPixel?.id === px.id;
      const radius = isSelected ? 11.5 : px.masked ? 5.5 : 8.2;

      ctx.fillStyle = getColor(px);
      ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(15, 23, 42, 0.85)";
      ctx.lineWidth = isSelected ? 3.2 : 1.0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      renderedPts.push({ x: p.x, y: p.y, radius: 12, px });
    });
    screenPointsRef.current = renderedPts;

    // Seta 3D do Vetor LOS
    const los = data.scenario_meta.los_vector;
    const startX = cx + los.losUnitVectorX * 190;
    const startY = 64 + los.losUnitVectorY * 65;
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(cx, cy - 25);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 12px monospace";
    ctx.fillText(
      `🛰️ VETOR DE VISADA (LOS) DO SATÉLITE [X:${los.losUnitVectorX}, Y:${los.losUnitVectorY} | Incidência:${los.incidenceAngle}°]`,
      18,
      26
    );
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(
      "👆 DICA: Clique em qualquer círculo (bloco de 80m) para ver se é Água, Mureta ou Paredão e inspecionar o gráfico!",
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
        <span>Inicializando Motor Geofísico PHASE-ZERO v3.0...</span>
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
      {/* 1. CABEÇALHO SUPERIOR + BOTÃO DO TOKEN NASA EARTHDATA */}
      <header className="animate-enter-1 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-800/90 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded bg-sky-950 text-sky-400 border border-sky-700">
              NASA SPACE APPS 2026 // DANCING WITH THE SARs
            </span>
            <span className="px-2.5 py-0.5 text-xs font-mono rounded bg-slate-900 text-emerald-400 border border-slate-700">
              🛰️ ASF Granule: {data.scenario_meta.asf_status?.latest_granule}
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

        {/* Seletor dos 4 Casos Reais Calibrados */}
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

      {/* MODAL / BARRA DE TOKEN EARTHDATA (OPCIONAL) */}
      {showTokenModal && (
        <div className="animate-enter-1 bg-slate-900 border border-amber-500/50 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="text-xs space-y-1">
            <div className="font-bold text-amber-300">
              🔑 Conexão Autenticada NASA Earthdata Cloud (urs.earthdata.nasa.gov)
            </div>
            <p className="text-slate-400">
              Cole aqui o seu Bearer Token gerado gratuitamente no seu perfil Earthdata. Ele fica salvo apenas no seu navegador (localStorage) e nunca vai para o GitHub.
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

      {/* 2. BARRA DE CONTROLE DE DATAS, BUSCA DE COORDENADAS E GUIA DE 3 PASSOS */}
      <div className="animate-enter-2 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between gap-4">
        {/* Explicação Didática Rápida */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <span className="px-2 py-1 rounded bg-sky-950/90 text-sky-300 font-mono font-bold border border-sky-800">
            COMO USAR:
          </span>
          <span><b>1º</b> Escolha a estrutura ou coordenada e o período</span>
          <span className="text-slate-600">→</span>
          <span><b>2º</b> Ligue/Desligue os 4 filtros físicos à direita</span>
          <span className="text-slate-600">→</span>
          <span><b>3º</b> Clique nos blocos de 80m no Mapa 3D</span>
        </div>

        {/* Seletores de Data Inicial, Data Final e Coordenada Customizada */}
        <div className="flex flex-wrap items-center gap-2 w-full 2xl:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-xs">
            <span className="text-slate-400 font-mono">Início:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sky-300 font-mono focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-xs">
            <span className="text-slate-400 font-mono">Fim:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sky-300 font-mono focus:outline-none"
            />
          </div>

          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Nome do Alvo"
            className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white w-36"
          />
          <input
            type="text"
            value={customLat}
            onChange={(e) => setCustomLat(e.target.value)}
            placeholder="Lat"
            className="px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-sky-300 w-20"
          />
          <input
            type="text"
            value={customLon}
            onChange={(e) => setCustomLon(e.target.value)}
            placeholder="Lon"
            className="px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-sky-300 w-20"
          />
          <button
            onClick={() => runAnalysis(scenarioId, startDate, endDate)}
            className="px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition"
          >
            {loadingAnalysis ? "Processando..." : "🔄 Atualizar Período"}
          </button>
          <button
            onClick={() => {
              setScenarioId("custom");
              runAnalysis("custom", startDate, endDate, parseFloat(customLat), parseFloat(customLon), customName);
            }}
            className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
          >
            🌍 Buscar Lat/Lon Live
          </button>
        </div>
      </div>

      {/* 3. GRADE PRINCIPAL AMPLIADA: VIEWPORT 3D (8 COLUNAS) + RACK FÍSICO (4 COLUNAS) */}
      <div className="animate-enter-3 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* VIEWPORT TOPOGRÁFICO 3D GIGANTE */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-sky-400">
                1. Viewport Topográfico 3D Interativo (Relevo NASADEM 30m + Pixels GUNW 80m)
              </h2>
              <p className="text-xs text-slate-400">
                {data.scenario_meta.name} — <span className="text-slate-300">{data.scenario_meta.regime_info}</span>
              </p>
            </div>
            <div className="flex gap-4 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <label className="flex items-center gap-1.5 text-slate-300">
                Girar 3D:
                <input
                  type="range"
                  min="-90"
                  max="90"
                  value={rotAzimuth}
                  onChange={(e) => setRotAzimuth(Number(e.target.value))}
                  className="w-24 accent-sky-400 cursor-pointer"
                />
              </label>
              <label className="flex items-center gap-1.5 text-slate-300">
                Inclinar:
                <input
                  type="range"
                  min="25"
                  max="80"
                  value={rotPitch}
                  onChange={(e) => setRotPitch(Number(e.target.value))}
                  className="w-24 accent-sky-400 cursor-pointer"
                />
              </label>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={960}
            height={450}
            onClick={handleCanvasClick}
            className="w-full h-[380px] md:h-[450px] bg-[#02050b] rounded-xl border border-slate-800/90 cursor-pointer shadow-inner"
          />

          {/* LEGENDA + INSPEÇÃO DO BLOCO CLICADO */}
          <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2.5 text-xs font-mono bg-slate-950 p-3 rounded-xl border border-sky-500/30">
            <div className="md:col-span-2">
              <span className="text-slate-500 block">Setor da Estrutura Clicado (Pixel 80m×80m):</span>
              <span className="text-sky-300 font-bold text-sm">{selectedPixel.zone}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Coerência Radar (γ):</span>
              <span className={selectedPixel.masked ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                {selectedPixel.coherence} {selectedPixel.masked ? "(Ruído Mascarado)" : "(Alta Confiança)"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Coordenada Exata do Bloco:</span>
              <span className="text-slate-200">{selectedPixel.lat}, {selectedPixel.lon}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Deformação Residual no Bloco:</span>
              <span className="text-rose-400 font-extrabold text-sm">{selectedPixel.residual_mm} mm</span>
            </div>
          </div>
        </div>

        {/* RACK DE COMPENSAÇÃO FÍSICA E DIAGNÓSTICO */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-sky-400 mb-3">
              2. Rack de Compensação Física (GUNW + NASA POWER)
            </h2>

            {/* BADGE DE STATUS EM 3 NÍVEIS */}
            <div className={`p-4 rounded-xl border transition-all duration-300 ${statusColors[data.status.code]} mb-4`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono uppercase opacity-80">Classificação da Superfície</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/30">
                  Score (γ): {data.status.max_weighted_anomaly_score}
                </span>
              </div>
              <div className="text-lg font-extrabold mt-1.5 tracking-tight">
                {data.status.code === "GREEN" && "🟢 "}
                {data.status.code === "YELLOW" && "🟡 "}
                {data.status.code === "RED" && "🔴 "}
                {data.status.label}
              </div>
              <p className="text-xs mt-1.5 leading-relaxed opacity-95">{data.status.description}</p>
            </div>

            {/* 4 TOGGLES DE COMPENSAÇÃO FÍSICA */}
            <div className="space-y-2.5">
              {[
                {
                  label: "1. Ionospheric Split-Spectrum Screen",
                  sub: "Corrige atraso de elétrons na Banda L (~24 cm) do NISAR",
                  val: applyIono,
                  set: setApplyIono,
                },
                {
                  label: "2. Wet & Hydrostatic Troposphere",
                  sub: "Corrige atraso de nuvens, vapor d'água e pressão atmosférica",
                  val: applyTropo,
                  set: setApplyTropo,
                },
                {
                  label: "3. Solid Earth Tides (Maré Terrestre)",
                  sub: "Subtrai oscilação gravitacional da crosta (Sol/Lua)",
                  val: applyTides,
                  set: setApplyTides,
                },
                {
                  label: "4. NASA POWER Thermo-Hydro Model",
                  sub: "Subtrai dilatação térmica solar (TS/SW) e chuva acumulada",
                  val: applyPower,
                  set: setApplyPower,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => item.set(!item.val)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    item.val
                      ? "bg-slate-950/90 border-sky-500/40 hover:border-sky-400"
                      : "bg-slate-950/40 border-slate-800 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="pr-2">
                    <div className="text-xs font-bold text-slate-100">{item.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.sub}</div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition ${
                      item.val ? "bg-emerald-600 text-white shadow" : "bg-rose-950 text-rose-300 border border-rose-800"
                    }`}
                  >
                    {item.val ? "ON" : "OFF"}
                  </span>
                </div>
              ))}
            </div>

            {/* CONTROLE DE COERÊNCIA MÍNIMA */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex justify-between text-xs font-mono mb-1.5">
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
              <div className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                Descarta automaticamente Água (γ≈0.18) e Vegetação densa (γ≈0.28), isolando a rocha/concreto da barragem.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. LINHA INFERIOR AMPLIADA: DECONVOLUÇÃO TEMPORAL + LOOP TERMO-MECÂNICO */}
      <div className="animate-enter-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* GRÁFICO 3: SÉRIE TEMPORAL DE DECONVOLUÇÃO */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-sky-400">
                3. Deconvolução Temporal ({startDate} até {endDate}) — [{selectedPixel.zone}]
              </h2>
              <p className="text-xs text-slate-400">
                Mostra o sinal sujo do satélite (cinza), a dilatação esperada pelo clima (amarelo) e a anomalia limpa (verde/vermelho).
              </p>
            </div>
            <div className="flex gap-4 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">── Bruto (Satélite)</span>
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

            {/* Datas no eixo X */}
            {dates.map((d: string, i: number) => {
              if (i % 3 !== 0 && i !== dates.length - 1) return null;
              const x = 55 + (i / (dates.length - 1)) * 670;
              return (
                <text key={d} x={x - 24} y={228} fill="#64748b" fontSize="10" fontFamily="monospace">
                  {d}
                </text>
              );
            })}

            <polyline
              fill="none"
              stroke="#64748b"
              strokeWidth="1.8"
              points={ts.observed_raw_mm
                .map((v: number, i: number) => `${55 + (i / (dates.length - 1)) * 670},${115 - v * 3.8}`)
                .join(" ")}
            />

            <polyline
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.2"
              strokeDasharray="5,4"
              points={ts.expected_environmental_mm
                .map((v: number, i: number) => `${55 + (i / (dates.length - 1)) * 670},${115 - v * 3.8}`)
                .join(" ")}
            />

            <polyline
              fill="none"
              stroke={Math.abs(selectedPixel.residual_mm) < 3.5 ? "#10b981" : "#f43f5e"}
              strokeWidth="3.5"
              points={ts.residual_anomaly_mm
                .map((v: number, i: number) => `${55 + (i / (dates.length - 1)) * 670},${115 - v * 3.8}`)
                .join(" ")}
            />
          </svg>
        </div>

        {/* GRÁFICO 4: THERMO-MECHANICAL RESPONSE LOOP */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-sky-400">
                4. Thermo-Mechanical Response Loop [{selectedPixel.id}]
              </h2>
              <p className="text-xs text-slate-400">
                Se o loop fica fechado no centro = dilatação elástica normal. Se abre em espiral = deformação anômala.
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
                  const x = 65 + ((pt.surface_temp_c - 15) / 22) * 380;
                  const y = 115 - pt.displacement_mm * 3.6;
                  return `${x},${y}`;
                })
                .join(" ")}
            />

            {loop.map((pt: any, idx: number) => {
              const x = 65 + ((pt.surface_temp_c - 15) / 22) * 380;
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

      {/* RODAPÉ OFICIAL DE BLINDAGEM CIENTÍFICA */}
      <footer className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs font-mono text-slate-400">
        <div>⚠️ {data.disclaimer}</div>
        <div className="text-sky-400 font-bold">PHASE-ZERO v3.0 // Full-Viewport 96vw + Git Ready</div>
      </footer>
    </div>
  );
}
