"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnalysisRequest,
  AnalysisResponse,
  GridPixel,
  REFERENCE_PIXEL_ID,
  ScenarioItem,
} from "@phase-zero/shared";
import { analyze, FALLBACK_SCENARIOS, getScenarios } from "../lib/api";
import {
  clearStoredToken,
  getStoredToken,
  saveStoredToken,
} from "../lib/tokenStorage";

export interface CustomSearchInput {
  startDate: string;
  endDate: string;
  lat: number;
  lon: number;
  name: string;
}

export interface AnalysisContextValue {
  params: AnalysisRequest;
  scenarios: ScenarioItem[];
  data: AnalysisResponse | null;
  selectedPixel: GridPixel | null;
  loading: boolean;
  revalidating: boolean;
  error: string | null;
  minCoherenceDraft: number;
  setParam: <K extends keyof AnalysisRequest>(key: K, value: AnalysisRequest[K]) => void;
  setMinCoherenceDraft: (value: number) => void;
  selectScenario: (scenarioId: string, defaultStart: string, defaultEnd: string) => void;
  updatePeriod: (startDate: string, endDate: string) => void;
  runCustom: (input: CustomSearchInput) => void;
  selectPixel: (pixel: GridPixel) => void;
  saveToken: (token: string) => void;
  removeToken: () => void;
  retry: () => void;
}

const DEFAULT_PARAMS: AnalysisRequest = {
  scenario_id: "gongo_soco_active",
  apply_ionosphere: true,
  apply_troposphere: true,
  apply_solid_tides: true,
  apply_nasa_power: true,
  min_coherence: 0.4,
  start_date: "2026-03-01",
  end_date: "2026-09-15",
  custom_lat: -25.408,
  custom_lon: -54.588,
  custom_name: "Usina de Itaipu (PR)",
  earthdata_token: "",
};

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [params, setParams] = useState<AnalysisRequest>(DEFAULT_PARAMS);
  const [minCoherenceDraft, setMinCoherenceDraftState] = useState<number>(
    DEFAULT_PARAMS.min_coherence,
  );
  const [scenarios, setScenarios] = useState<ScenarioItem[]>(FALLBACK_SCENARIOS);
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [selectedPixel, setSelectedPixel] = useState<GridPixel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [revalidating, setRevalidating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState<number>(0);

  const selectedPixelIdRef = useRef<string>(REFERENCE_PIXEL_ID);
  const hasLoadedOnceRef = useRef<boolean>(false);

  // Carrega token salvo em localStorage e lista de cenários ao montar
  useEffect(() => {
    const saved = getStoredToken();
    if (saved) {
      setParams((prev) => ({ ...prev, earthdata_token: saved }));
    }
    const ctrl = new AbortController();
    getScenarios(ctrl.signal).then((list) => {
      if (list.length > 0) setScenarios(list);
    });
    return () => ctrl.abort();
  }, []);

  // Debounce de 300 ms para o slider de coerência mínima (S-F2)
  useEffect(() => {
    if (Math.abs(minCoherenceDraft - params.min_coherence) < 1e-6) {
      return;
    }
    const timer = window.setTimeout(() => {
      setParams((prev) => ({ ...prev, min_coherence: minCoherenceDraft }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [minCoherenceDraft, params.min_coherence]);

  // Efeito principal de análise com cancelamento via AbortController
  useEffect(() => {
    const ctrl = new AbortController();
    if (!hasLoadedOnceRef.current) {
      setLoading(true);
    } else {
      setRevalidating(true);
    }
    setError(null);

    analyze(params, ctrl.signal)
      .then((res) => {
        hasLoadedOnceRef.current = true;
        setData(res);
        if (res.grid_pixels.length > 0) {
          const targetId = selectedPixelIdRef.current || REFERENCE_PIXEL_ID;
          const found =
            res.grid_pixels.find((p) => p.id === targetId) ?? res.grid_pixels[0];
          selectedPixelIdRef.current = found.id;
          setSelectedPixel(found);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const msg =
          err instanceof Error
            ? err.message
            : "Erro inesperado ao processar a análise.";
        setError(msg);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setRevalidating(false);
        }
      });

    return () => {
      ctrl.abort();
    };
  }, [params, retryCounter]);

  const setParam = useCallback(
    <K extends keyof AnalysisRequest>(key: K, value: AnalysisRequest[K]) => {
      if (key === "min_coherence" && typeof value === "number") {
        setMinCoherenceDraftState(value);
      }
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const setMinCoherenceDraft = useCallback((value: number) => {
    setMinCoherenceDraftState(value);
  }, []);

  const selectScenario = useCallback(
    (scenarioId: string, defaultStart: string, defaultEnd: string) => {
      selectedPixelIdRef.current = REFERENCE_PIXEL_ID;
      setParams((prev) => ({
        ...prev,
        scenario_id: scenarioId,
        start_date: defaultStart,
        end_date: defaultEnd,
      }));
    },
    [],
  );

  const updatePeriod = useCallback((startDate: string, endDate: string) => {
    setParams((prev) => ({
      ...prev,
      start_date: startDate,
      end_date: endDate,
    }));
  }, []);

  const runCustom = useCallback((input: CustomSearchInput) => {
    selectedPixelIdRef.current = REFERENCE_PIXEL_ID;
    setParams((prev) => ({
      ...prev,
      scenario_id: "custom",
      start_date: input.startDate,
      end_date: input.endDate,
      custom_lat: input.lat,
      custom_lon: input.lon,
      custom_name: input.name,
    }));
  }, []);

  const selectPixel = useCallback((pixel: GridPixel) => {
    selectedPixelIdRef.current = pixel.id;
    setSelectedPixel(pixel);
  }, []);

  const saveToken = useCallback((token: string) => {
    saveStoredToken(token);
    setParams((prev) => ({ ...prev, earthdata_token: token.trim() }));
  }, []);

  const removeToken = useCallback(() => {
    clearStoredToken();
    setParams((prev) => ({ ...prev, earthdata_token: "" }));
  }, []);

  const retry = useCallback(() => {
    setRetryCounter((c) => c + 1);
  }, []);

  const value = useMemo<AnalysisContextValue>(
    () => ({
      params,
      scenarios,
      data,
      selectedPixel,
      loading,
      revalidating,
      error,
      minCoherenceDraft,
      setParam,
      setMinCoherenceDraft,
      selectScenario,
      updatePeriod,
      runCustom,
      selectPixel,
      saveToken,
      removeToken,
      retry,
    }),
    [
      params,
      scenarios,
      data,
      selectedPixel,
      loading,
      revalidating,
      error,
      minCoherenceDraft,
      setParam,
      setMinCoherenceDraft,
      selectScenario,
      updatePeriod,
      runCustom,
      selectPixel,
      saveToken,
      removeToken,
      retry,
    ],
  );

  return React.createElement(AnalysisContext.Provider, { value }, children);
}

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) {
    throw new Error("useAnalysis deve ser utilizado dentro de um AnalysisProvider.");
  }
  return ctx;
}
