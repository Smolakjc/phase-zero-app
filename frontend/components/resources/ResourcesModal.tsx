"use client";

import React, { useState } from "react";
import { CHALLENGE_RESOURCES, ChallengeResource } from "@phase-zero/shared";
import { ExternalLinkIcon, XIcon, CheckCircleIcon, BookOpenIcon } from "../icons/SurveyIcons";

export interface ResourcesModalProps {
  open: boolean;
  activeLat?: number;
  activeLon?: number;
  startDate?: string;
  endDate?: string;
  onClose: () => void;
}

export function ResourcesModal({
  open,
  activeLat,
  activeLon,
  startDate,
  endDate,
  onClose,
}: ResourcesModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  if (!open) return null;

  const categories = [
    { id: "ALL", label: "Todos os Recursos" },
    { id: "NASA Data & Resources", label: "NASA Data" },
    { id: "Canadian Space Agency (CSA)", label: "Agência Espacial Canadense (CSA)" },
    { id: "Space Agency Partner Resources", label: "Agências Parceiras & Estatística" },
  ];

  const filtered =
    selectedCategory === "ALL"
      ? CHALLENGE_RESOURCES
      : CHALLENGE_RESOURCES.filter((r) => r.category === selectedCategory);

  const getDynamicUrl = (res: ChallengeResource): string => {
    if (res.id === "nasa-giovanni" && activeLat != null && activeLon != null) {
      const minLon = (activeLon - 0.15).toFixed(3);
      const maxLon = (activeLon + 0.15).toFixed(3);
      const minLat = (activeLat - 0.15).toFixed(3);
      const maxLat = (activeLat + 0.15).toFixed(3);
      const s = startDate ?? "2026-03-01";
      const e = endDate ?? "2026-09-15";
      return `https://giovanni.gsfc.nasa.gov/giovanni/#service=TmAvMp&starttime=${s}&endtime=${e}&bbox=${minLon},${minLat},${maxLon},${maxLat}`;
    }
    return res.url;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resources-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0e1218] border border-[#254d73] rounded-lg shadow-2xl flex flex-col text-[#eef2f6] overflow-hidden">
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222933] bg-[#10151d]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-md bg-[#132538] text-[#3b9eeb]">
              <BookOpenIcon className="w-5 h-5" />
            </span>
            <div>
              <h2 id="resources-modal-title" className="text-base font-bold text-[#eef2f6]">
                Recursos Oficiais NASA, CSA & Parceiros
              </h2>
              <p className="text-xs text-[#8a96a8]">
                Mapeamento dos dados e referências metodológicas exigidas pelo desafio integradas ao PHASE-ZERO.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-1.5 rounded-md text-[#8a96a8] hover:text-[#eef2f6] hover:bg-[#1f2835] transition-colors cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros de Categoria */}
        <div className="px-6 py-2.5 border-b border-[#222933] bg-[#0a0d12] flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === c.id
                  ? "bg-[#3b9eeb] text-[#08111b] font-bold"
                  : "bg-[#131820] text-[#a1adbf] hover:text-[#eef2f6] border border-[#222933]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Lista de Recursos com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="p-3.5 rounded-md bg-[#0d2016] border border-[#1f5e39] text-xs text-[#86efac] flex items-start gap-2.5">
            <CheckCircleIcon className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Garantia de Conformidade com o Desafio:</span> O PHASE-ZERO
              adota e referencia diretamente a cadeia metodológica oficial, aplicando InSAR (CSA Tutorial & RCM),
              testes de significância de tendências (Mann-Kendall, Kriss & Statsig), cota de reservatórios (SWOT) e
              dados hidrológicos orbitais (Giovanni, Hydrology Time Series & AppEEARS).
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filtered.map((item) => {
              const dynUrl = getDynamicUrl(item);
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-lg bg-[#131820] border border-[#222933] hover:border-[#3b9eeb]/50 transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10151d] text-[#3b9eeb] border border-[#254d73]">
                        {item.category}
                      </span>
                      <a
                        href={dynUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#3b9eeb] hover:underline shrink-0"
                      >
                        <span>Acessar</span>
                        <ExternalLinkIcon className="w-3 h-3" />
                      </a>
                    </div>
                    <h3 className="text-sm font-bold text-[#eef2f6] leading-snug">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#8a96a8] leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-[#1e2530] text-xs">
                    <span className="text-[11px] font-semibold text-[#86efac] block mb-0.5">
                      Como é usado no PHASE-ZERO:
                    </span>
                    <p className="text-[11px] text-[#cbd5e1] leading-relaxed">
                      {item.howUsed}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer do Modal */}
        <div className="px-6 py-3 border-t border-[#222933] bg-[#10151d] flex items-center justify-between text-xs text-[#8a96a8]">
          <span>Total de {CHALLENGE_RESOURCES.length} recursos catalogados</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#1f2835] hover:bg-[#2b3749] text-[#eef2f6] font-medium transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
