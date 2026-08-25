import { useEffect, useState } from "react";

/**
 * Instrumentación de rendimiento de /operaciones.
 *
 * Objetivo: poder auditar la experiencia REAL en navegador (no solo el tiempo
 * de la base de datos). Cada llamada RPC registra duración, tamaño aproximado
 * de payload y si venía de caché. El overlay (?perf=1) muestra el detalle sin
 * afectar al render normal: si no se activa, aquí no se hace nada visible.
 */

export type PerfMarca = {
  id: number;
  rpc: string;
  ms: number;
  bytes: number;
  error: boolean;
  ts: number;
};

const MAX_MARCAS = 200;

let contador = 0;
let marcas: PerfMarca[] = [];
const oyentes = new Set<(m: PerfMarca[]) => void>();

/** El overlay solo se activa explícitamente por querystring `?perf=1`. */
export const perfActivo = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("perf") === "1";
  } catch {
    return false;
  }
};

const emitir = () => {
  const copia = marcas;
  for (const f of oyentes) f(copia);
};

export const registrarMarca = (m: Omit<PerfMarca, "id" | "ts">): void => {
  contador += 1;
  marcas = [{ ...m, id: contador, ts: Date.now() }, ...marcas].slice(0, MAX_MARCAS);
  emitir();
};

export const limpiarMarcas = (): void => {
  marcas = [];
  emitir();
};

export const leerMarcas = (): PerfMarca[] => marcas;

/** Tamaño aproximado del payload; nunca debe romper la llamada real. */
export const tamanoAprox = (data: unknown): number => {
  try {
    return JSON.stringify(data ?? null).length;
  } catch {
    return 0;
  }
};

export type PerfResumen = {
  llamadas: number;
  msTotal: number;
  msMax: number;
  bytes: number;
  errores: number;
};

export const resumirMarcas = (ms: PerfMarca[]): PerfResumen => ({
  llamadas: ms.length,
  msTotal: Math.round(ms.reduce((a, m) => a + m.ms, 0)),
  msMax: ms.length ? Math.round(Math.max(...ms.map((m) => m.ms))) : 0,
  bytes: ms.reduce((a, m) => a + m.bytes, 0),
  errores: ms.filter((m) => m.error).length,
});

export const formatearBytes = (n: number): string =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} kB`;

export function usePerfMarcas(): PerfMarca[] {
  const [estado, setEstado] = useState<PerfMarca[]>(marcas);
  useEffect(() => {
    const f = (m: PerfMarca[]) => setEstado(m);
    oyentes.add(f);
    return () => {
      oyentes.delete(f);
    };
  }, []);
  return estado;
}
