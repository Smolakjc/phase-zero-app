"use client";

import React, { useState } from "react";
import {
  AppeearsThermoPluvioAnalysis,
  CorrelatedDamCategory,
  FiveYearDiscrepancyDirection,
} from "@phase-zero/shared";
import { STATUS_CARD_CLASSES } from "../../lib/colors";
import {
  AlertOctagonIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from "../icons/SurveyIcons";

export interface AppeearsThermoPluvioPanelProps {
  analysis: AppeearsThermoPluvioAnalysis;
}

const DIRECTION_BADGE: Record<
  FiveYearDiscrepancyDirection,
  { label: string; className: string }
> = {
  null_expected: {
    label: "Quase Nula (Esperado)",
    className: "pz-status-green",
  },
  positive_surplus: {
    label: "Discrepância (+) p/ Mais",
    className: "pz-status-yellow",
  },
  negative_deficit: {
    label: "Discrepância (-) p/ Menos",
    className: "pz-status-yellow",
  },
  thermal_inversion_rain: {
    label: "Choque Quente-Frio + Chuva",
    className: "pz-status-red",
  },
};

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

function formatSigned(val: number, unit: string): string {
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}${unit}`;
}

export function AppeearsThermoPluvioPanel({
  analysis,
}: AppeearsThermoPluvioPanelProps) {
  const [damCategoryFilter, setDamCategoryFilter] = useState<
    "all" | CorrelatedDamCategory
  >("all");
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  const m = analysis.current_or_predicted_metrics;
  const b = analysis.five_year_baseline;
  const totalYears = b.historical_windows.length;

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

  return (
    <section
      data-testid="appeears-thermo-pluvio-panel"
      aria-label="Análise NASA AppEEARS: Relação Temperatura e Índice Pluviométrico"
      className="rounded-2xl bg-[var(--pz-well)] border border-[var(--pz-border)] p-4 space-y-4"
    >
      {/* Cabeçalho com a Pergunta Central */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--pz-border)]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[var(--pz-accent-soft)] text-[var(--pz-accent)] border border-[var(--pz-border)]">
              NASA AppEEARS MODIS LST + Chuva
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[var(--pz-surface)] text-[var(--pz-text)] border border-[var(--pz-border)]">
              Série Máxima: {totalYears} Anos Analisados
            </span>
          </div>

          <h3
            data-testid="appeears-core-question"
            className="text-base sm:text-lg font-bold text-[var(--pz-text)] tracking-tight pt-0.5"
          >
            {analysis.core_question}
          </h3>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-[var(--pz-muted)] block font-mono">
            {b.years_analyzed[0]} a {b.years_analyzed[b.years_analyzed.length - 1]}
          </span>
          <span className="text-xs font-semibold text-[var(--pz-secondary)]">
            Discrepância na Série: {b.discrepancy_score}/100
          </span>
        </div>
      </div>

      {/* Veredito Direto Baseado nos Dados */}
      <div
        data-testid="appeears-verdict-banner"
        data-danger-tier={analysis.danger_tier}
        className={`p-3.5 rounded-xl border ${STATUS_CARD_CLASSES[analysis.danger_tier]}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-bold">
            {analysis.danger_tier === "RED" ? (
              <AlertOctagonIcon className="w-4 h-4 text-[var(--pz-danger-ink)] shrink-0" />
            ) : analysis.danger_tier === "YELLOW" ? (
              <AlertTriangleIcon className="w-4 h-4 text-[var(--pz-warn-ink)] shrink-0" />
            ) : (
              <CheckCircleIcon className="w-4 h-4 text-[var(--pz-ok-ink)] shrink-0" />
            )}
            <span data-testid="appeears-verdict-short">{analysis.verdict_short}</span>
          </div>
        </div>
        <p className="text-xs mt-1.5 leading-relaxed opacity-95">
          {analysis.verdict_summary}
        </p>
      </div>

      {/* Indicadores Principais da Análise */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-[var(--pz-surface)] border border-[var(--pz-border)]">
          <span className="text-[11px] text-[var(--pz-muted)] block">
            Queda Quente → Frio (ΔT)
          </span>
          <span
            data-testid="appeears-metric-drop"
            className="text-sm font-mono tabular-nums font-bold text-[var(--pz-text)] mt-0.5 block"
          >
            {m.max_hot_to_cold_drop_c}°C
          </span>
          <span className="text-[10px] text-[var(--pz-muted)] mt-0.5 block">
            Pico {m.peak_hot_temp_c}°C · Vale {m.trough_cold_temp_c}°C
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[var(--pz-surface)] border border-[var(--pz-border)]">
          <span className="text-[11px] text-[var(--pz-muted)] block">
            Índice Pluviométrico
          </span>
          <span
            data-testid="appeears-metric-precip"
            className="text-sm font-mono tabular-nums font-bold text-[var(--pz-text)] mt-0.5 block"
          >
            {m.precip_total_mm} mm
          </span>
          <span className="text-[10px] text-[var(--pz-muted)] mt-0.5 block">
            Máx 24h: {m.precip_max_daily_mm} mm/d
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[var(--pz-surface)] border border-[var(--pz-border)]">
          <span className="text-[11px] text-[var(--pz-muted)] block">
            Choque Térmico + Chuva
          </span>
          <span
            data-testid="appeears-metric-shock"
            className="text-sm font-mono tabular-nums font-bold text-[var(--pz-accent)] mt-0.5 block"
          >
            {m.thermo_pluvio_shock_index} / 100
          </span>
          <span className="text-[10px] text-[var(--pz-muted)] mt-0.5 block">
            Fator de fissuramento e saturação
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[var(--pz-surface)] border border-[var(--pz-border)]">
          <span className="text-[11px] text-[var(--pz-muted)] block">
            Desvio Médio ({totalYears} Anos)
          </span>
          <span
            data-testid="appeears-metric-5y-same"
            className="text-sm font-mono tabular-nums font-bold text-[var(--pz-text)] mt-0.5 block"
          >
            ±{b.mean_abs_temp_diff_5y_c}°C | ±{b.mean_abs_precip_diff_5y_mm} mm
          </span>
          <span className="text-[10px] text-[var(--pz-muted)] mt-0.5 block">
            {b.happened_same_thing_in_5_years
              ? "Diferença Quase Nula"
              : "Discrepância Detectada"}
          </span>
        </div>
      </div>

      {/* Tabela com Todos os Anos Analisados e Seus Dados */}
      <div className="space-y-2.5 p-3.5 rounded-xl bg-[var(--pz-surface)] border border-[var(--pz-border)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-[var(--pz-text)]">
              Todos os Anos Analisados ({totalYears} Anos) · Avaliação Mês a Mês
            </h4>
            <p className="text-[11px] text-[var(--pz-muted)]">
              Média histórica da série: Temperatura {b.expected_mean_temp_c}°C · Queda térmica {b.expected_hot_to_cold_drop_c}°C · Chuva {b.expected_precip_total_mm} mm
            </p>
          </div>
          <button
            type="button"
            data-testid="toggle-all-months-btn"
            onClick={toggleAllYears}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[var(--pz-well)] hover:bg-[var(--pz-accent-soft)] text-[var(--pz-secondary)] hover:text-[var(--pz-text)] border border-[var(--pz-border)] transition-colors cursor-pointer"
          >
            {expandedYears.size === totalYears ? "Recolher Todos os Meses" : "Expandir Todos os Meses"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table
            data-testid="five-year-comparison-table"
            className="w-full text-left border-collapse text-[11px]"
          >
            <thead>
              <tr className="border-b border-[var(--pz-border)] text-[var(--pz-muted)]">
                <th className="py-2 pr-2 font-semibold">Ano</th>
                <th className="py-2 px-2 font-semibold">Temp. Média</th>
                <th className="py-2 px-2 font-semibold">Pico / Mínima</th>
                <th className="py-2 px-2 font-semibold">Queda Quente-Frio (ΔT)</th>
                <th className="py-2 px-2 font-semibold">Chuva Total</th>
                <th className="py-2 px-2 font-semibold">Chuva Máx 24h</th>
                <th className="py-2 px-2 font-semibold">Dif. p/ Média (Mais/Menos)</th>
                <th className="py-2 pl-2 font-semibold">Comportamento (Maioria dos Meses)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--pz-border)] font-mono tabular-nums">
              {b.historical_windows.map((w) => {
                const badge = DIRECTION_BADGE[w.discrepancy_direction];
                const isExpanded = expandedYears.has(w.year);
                const behaviorLabel = w.dominant_monthly_behavior || badge.label;
                const peakMonth =
                  w.monthly_breakdown && w.monthly_breakdown.length > 0
                    ? w.monthly_breakdown.reduce(
                        (max, m) =>
                          m.coupled_shock_index > max.coupled_shock_index ? m : max,
                        w.monthly_breakdown[0]
                      )
                    : null;
                return (
                  <React.Fragment key={w.year}>
                    <tr
                      className={`hover:bg-[var(--pz-well)]/60 transition-colors ${
                        isExpanded ? "bg-[var(--pz-well)]/40" : ""
                      }`}
                    >
                      <td className="py-2 pr-2">
                        <button
                          type="button"
                          data-testid={`toggle-year-${w.year}`}
                          aria-expanded={isExpanded}
                          onClick={() => toggleYear(w.year)}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-[var(--pz-surface)] border border-transparent hover:border-[var(--pz-border)] text-left transition-colors cursor-pointer group"
                        >
                          <span className="font-bold text-[var(--pz-text)]">{w.year}</span>
                          <span className="text-[10px] font-mono text-[var(--pz-muted)] group-hover:text-[var(--pz-accent)]">
                            {isExpanded ? "▲ recolher" : "▼ 12 meses"}
                          </span>
                        </button>
                      </td>
                      <td className="py-2 px-2 text-[var(--pz-text)]">
                        {w.mean_temp_c}°C
                      </td>
                      <td className="py-2 px-2 text-[var(--pz-muted)]">
                        {w.max_temp_c}°C / {w.min_temp_c}°C
                      </td>
                      <td className="py-2 px-2 font-semibold text-[var(--pz-text)]">
                        {w.thermal_shock_drop_c}°C
                      </td>
                      <td className="py-2 px-2 text-[var(--pz-text)]">
                        {w.precip_total_mm} mm
                      </td>
                      <td className="py-2 px-2 text-[var(--pz-muted)]">
                        {w.precip_max_daily_mm} mm/d
                      </td>
                      <td className="py-2 px-2">
                        <span className="text-[var(--pz-text)]">
                          {formatSigned(w.temp_diff_from_baseline_c, "°C")} |{" "}
                          {formatSigned(w.precip_diff_from_baseline_mm, " mm")}
                        </span>
                      </td>
                      <td className="py-2 pl-2 font-sans">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${badge.className}`}
                        >
                          {behaviorLabel}
                        </span>
                      </td>
                    </tr>

                    {/* Detalhamento de Todos os 12 Meses do Ano (Expandir / Recolher) */}
                    {isExpanded && w.monthly_breakdown && (
                      <tr
                        key={`${w.year}-monthly`}
                        className="bg-[var(--pz-well)]/30 border-b border-[var(--pz-border)]"
                      >
                        <td colSpan={8} className="p-2.5 sm:p-3">
                          <div className="rounded-xl border border-[var(--pz-border)] bg-[var(--pz-surface)]/95 p-3 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[var(--pz-border)]">
                              <span className="text-xs font-bold text-[var(--pz-text)]">
                                Detalhamento dos 12 Meses de {w.year}
                              </span>
                              <div className="text-[11px] text-[var(--pz-muted)] flex flex-wrap items-center gap-3">
                                <span>
                                  Comportamento predominante:{" "}
                                  <strong className="text-[var(--pz-text)]">{behaviorLabel}</strong>
                                </span>
                                {peakMonth && (
                                  <span>
                                    Mês de maior choque:{" "}
                                    <strong className="text-[var(--pz-accent)]">
                                      {peakMonth.month_name} ({peakMonth.coupled_shock_index}/100)
                                    </strong>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-[10px]">
                                <thead>
                                  <tr className="border-b border-[var(--pz-border)]/60 text-[var(--pz-muted)]">
                                    <th className="py-1.5 pr-2 font-semibold">Mês</th>
                                    <th className="py-1.5 px-2 font-semibold">Período</th>
                                    <th className="py-1.5 px-2 font-semibold">Temp. Média</th>
                                    <th className="py-1.5 px-2 font-semibold">Pico / Mínima</th>
                                    <th className="py-1.5 px-2 font-semibold">Queda Térmica (ΔT)</th>
                                    <th className="py-1.5 px-2 font-semibold">Chuva Total</th>
                                    <th className="py-1.5 px-2 font-semibold">Chuva Máx 24h</th>
                                    <th className="py-1.5 px-2 font-semibold">Dif. p/ Média Mensal</th>
                                    <th className="py-1.5 px-2 font-semibold">Choque + Chuva</th>
                                    <th className="py-1.5 pl-2 font-semibold">Comportamento do Mês</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--pz-border)]/50 font-mono tabular-nums">
                                  {w.monthly_breakdown.map((mVal) => {
                                    const mBadge = DIRECTION_BADGE[mVal.discrepancy_direction];
                                    return (
                                      <tr key={mVal.month} className="hover:bg-[var(--pz-well)]/50">
                                        <td className="py-1.5 pr-2 font-bold text-[var(--pz-text)] font-sans">
                                          {mVal.month_name}
                                        </td>
                                        <td className="py-1.5 px-2 text-[var(--pz-muted)]">
                                          {mVal.start_date.slice(5)} a {mVal.end_date.slice(5)}
                                        </td>
                                        <td className="py-1.5 px-2 text-[var(--pz-text)]">
                                          {mVal.mean_temp_c}°C
                                        </td>
                                        <td className="py-1.5 px-2 text-[var(--pz-muted)]">
                                          {mVal.max_temp_c}°C / {mVal.min_temp_c}°C
                                        </td>
                                        <td className="py-1.5 px-2 font-semibold text-[var(--pz-text)]">
                                          {mVal.thermal_shock_drop_c}°C
                                        </td>
                                        <td className="py-1.5 px-2 text-[var(--pz-text)]">
                                          {mVal.precip_total_mm} mm
                                        </td>
                                        <td className="py-1.5 px-2 text-[var(--pz-muted)]">
                                          {mVal.precip_max_daily_mm} mm/d
                                        </td>
                                        <td className="py-1.5 px-2">
                                          <span className="text-[var(--pz-text)]">
                                            {formatSigned(mVal.temp_diff_from_monthly_baseline_c, "°C")} |{" "}
                                            {formatSigned(mVal.precip_diff_from_monthly_baseline_mm, " mm")}
                                          </span>
                                        </td>
                                        <td className="py-1.5 px-2 font-semibold text-[var(--pz-accent)]">
                                          {mVal.coupled_shock_index}
                                        </td>
                                        <td className="py-1.5 pl-2 font-sans">
                                          <span
                                            className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold border whitespace-nowrap ${mBadge.className}`}
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

        <p className="text-[11px] text-[var(--pz-secondary)] pt-1">
          {b.discrepancy_explanation}
        </p>
      </div>

      {/* Relação Numérica com Barragens Rompidas e em Alerta Crítico */}
      <div className="space-y-2.5 p-3.5 rounded-xl bg-[var(--pz-surface)] border border-[var(--pz-border)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-[var(--pz-text)]">
              Correlação Numérica com Barragens Rompidas e Alertas Críticos
            </h4>
            <p className="text-[11px] text-[var(--pz-muted)]">
              Comparação baseada nos valores de queda térmica e pluviosidade registrados nos eventos.
            </p>
          </div>

          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar eventos">
            {(
              [
                { id: "all", label: "Todas" },
                { id: "collapsed_system", label: "Rompidas" },
                { id: "critical_alert_system", label: "Alerta Nível 3" },
                { id: "external_proven_case", label: "Externas Reais" },
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
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${catMeta.className}`}
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

                <div className="text-[11px] font-mono tabular-nums text-[var(--pz-muted)] flex items-center justify-between">
                  <span>Queda: {ev.recorded_thermal_drop_c}°C</span>
                  <span>Chuva: {ev.recorded_precip_mm} mm</span>
                </div>

                <div className="text-[10px] font-mono text-[var(--pz-muted)] truncate">
                  Fonte: {ev.external_source_ref}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
