"use client";

import React, { useState } from "react";
import {
  AppeearsThermoPluvioAnalysis,
  CorrelatedDamCategory,
  MonthlyThermoPluvioData,
  THERMAL_SHOCK_FORMULA_EXPRESSION,
  THERMAL_SHOCK_STUDY_REFERENCE,
} from "@phase-zero/shared";
import { STATUS_CARD_CLASSES } from "../../lib/colors";
import {
  AlertOctagonIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
} from "../icons/SurveyIcons";

export interface AppeearsThermoPluvioPanelProps {
  analysis: AppeearsThermoPluvioAnalysis;
}

const CATEGORY_META: Record<
  CorrelatedDamCategory,
  { badge: string; className: string }
> = {
  collapsed_system: {
    badge: "Rompida",
    className: "pz-status-red",
  },
  critical_alert_system: {
    badge: "Alerta Nível 3",
    className: "pz-status-yellow",
  },
  external_proven_case: {
    badge: "Caso Real Externo",
    className:
      "bg-[var(--pz-accent-soft)] text-[var(--pz-accent)] border-[var(--pz-accent)]",
  },
};

function getMonthShockBadge(mVal: MonthlyThermoPluvioData): {
  label: string;
  className: string;
} {
  const level =
    mVal.thermal_shock_level ??
    (mVal.coupled_shock_index >= 38
      ? "SEVERE"
      : mVal.coupled_shock_index >= 20
        ? "MODERATE"
        : "NONE");

  if (level === "SEVERE") {
    return {
      label: `SIM · Choque em ${mVal.month_short}`,
      className: "pz-status-red",
    };
  }
  if (level === "MODERATE") {
    return {
      label: `POSSÍVEL · Moderado em ${mVal.month_short}`,
      className: "pz-status-yellow",
    };
  }
  return {
    label: "NÃO · Sem Choque",
    className: "pz-status-green",
  };
}

function getYearShockBadge(maxIndex: number, shockMonthsCount: number): {
  label: string;
  className: string;
} {
  if (maxIndex >= 38) {
    return {
      label: `SIM · Choque Crítico (${shockMonthsCount}/12m)`,
      className: "pz-status-red",
    };
  }
  if (maxIndex >= 20 || shockMonthsCount > 0) {
    return {
      label: `POSSÍVEL · Moderado (${shockMonthsCount}/12m)`,
      className: "pz-status-yellow",
    };
  }
  return {
    label: "NÃO · Sem Choque",
    className: "pz-status-green",
  };
}

type DetailTab = "history" | "correlations" | "methodology";

