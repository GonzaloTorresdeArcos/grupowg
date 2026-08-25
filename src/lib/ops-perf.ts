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

/* ─── Hitos de escenario (protocolo UAT en navegador) ─────────────────────── */

/**
 * Marcas de escenario que Dirección necesita para el UAT: cuándo aparece el
 * armazón de la página, cuándo los primeros KPI, cuándo el Panorama es usable
 * y cuándo termina toda la carga. Se miden desde el arranque de la navegación.
 */
export const HITOS = {
  shell: "Shell visible",
  primeros_kpi: "Primeros KPI",
  panorama_usable: "Panorama usable",
  carga_completa: "Carga completa",
} as const;

export type HitoId = keyof typeof HITOS;

export type PerfHito = { id: HitoId; ms: number };

let hitos: PerfHito[] = [];
const oyentesHitos = new Set<(h: PerfHito[]) => void>();

const t0Navegacion = (): number => {
  if (typeof performance === "undefined") return 0;
  return 0; // performance.now() ya es relativo al inicio de la navegación
};

/** Registra un hito una sola vez por navegación (el primero manda). */
export const registrarHito = (id: HitoId): void => {
  if (!perfActivo()) return;
  if (hitos.some((h) => h.id === id)) return;
  const ahora = typeof performance !== "undefined" ? performance.now() : Date.now();
  hitos = [...hitos, { id, ms: Math.round(ahora - t0Navegacion()) }];
  for (const f of oyentesHitos) f(hitos);
};

export const leerHitos = (): PerfHito[] => hitos;

export const limpiarHitos = (): void => {
  hitos = [];
  for (const f of oyentesHitos) f(hitos);
};

export function usePerfHitos(): PerfHito[] {
  const [estado, setEstado] = useState<PerfHito[]>(hitos);
  useEffect(() => {
    const f = (h: PerfHito[]) => setEstado(h);
    oyentesHitos.add(f);
    return () => {
      oyentesHitos.delete(f);
    };
  }, []);
  return estado;
}

/**
 * Informe en texto plano (tabla de hitos + tabla de RPC) para que Dirección lo
 * pegue en el chat. `caché` es "sí" cuando la vista no ha necesitado red para
 * ese dato: las marcas solo se emiten cuando hay llamada real al servidor.
 */
export const informeTexto = (ms: PerfMarca[], hs: PerfHito[], contexto?: string): string => {
  const r = resumirMarcas(ms);
  const lineas: string[] = [];
  lineas.push(`INFORME UAT /operaciones${contexto ? ` · ${contexto}` : ""}`);
  lineas.push(`URL: ${typeof window !== "undefined" ? window.location.href : "-"}`);
  lineas.push("");
  lineas.push("HITOS DE ESCENARIO");
  for (const id of Object.keys(HITOS) as HitoId[]) {
    const h = hs.find((x) => x.id === id);
    lineas.push(`- ${HITOS[id]}: ${h ? `${h.ms} ms` : "no alcanzado"}`);
  }
  lineas.push("");
  lineas.push(`RPC (${r.llamadas} llamadas · ${r.msTotal} ms suma · ${r.msMax} ms máx · ${formatearBytes(r.bytes)} · ${r.errores} errores)`);
  lineas.push("rpc | ms | kB | caché | error");
  for (const m of [...ms].reverse()) {
    lineas.push(`${m.rpc} | ${Math.round(m.ms)} | ${Math.round(m.bytes / 1024)} | no | ${m.error ? "sí" : "no"}`);
  }
  return lineas.join("\n");
};

