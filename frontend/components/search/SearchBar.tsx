"use client";

import React, { useEffect, useState } from "react";
import { CustomSearchInput } from "../../hooks/useAnalysis";

export interface SearchBarProps {
  startDate: string;
  endDate: string;
  initialLat?: number;
  initialLon?: number;
  initialName?: string;
  loading: boolean;
  onUpdatePeriod: (startDate: string, endDate: string) => void;
  onSearchCustom: (input: CustomSearchInput) => void;
}

/**
 * Barra de período e busca de coordenadas livres com validação inline (`R-F2`).
 */
export function SearchBar({
  startDate,
  endDate,
  initialLat = -25.408,
  initialLon = -54.588,
  initialName = "Usina de Itaipu (PR)",
  loading,
  onUpdatePeriod,
  onSearchCustom,
}: SearchBarProps) {
  const [sDate, setSDate] = useState<string>(startDate);
  const [eDate, setEDate] = useState<string>(endDate);
  const [customName, setCustomName] = useState<string>(initialName);
  const [customLat, setCustomLat] = useState<string>(String(initialLat));
  const [customLon, setCustomLon] = useState<string>(String(initialLon));
  const [coordsEdited, setCoordsEdited] = useState<boolean>(false);

  useEffect(() => {
    setSDate(startDate);
    setEDate(endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    setCustomLat(String(initialLat));
    setCustomLon(String(initialLon));
    setCustomName(initialName);
    setCoordsEdited(false);
  }, [initialLat, initialLon, initialName]);

  const normLatStr = customLat.trim().replace(",", ".");
  const normLonStr = customLon.trim().replace(",", ".");
  const parsedLat = Number(normLatStr);
  const parsedLon = Number(normLonStr);

  const isDateValid =
    /^\d{4}-\d{2}-\d{2}$/.test(sDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(eDate) &&
    sDate < eDate;
  const isLatValid =
    normLatStr !== "" && Number.isFinite(parsedLat) && parsedLat >= -90 && parsedLat <= 90;
  const isLonValid =
    normLonStr !== "" && Number.isFinite(parsedLon) && parsedLon >= -180 && parsedLon <= 180;

  const canUpdatePeriod = isDateValid && !loading;
  const canSearchCustom = isDateValid && isLatValid && isLonValid && !loading;

  const handleLatChange = (raw: string) => {
    setCoordsEdited(true);
    // Suporta colar par "lat, lon" copiado direto do Google Maps (ex: "-20.119, -44.121")
    if (raw.includes(",") && raw.split(",").length === 2) {
      const [p1, p2] = raw.split(",").map((s) => s.trim());
      if (p1 && p2 && Number.isFinite(Number(p1)) && Number.isFinite(Number(p2))) {
        setCustomLat(p1);
        setCustomLon(p2);
        return;
      }
    }
    setCustomLat(raw);
  };

  const triggerCustomSearch = () => {
    if (!canSearchCustom) return;
    setCoordsEdited(false);
    onSearchCustom({
      startDate: sDate,
      endDate: eDate,
      lat: parsedLat,
      lon: parsedLon,
      name: customName,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      triggerCustomSearch();
    }
  };

  let validationMessage: string | null = null;
  if (!isDateValid) {
    validationMessage = "A data de início deve ser anterior à data de fim.";
  } else if (!isLatValid) {
    validationMessage = "Latitude inválida (deve estar entre -90 e 90).";
  } else if (!isLonValid) {
    validationMessage = "Longitude inválida (deve estar entre -180 e 180).";
  }

  return (
    <div className="animate-enter-2 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
      <div className="flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <span className="px-2 py-1 rounded bg-sky-950/90 text-sky-300 font-mono font-bold border border-sky-800">
            FLUXO DE ANÁLISE:
          </span>
          <span>
            <b>1º</b> Escolha um Exemplo ou digite qualquer Lat/Lon e Datas
          </span>
          <span className="text-slate-600">→</span>
          <span>
            <b>2º</b> Ative/Desative os 4 filtros à direita
          </span>
          <span className="text-slate-600">→</span>
          <span>
            <b>3º</b> Veja as 3 Métricas e clique na Malha 3D
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full 2xl:w-auto">
          <label className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-xs">
            <span className="text-slate-400 font-mono">Início:</span>
            <input
              type="date"
              aria-label="Data de início"
              data-testid="start-date-input"
              value={sDate}
              onChange={(e) => setSDate(e.target.value)}
              className="bg-transparent text-sky-300 font-mono focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-xs">
            <span className="text-slate-400 font-mono">Fim:</span>
            <input
              type="date"
              aria-label="Data de fim"
              data-testid="end-date-input"
              value={eDate}
              onChange={(e) => setEDate(e.target.value)}
              className="bg-transparent text-sky-300 font-mono focus:outline-none"
            />
          </label>

          <input
            type="text"
            aria-label="Nome do Local"
            data-testid="custom-name-input"
            value={customName}
            onChange={(e) => {
              setCoordsEdited(true);
              setCustomName(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Nome do Local"
            className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white w-36"
          />
          <input
            type="text"
            inputMode="decimal"
            aria-label="Latitude"
            data-testid="custom-lat-input"
            value={customLat}
            onChange={(e) => handleLatChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Lat"
            className={`px-2 py-1.5 rounded bg-slate-950 border text-xs font-mono text-sky-300 w-24 ${
              isLatValid ? "border-slate-800" : "border-rose-500"
            }`}
          />
          <input
            type="text"
            inputMode="decimal"
            aria-label="Longitude"
            data-testid="custom-lon-input"
            value={customLon}
            onChange={(e) => {
              setCoordsEdited(true);
              setCustomLon(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Lon"
            className={`px-2 py-1.5 rounded bg-slate-950 border text-xs font-mono text-sky-300 w-24 ${
              isLonValid ? "border-slate-800" : "border-rose-500"
            }`}
          />

          <button
            type="button"
            data-testid="update-period-btn"
            disabled={!canUpdatePeriod}
            onClick={() => {
              if (coordsEdited && canSearchCustom) {
                triggerCustomSearch();
              } else {
                onUpdatePeriod(sDate, eDate);
              }
            }}
            className="px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition"
          >
            {loading ? "Processando..." : "🔄 Atualizar Período"}
          </button>
          <button
            type="button"
            data-testid="search-custom-btn"
            disabled={!canSearchCustom}
            onClick={triggerCustomSearch}
            className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition"
          >
            🌍 Buscar Lat/Lon Live
          </button>
        </div>
      </div>

      {validationMessage && (
        <div
          role="alert"
          data-testid="search-validation-error"
          className="text-xs font-mono text-rose-400"
        >
          ⚠️ {validationMessage}
        </div>
      )}
    </div>
  );
}