export function AppeearsThermoPluvioPanel({
  analysis,
}: AppeearsThermoPluvioPanelProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("history");
  const [damCategoryFilter, setDamCategoryFilter] = useState<
    "all" | CorrelatedDamCategory
  >("all");

  const m = analysis.current_or_predicted_metrics;
  const b = analysis.five_year_baseline;
  const totalYears = b.historical_windows.length;

  // Inicia com os anos recolhidos para visualização rápida e enxuta
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleAllYears = () => {
    if (expandedYears.size === totalYears) {
      setExpandedYears(new Set());
    } else {
      setExpandedYears(new Set(b.historical_windows.map((w) => w.year)));
    }
  };

  const filteredCorrelations = analysis.correlated_dams.filter(
    (d) => damCategoryFilter === "all" || d.category === damCategoryFilter,
  );

  const targetMonthLabel = analysis.target_month_label ?? "Mês Consultado";
  const studyRef = analysis.study_reference ?? THERMAL_SHOCK_STUDY_REFERENCE;
  const formulaExpr =
    analysis.formula_expression ?? THERMAL_SHOCK_FORMULA_EXPRESSION;
  const thermalFactor = m.thermal_factor ?? 1.0;
  const pluvioFactor = m.pluvio_factor ?? 1.0;
  const possibleShock =
    m.possible_thermal_shock ?? m.thermo_pluvio_shock_index >= 20;
  const shockLevel =
    m.thermal_shock_level ??
    (m.thermo_pluvio_shock_index >= 38
      ? "SEVERE"
      : m.thermo_pluvio_shock_index >= 20
        ? "MODERATE"
        : "NONE");

  return (
    <section
      data-testid="appeears-thermo-pluvio-panel"
      aria-label="Cálculo Mensal de Choque Térmico: Temperatura e Índice Pluviométrico"
      className="rounded-2xl bg-[var(--pz-surface)] border border-[var(--pz-border)] p-3.5 space-y-3 transition-all"
    >
      {/* Faixa Executiva Enxuta: Veredito + KPIs Essenciais + Botão de Divulgação Progressiva */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Veredito e Identificação */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            data-testid="appeears-verdict-banner"
            data-danger-tier={analysis.danger_tier}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 shrink-0 ${STATUS_CARD_CLASSES[analysis.danger_tier]}`}
          >
            {analysis.danger_tier === "RED" ? (
              <AlertOctagonIcon className="w-4 h-4 text-[var(--pz-danger-ink)] shrink-0" />
            ) : analysis.danger_tier === "YELLOW" ? (
              <AlertTriangleIcon className="w-4 h-4 text-[var(--pz-warn-ink)] shrink-0" />
            ) : (
              <CheckCircleIcon className="w-4 h-4 text-[var(--pz-ok-ink)] shrink-0" />
            )}
            <span
              data-testid="appeears-verdict-short"
              className="text-xs font-bold whitespace-nowrap"
            >
              {analysis.verdict_short}
            </span>
          </div>

          <div className="min-w-0">
            <h3
              data-testid="appeears-core-question"
              className="text-xs sm:text-sm font-semibold text-[var(--pz-text)] truncate"
              title={analysis.core_question}
            >
              Choque Hidrotermal em {targetMonthLabel}: {analysis.core_question}
            </h3>
            <p className="text-[11px] text-[var(--pz-muted)] truncate">
              {analysis.verdict_summary}
            </p>
          </div>
        </div>

        {/* 4 Métricas Chave em Linha Limpa + Gatilho de Expansão */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[var(--pz-border)]">
          <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
            <div className="text-left">
              <span className="text-[10px] text-[var(--pz-muted)] block font-sans" title="Maior queda térmica contínua em janela curta de 24h a 48h">Queda ΔT (24h–48h)</span>
              <span data-testid="appeears-metric-drop" className="font-bold text-[var(--pz-text)]">
                {m.max_hot_to_cold_drop_c}°C
              </span>
            </div>

            <div className="h-6 w-px bg-[var(--pz-border)]" aria-hidden="true" />

            <div className="text-left">
              <span className="text-[10px] text-[var(--pz-muted)] block font-sans">Chuva</span>
              <span data-testid="appeears-metric-precip" className="font-bold text-[var(--pz-text)]">
                {m.precip_total_mm} mm
              </span>
            </div>

            <div className="h-6 w-px bg-[var(--pz-border)]" aria-hidden="true" />

            <div className="text-left">
              <span className="text-[10px] text-[var(--pz-muted)] block font-sans">Índice I_CT</span>
              <span data-testid="appeears-metric-shock" className="font-bold text-[var(--pz-accent)]">
                {m.thermo_pluvio_shock_index} <span className="text-[10px] text-[var(--pz-muted)]">/ 100</span>
              </span>
            </div>

            <div className="h-6 w-px bg-[var(--pz-border)]" aria-hidden="true" />

            <div className="text-left">
              <span className="text-[10px] text-[var(--pz-muted)] block font-sans">Choque</span>
              <span data-testid="appeears-metric-5y-same" className="font-bold text-[var(--pz-text)]">
                {shockLevel === "SEVERE"
                  ? "Crítico"
                  : shockLevel === "MODERATE" || possibleShock
                    ? "Possível"
                    : "Normal"}
              </span>
            </div>
          </div>

          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--pz-well)] hover:bg-[var(--pz-accent-soft)] text-[var(--pz-secondary)] hover:text-[var(--pz-text)] border border-[var(--pz-border)] text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>{isExpanded ? "Recolher detalhes" : "Ver histórico e fórmula"}</span>
            <ChevronDownIcon
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Seção Detalhada (Progressive Disclosure) */}
      <div className={isExpanded ? "space-y-3 pt-3 border-t border-[var(--pz-border)]" : "hidden"}>
        {/* Abas Internas de Navegação */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="tablist"
            aria-label="Detalhes da análise hidrotermal"
            className="inline-flex rounded-full p-0.5 bg-[var(--pz-well)] border border-[var(--pz-border)]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "history"}
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "history"
                  ? "bg-[var(--pz-accent)] text-[var(--pz-accent-ink)]"
                  : "text-[var(--pz-muted)] hover:text-[var(--pz-text)]"
              }`}
            >
              Histórico ({totalYears} Anos)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "correlations"}
              onClick={() => setActiveTab("correlations")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "correlations"
                  ? "bg-[var(--pz-accent)] text-[var(--pz-accent-ink)]"
                  : "text-[var(--pz-muted)] hover:text-[var(--pz-text)]"
              }`}
            >
              Casos Correlatos ({filteredCorrelations.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "methodology"}
              onClick={() => setActiveTab("methodology")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "methodology"
                  ? "bg-[var(--pz-accent)] text-[var(--pz-accent-ink)]"
                  : "text-[var(--pz-muted)] hover:text-[var(--pz-text)]"
              }`}
            >
              Fórmula & Metodologia
            </button>
          </div>

          {activeTab === "history" && (
            <button
              type="button"
              data-testid="toggle-all-months-btn"
              onClick={toggleAllYears}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[var(--pz-well)] hover:bg-[var(--pz-accent-soft)] text-[var(--pz-secondary)] hover:text-[var(--pz-text)] border border-[var(--pz-border)] transition-colors cursor-pointer"
            >
              {expandedYears.size === totalYears ? "Recolher Todos os Meses" : "Expandir Todos os Meses"}
            </button>
          )}
        </div>

        {/* Tab 1: Histórico de 15 Anos */}
        <div className={activeTab === "history" ? "space-y-2" : "hidden"}>
          <div className="overflow-x-auto rounded-xl border border-[var(--pz-border)] bg-[var(--pz-surface)]">
            <table
              data-testid="five-year-comparison-table"
              className="w-full text-left border-collapse text-[11px]"
            >
              <thead>
                <tr className="border-b border-[var(--pz-border)] bg-[var(--pz-well)]/50 text-[var(--pz-muted)]">
                  <th className="py-2 px-3 font-semibold">Ano</th>
                  <th className="py-2 px-2 font-semibold" title="Temperatura média anual com amplitude entre os vales e picos das frentes">Temp. Média</th>
                  <th className="py-2 px-2 font-semibold" title="Maior queda térmica contínua em janela curta de 24h a 48h registrada no ano">Maior Queda ΔT (24h–48h)</th>
                  <th className="py-2 px-2 font-semibold">Precipitação Total</th>
                  <th className="py-2 px-2 font-semibold">Pico I_CT</th>
                  <th className="py-2 px-2 font-semibold">Meses c/ Choque</th>
                  <th className="py-2 px-3 font-semibold">Veredito do Ano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pz-border)] font-mono tabular-nums">
                {b.historical_windows.map((w) => {
                  const isYearExpanded = expandedYears.has(w.year);
                  const shockMonthsList =
                    w.shock_months_names ??
                    (w.monthly_breakdown
                      ? w.monthly_breakdown
                          .filter((mItem) => mItem.coupled_shock_index >= 20)
                          .map((mItem) => mItem.month_short)
                      : []);
                  const shockMonthsCount =
                    w.shock_months_count ?? shockMonthsList.length;
                  const yearBadge = getYearShockBadge(
                    w.coupled_shock_index,
                    shockMonthsCount,
                  );

                  return (
                    <React.Fragment key={w.year}>
                      <tr
                        className={`hover:bg-[var(--pz-well)]/40 transition-colors ${
                          isYearExpanded ? "bg-[var(--pz-well)]/30" : ""
                        }`}
                      >
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            data-testid={`toggle-year-${w.year}`}
                            aria-expanded={isYearExpanded}
                            onClick={() => toggleYear(w.year)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-[var(--pz-well)] border border-transparent hover:border-[var(--pz-border)] text-left transition-colors cursor-pointer group"
                          >
                            <span className="font-bold text-[var(--pz-text)]">{w.year}</span>
                            <span className="text-[10px] font-mono text-[var(--pz-muted)] group-hover:text-[var(--pz-accent)]">
                              {isYearExpanded ? "▲ fechar" : "▼ 12 meses"}
                            </span>
                          </button>
                        </td>
                        <td className="py-2 px-2 text-[var(--pz-text)]">
                          {w.mean_temp_c}°C{" "}
                          <span className="text-[var(--pz-muted)] text-[10px]">
                            ({w.min_temp_c}°C a {w.max_temp_c}°C)
                          </span>
                        </td>
                        <td className="py-2 px-2 font-semibold text-[var(--pz-text)]">
                          {w.thermal_shock_drop_c}°C
                        </td>
                        <td className="py-2 px-2 text-[var(--pz-text)]">
                          {w.precip_total_mm} mm
                        </td>
                        <td className="py-2 px-2 font-bold text-[var(--pz-accent)]">
                          {w.coupled_shock_index}
                        </td>
                        <td className="py-2 px-2 font-sans text-[var(--pz-text)]">
                          {shockMonthsList.length > 0 ? (
                            <span className="font-semibold text-[10px]">
                              {shockMonthsList.join(", ")} ({shockMonthsCount}/12)
                            </span>
                          ) : (
                            <span className="text-[var(--pz-muted)] text-[10px]">0 de 12</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-sans">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${yearBadge.className}`}
                          >
                            {yearBadge.label}
                          </span>
                        </td>
                      </tr>

                      {isYearExpanded && w.monthly_breakdown && (
                        <tr key={`${w.year}-monthly`} className="bg-[var(--pz-well)]/20">
                          <td colSpan={7} className="p-2.5">
                            <div className="rounded-lg border border-[var(--pz-border)] bg-[var(--pz-surface)] p-2.5 space-y-2">
                              <div className="text-xs font-bold text-[var(--pz-text)] pb-1 border-b border-[var(--pz-border)]">
                                Breakdown Mensal de {w.year} (Jan–Dez)
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-[10px]">
                                  <thead>
                                    <tr className="border-b border-[var(--pz-border)] text-[var(--pz-muted)]">
                                      <th className="py-1 px-1.5 font-semibold">Mês</th>
                                      <th className="py-1 px-1.5 font-semibold whitespace-nowrap" title="Temperatura média de todos os dias do mês">Temp. Média</th>
                                      <th className="py-1 px-1.5 font-semibold whitespace-nowrap" title="Temperatura no início e término da maior queda contínua em janela de 24h a 48h (passagem de frente fria)">Início → Fim (24h–48h)</th>
                                      <th className="py-1 px-1.5 font-semibold whitespace-nowrap" title="Maior salto térmico contínuo em janela curta de 24h a 48h sem reaquecimento intermediário">Queda ΔT (24h–48h)</th>
                                      <th className="py-1 px-1.5 font-semibold whitespace-nowrap" title="Precipitação total acumulada no mês inteiro">Chuva Total</th>
                                      <th className="py-1 px-1.5 font-semibold whitespace-nowrap" title="Maior volume de chuva diária registrado no mês (24h)">Pico Chuva 24h</th>
                                      <th className="py-1 px-1.5 font-semibold">I_CT</th>
                                      <th className="py-1 px-1.5 font-semibold">Veredito</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--pz-border)] font-mono tabular-nums">
                                    {w.monthly_breakdown.map((mVal) => {
                                      const mBadge = getMonthShockBadge(mVal);
                                      return (
                                        <tr key={mVal.month} className="hover:bg-[var(--pz-well)]/50">
                                          <td className="py-1 px-1.5 font-bold font-sans text-[var(--pz-text)]">
                                            {mVal.month_short}
                                          </td>
                                          <td className="py-1 px-1.5 text-[var(--pz-text)]" title="Temperatura média de todos os dias do mês">
                                            {mVal.mean_temp_c}°C
                                          </td>
                                          <td className="py-1 px-1.5 text-[var(--pz-muted)]" title="Pico inicial e vale final da maior queda contínua em 24h–48h">
                                            {mVal.max_temp_c}° → {mVal.min_temp_c}°
                                          </td>
                                          <td className="py-1 px-1.5 font-semibold text-[var(--pz-text)]" title="Maior queda contínua em 24h a 48h (termo da fórmula I_CT)">
                                            {mVal.thermal_shock_drop_c}°C
                                          </td>
                                          <td className="py-1 px-1.5 font-semibold text-[var(--pz-text)]">
                                            {mVal.precip_total_mm} mm
                                          </td>
                                          <td className="py-1 px-1.5 text-[var(--pz-muted)]">
                                            {mVal.precip_max_daily_mm} mm/d
                                          </td>
                                          <td className="py-1 px-1.5 font-bold text-[var(--pz-accent)]">
                                            {mVal.coupled_shock_index}
                                          </td>
                                          <td className="py-1 px-1.5 font-sans">
                                            <span
                                              className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] font-semibold border whitespace-nowrap ${mBadge.className}`}
                                            >
                                              {mBadge.label}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-[var(--pz-muted)] font-mono leading-relaxed px-1">
            {b.discrepancy_explanation}
          </p>
        </div>

        {/* Tab 2: Casos Correlatos */}
        <div className={activeTab === "correlations" ? "space-y-2.5" : "hidden"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-[var(--pz-muted)]">
              Comparação da queda térmica (ΔT) e índice pluviométrico com eventos documentados:
            </span>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar eventos">
              {(
                [
                  { id: "all", label: "Todas" },
                  { id: "collapsed_system", label: "Rompidas" },
                  { id: "critical_alert_system", label: "Alerta Nível 3" },
                  { id: "external_proven_case", label: "Casos Reais" },
                ] as const
              ).map((flt) => (
                <button
                  key={flt.id}
                  type="button"
                  onClick={() => setDamCategoryFilter(flt.id)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer transition-colors ${
                    damCategoryFilter === flt.id
                      ? "bg-[var(--pz-accent)] text-[var(--pz-accent-ink)] border-[var(--pz-accent)]"
                      : "bg-[var(--pz-well)] text-[var(--pz-muted)] border-[var(--pz-border)] hover:text-[var(--pz-text)]"
                  }`}
                >
                  {flt.label}
                </button>
              ))}
            </div>
          </div>

          <div
            data-testid="correlated-dams-list"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2"
          >
            {filteredCorrelations.map((ev) => {
              const catMeta = CATEGORY_META[ev.category];
              return (
                <article
                  key={ev.dam_id}
                  className="p-2.5 rounded-xl bg-[var(--pz-well)] border border-[var(--pz-border)] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-[var(--pz-text)] truncate">
                      {ev.dam_name}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold border shrink-0 ${catMeta.className}`}
                    >
                      {catMeta.badge}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--pz-secondary)]">
                    <span>Similaridade:</span>
                    <span className="font-bold text-[var(--pz-accent)]">
                      {ev.similarity_score_pct}%
                    </span>
                  </div>

                  <div className="text-[10px] font-mono tabular-nums text-[var(--pz-muted)] flex items-center justify-between">
                    <span>Queda: {ev.recorded_thermal_drop_c}°C</span>
                    <span>Chuva: {ev.recorded_precip_mm} mm</span>
                  </div>

                  <div className="text-[9px] font-mono text-[var(--pz-muted)] truncate" title={ev.external_source_ref}>
                    Ref: {ev.external_source_ref}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Tab 3: Fórmula & Metodologia */}
        <div
          data-testid="appeears-formula-box"
          className={activeTab === "methodology" ? "p-3 rounded-xl bg-[var(--pz-well)] border border-[var(--pz-border)] space-y-2 text-xs" : "hidden"}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-[var(--pz-text)] block">
                Índice Heurístico de Triagem Hidrotermal (Proxy THM Orbital)
              </span>
              <span className="text-[11px] text-[var(--pz-muted)]">
                Literatura: {studyRef}
              </span>
            </div>
            <code className="px-2.5 py-1 rounded-lg bg-[var(--pz-surface)] border border-[var(--pz-border)] text-xs font-mono font-bold text-[var(--pz-accent)] self-start sm:self-auto">
              {formulaExpr}
            </code>
          </div>

          <div className="pt-2 border-t border-[var(--pz-border)] text-[11px] font-mono space-y-1">
            <div className="text-[var(--pz-secondary)]">
              Aplicação em {targetMonthLabel}:{" "}
              <span className="text-[var(--pz-text)] font-semibold">
                {m.formula_calculation ??
                  `F_T=${thermalFactor} × F_P=${pluvioFactor} × 52 = ${m.thermo_pluvio_shock_index}/100`}
              </span>
            </div>
            <div className="text-[var(--pz-muted)]">
              Limiares: I_CT &lt; 20 (Sem Choque) · 20 a 37.9 (Possível) · ≥ 38 (Crítico)
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
