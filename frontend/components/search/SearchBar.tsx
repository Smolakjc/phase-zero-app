"use client";

import React, { useEffect, useState } from "react";
import { ScenarioMeta } from "@phase-zero/shared";
import { CustomSearchInput } from "../../hooks/useAnalysis";
import { DataSourceBadges } from "../badges/DataSourceBadges";
import { AlertTriangleIcon, CrosshairIcon, RefreshIcon } from "../icons/SurveyIcons";

export interface SearchBarProps {
  startDate: string;
  endDate: string;
  initialLat?: number;
  initialLon?: number;
  initialName?: string;
  loading: boolean;
  meta?: ScenarioMeta | null;
  onUpdatePeriod: (startDate: string, endDate: string) => void;
  onSearchCustom: (input: CustomSearchInput) => void;
}

/**
 * Barra operacional de coordenadas, janela temporal e procedência dos dados (`R-F2`).
 */
export function SearchBar({
  startDate,
  endDate,
  initialLat = -19.9419,
  initialLon = -43.5997,
  initialName = "Barragem Sul Superior / Mina Gongo Soco (Barão de Cocais, MG)",
  loading,
  meta,
  onUpdatePeriod,
  onSearchCustom,
}: SearchBarProps) {
  const [sDate, setSDate] = useState<string>(startDate);
  const [eDate, setEDate] = useState<string>(endDate);
  const [customName, setCustomName] = useState<string>(initialName);
  const [customLat, setCustomLat] = useState<string>(String(initialLat));
  const [customLon, setCustomLon] = useState<string>(String(initialLon));
  const [coordsEdited, setCoordsEdited] = useState<boolean>(false);
  const [nameEdited, setNameEdited] = useState<boolean>(false);

  useEffect(() => {
    setSDate(startDate);
    setEDate(endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    setCustomLat(String(initialLat));
    setCustomLon(String(initialLon));
    setCustomName(initialName);
    setCoordsEdited(false);
    setNameEdited(false);
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
    if (!nameEdited && customName === initialName) {
      setCustomName("Barragem Personalizada");
    }
    const parts = raw.split(",");
    if (parts.length === 2) {
      const p1 = parts[0].trim();
      const p2 = parts[1].trim();
      const n1 = Number(p1);
      const n2 = Number(p2);
      const looksLikePair =
        /\s/.test(parts[1]) ||
        p1.includes(".") ||
        p2.includes(".") ||
        p2.startsWith("-") ||
        p2.startsWith("+");
      if (
        looksLikePair &&
        p1 !== "" &&
        p2 !== "" &&
        Number.isFinite(n1) &&
        Number.isFinite(n2) &&
        n1 >= -90 &&
        n1 <= 90 &&
        n2 >= -180 &&
        n2 <= 180
      ) {
        setCustomLat(p1);
        setCustomLon(p2);
        return;
      }
    }
    setCustomLat(raw);
  };

  const handleLonChange = (raw: string) => {
    setCoordsEdited(true);
    if (!nameEdited && customName === initialName) {
      setCustomName("Barragem Personalizada");
    }
    setCustomLon(raw);
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
    validationMessage = "Latitude inválida (intervalo permitido: -90 a 90).";
  } else if (!isLonValid) {
    validationMessage = "Longitude inválida (intervalo permitido: -180 a 180).";
  }

  return (
    <section
      aria-label="Parâmetros de alvo e período"
      className="bg-[#0a0d12] border-b border-[#222933]"
    >
      <div className="max-w-[1640px] mx-auto px-4 lg:px-6 py-2 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="flex items-center gap-1.5 bg-[#131820] px-2.5 py-1 rounded-md border border-[#222933] text-xs focus-within:border-[#3b9eeb]">
              <span className="text-[#8a96a8]">Alvo</span>
              <input
                type="text"
                aria-label="Nome do Local"
                data-testid="custom-name-input"
                value={customName}
                onChange={(e) => {
                  setCoordsEdited(true);
                  setNameEdited(true);
                  setCustomName(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Nome do local"
                className="bg-transparent text-[#eef2f6] placeholder:text-[#687588] w-36 sm:w-44 focus:outline-none"
              />
            </label>

            <label className="flex items-center gap-1.5 bg-[#131820] px-2 py-1 rounded-md border border-[#222933] text-xs focus-within:border-[#3b9eeb]">
              <span className="text-[#8a96a8]">Lat</span>
              <input
                type="text"
                inputMode="decimal"
                aria-label="Latitude"
                data-testid="custom-lat-input"
                value={customLat}
                onChange={(e) => handleLatChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="-19.9419"
                className={`bg-transparent font-mono tabular-nums w-[72px] focus:outline-none ${
                  isLatValid ? "text-[#eef2f6]" : "text-[#fda4af]"
                }`}
              />
            </label>

            <label className="flex items-center gap-1.5 bg-[#131820] px-2 py-1 rounded-md border border-[#222933] text-xs focus-within:border-[#3b9eeb]">
              <span className="text-[#8a96a8]">Lon</span>
              <input
                type="text"
                inputMode="decimal"
                aria-label="Longitude"
                data-testid="custom-lon-input"
                value={customLon}
                onChange={(e) => handleLonChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="-43.5997"
                className={`bg-transparent font-mono tabular-nums w-[72px] focus:outline-none ${
                  isLonValid ? "text-[#eef2f6]" : "text-[#fda4af]"
                }`}
              />
            </label>

            <label className="flex items-center gap-1.5 bg-[#131820] px-2 py-1 rounded-md border border-[#222933] text-xs focus-within:border-[#3b9eeb]">
              <span className="text-[#8a96a8]">De</span>
              <input
                type="date"
                aria-label="Data de início"
                data-testid="start-date-input"
                value={sDate}
                onChange={(e) => {
                  setSDate(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                className="bg-transparent font-mono tabular-nums text-[#eef2f6] focus:outline-none w-[112px]"
              />
            </label>

            <label className="flex items-center gap-1.5 bg-[#131820] px-2 py-1 rounded-md border border-[#222933] text-xs focus-within:border-[#3b9eeb]">
              <span className="text-[#8a96a8]">Até</span>
              <input
                type="date"
                aria-label="Data de fim"
                data-testid="end-date-input"
                value={eDate}
                onChange={(e) => {
                  setEDate(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                className="bg-transparent font-mono tabular-nums text-[#eef2f6] focus:outline-none w-[112px]"
              />
            </label>

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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#131820] hover:bg-[#1a222d] border border-[#313b49] disabled:opacity-40 disabled:cursor-not-allowed text-[#eef2f6] font-medium text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshIcon className="w-3.5 h-3.5 text-[#8a96a8]" />
              <span>{loading ? "Processando..." : "Atualizar"}</span>
            </button>

            <button
              type="button"
              data-testid="search-custom-btn"
              disabled={!canSearchCustom}
              onClick={triggerCustomSearch}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#3b9eeb] hover:bg-[#57aff0] disabled:opacity-40 disabled:cursor-not-allowed text-[#08111b] font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <CrosshairIcon className="w-3.5 h-3.5" />
              <span>Analisar</span>
            </button>
          </div>

          {meta && <DataSourceBadges meta={meta} />}
        </div>

        {validationMessage && (
          <div
            role="alert"
            data-testid="search-validation-error"
            className="inline-flex items-center gap-1.5 text-xs text-[#fda4af]"
          >
            <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{validationMessage}</span>
          </div>
        )}
      </div>
    </section>
  );
}
