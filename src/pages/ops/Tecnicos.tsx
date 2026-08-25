import { useEffect, useMemo, useState } from "react";
import { DataAsOf } from "@/components/ops/DataAsOf";
import { useOpsRpc, useOpsRpcs } from "@/lib/ops-query";
import { useOpsFilters, fmtNum, fmtPct, fmtDec } from "@/lib/ops-filters";
import { gamaLabel } from "@/lib/ops-gamas";

import {
  prevPeriod,
  labelPeriodo,
  diasEntre,
  percentil,
  mediana,
  estadoGlobalTecnico,
  elegibilidadIncentivo,
  generarHallazgosTecnicos,
  validarCalidadDatosTecnicos,
  prioridadAtencion,
  LABEL_PRODUCCION,
  LABEL_CALIDAD,
  LABEL_SLA,
  LABEL_GLOBAL,
  type EstadoGlobalTecnico,
  type EstadoGlobalNivel,
  type EstadoProduccion,
  type EstadoCalidad,
  type EstadoSLA,
  type HallazgoTecnico,
  type AvisoCalidad,
} from "@/lib/ops-performance";
import { Loader2, X, Search, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { etiquetaVentana } from "@/lib/ops-modelo";
import { BreadcrumbConceptual } from "@/components/ops/OpsAmbito";

// -----------------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------------
type Row = {
  tecnico: string; delegacion: string; grupo: string; gama_principal: string | null;
  activo: boolean; motivo_inactivo: string | null;
  cerradas: number; cerradas_prev: number; delta_pct: number | null;
  pct_bajas: number; pct_bajas_esp: number;
  pct_nff: number; pct_nff_esp: number;
  dias_medio: number; pct_sla20: number;
  mix_top: string; score: number | null;
  abiertas_total: number; abiertas_30: number;
};

type EnrichedRow = Row & {
  pct_bajas_prev: number | null;
  bajas_prev_abs: number | null;
  delta_ratio_bajas: number | null;
  mediaDelegacion: number | null;
  estado: EstadoGlobalTecnico;
  problemasDatos: string[];
  prioridad: number;
  peer: "Central" | "Delegaciones";
};

// Umbral mínimo de cierres. Configurable en la UI.
const UMBRAL_MIN_DEFAULT = 10;

// -----------------------------------------------------------------------------
// Estilos de estado (tokens neutros; sin verde saturado)
// -----------------------------------------------------------------------------
const GLOBAL_STYLE: Record<EstadoGlobalNivel, { dot: string; text: string; bg: string }> = {
  reconocimiento_potencial: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  rendimiento_equilibrado: { dot: "bg-ink/40", text: "text-ink/70", bg: "bg-ink/[0.03]" },
  atencion_requerida: { dot: "bg-amber-500", text: "text-amber-800", bg: "bg-amber-50" },
  requiere_validacion: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
  informacion_insuficiente: { dot: "bg-ink/20", text: "text-ink/40", bg: "bg-ink/[0.02]" },
};

const PROD_STYLE: Record<EstadoProduccion, string> = {
  sobre_benchmark: "text-emerald-700",
  en_linea: "text-ink/70",
  bajo_benchmark: "text-amber-800",
  insuficiente: "text-ink/40",
};
const CAL_STYLE: Record<EstadoCalidad, string> = {
  mejor_que_benchmark: "text-emerald-700",
  en_linea: "text-ink/70",
  atencion: "text-amber-800",
  critico: "text-red-700",
  insuficiente: "text-ink/40",
};
const SLA_STYLE: Record<EstadoSLA, string> = {
  sobre_objetivo: "text-emerald-700",
  en_linea: "text-ink/70",
  atencion: "text-amber-800",
  critico: "text-red-700",
  no_disponible: "text-ink/40",
};

const GAMA_ORDER = ["Gama Blanca", "Gama PAE", "Gama Marron", "Gama Movilidad"] as const;
// Etiquetas de display centralizadas (el valor interno no cambia).


// -----------------------------------------------------------------------------
// Formateo auxiliar
// -----------------------------------------------------------------------------
const fmtPP = (v: number | null | undefined) =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${(v * 100).toFixed(1)} pp`;
const fmtPctSigned = (v: number | null | undefined) =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
const Tecnicos = () => {
  const { rpcParams, prevRange, modo } = useOpsFilters();
  const [rowsRaw, setRowsRaw] = useState<Row[]>([]);
  const [rowsPrev, setRowsPrev] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<EnrichedRow | null>(null);
  const [search, setSearch] = useState("");
  const [gamaFilter, setGamaFilter] = useState<string | null>(null);
  const [umbral, setUmbral] = useState<number>(UMBRAL_MIN_DEFAULT);
  const [showDefs, setShowDefs] = useState(false);
  const [showPend, setShowPend] = useState(false);

  // ---- Fetch (caché react-query) -------------------------------------------
  const specs = useMemo(() => {
    const base = {
      p_delegacion: rpcParams.p_delegacion, p_cliente: rpcParams.p_cliente,
      p_gama: rpcParams.p_gama, p_familia: rpcParams.p_familia,
      p_marca: rpcParams.p_marca, p_provincia: rpcParams.p_provincia,
      p_sat: rpcParams.p_sat, p_canal: rpcParams.p_canal,
    };
    return [
      { rpc: "ops_tecnicos_scorecard", params: { p_from: rpcParams.p_from, p_to: rpcParams.p_to, ...base } },
      { rpc: "ops_tecnicos_scorecard", params: { p_from: prevRange.from, p_to: prevRange.to, ...base } },
    ];
  }, [rpcParams, prevRange]);

  const q = useOpsRpcs<unknown>(specs);
  const loading = q.some((r) => r.isPending);
  const rowsRaw = useMemo(() => (q[0].data ?? []) as Row[], [q[0].data]);
  const rowsPrev = useMemo(() => (q[1].data ?? []) as Row[], [q[1].data]);

  // ---- Enriquecimiento -----------------------------------------------------
  const enriched: EnrichedRow[] = useMemo(() => {
    const prevMap = new Map(rowsPrev.map((r) => [r.tecnico, r] as const));

    // Media ponderada de bajas por delegación (peer group calidad)
    const accum = new Map<string, { b: number; c: number }>();
    for (const r of rowsRaw.filter((x) => x.activo)) {
      const cur = accum.get(r.delegacion) ?? { b: 0, c: 0 };
      cur.b += r.pct_bajas * r.cerradas;
      cur.c += r.cerradas;
      accum.set(r.delegacion, cur);
    }
    const mediaByDeleg = new Map<string, number>();
    for (const [k, v] of accum) mediaByDeleg.set(k, v.c > 0 ? v.b / v.c : 0);

    // Cerradas del período por peer group para percentiles
    const cerradasCentral = rowsRaw.filter((r) => r.activo && r.grupo === "Central").map((r) => r.cerradas);
    const cerradasDele = rowsRaw.filter((r) => r.activo && r.grupo === "Delegaciones").map((r) => r.cerradas);
    const percentiles = {
      Central: { p33: percentil(cerradasCentral, 0.33), p66: percentil(cerradasCentral, 0.66), med: mediana(cerradasCentral) },
      Delegaciones: { p33: percentil(cerradasDele, 0.33), p66: percentil(cerradasDele, 0.66), med: mediana(cerradasDele) },
    };

    return rowsRaw.map((r) => {
      const p = prevMap.get(r.tecnico) ?? null;
      const pct_bajas_prev = p ? p.pct_bajas : null;
      const bajas_prev_abs = p ? Math.round(p.pct_bajas * p.cerradas) : null;
      const delta_ratio_bajas = pct_bajas_prev != null ? r.pct_bajas - pct_bajas_prev : null;
      const mediaDelegacion = mediaByDeleg.get(r.delegacion) ?? null;
      const peer: "Central" | "Delegaciones" = r.grupo === "Central" ? "Central" : "Delegaciones";
      const perc = percentiles[peer];

      const problemasDatos: string[] = [];
      if (r.pct_bajas > 1) problemasDatos.push("Ratio de bajas > 100%.");
      if (r.cerradas === 0 && r.pct_bajas > 0) problemasDatos.push("Cerradas=0 con ratio de bajas > 0.");

      const estado = r.activo
        ? estadoGlobalTecnico({
            cerradas: r.cerradas,
            cerradasPrev: p ? p.cerradas : null,
            pctBajas: r.pct_bajas,
            mediaDelegacion,
            pctBajasEsp: r.pct_bajas_esp,
            pctSla20: r.pct_sla20,
            abiertas30: r.abiertas_30,
            p33Grupo: perc.p33, p66Grupo: perc.p66, medianaGrupo: perc.med,
            umbralMinimo: umbral,
            problemasDatos,
          })
        : ({
            nivel: "informacion_insuficiente",
            produccion: { nivel: "insuficiente", regla: "Técnico inactivo." },
            calidad: { nivel: "insuficiente", regla: "Técnico inactivo." },
            sla: { nivel: "no_disponible", regla: "Técnico inactivo." },
            reglaGlobal: r.motivo_inactivo || "Técnico inactivo.",
            observacion: r.motivo_inactivo || "Inactivo",
          } as EstadoGlobalTecnico);

      const prioridad = prioridadAtencion(
        estado,
        mediaDelegacion != null ? r.pct_bajas - mediaDelegacion : null,
        r.delta_pct,
        r.abiertas_30,
      );

      return { ...r, pct_bajas_prev, bajas_prev_abs, delta_ratio_bajas, mediaDelegacion, estado, problemasDatos, prioridad, peer };
    });
  }, [rowsRaw, rowsPrev, umbral]);

  // ---- Filtrado por gama (Central) y búsqueda -----------------------------
  const filtered = useMemo(() => {
    let f = enriched;
    if (gamaFilter) f = f.filter((r) => r.peer !== "Central" || r.gama_principal === gamaFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      f = f.filter((r) =>
        r.tecnico.toLowerCase().includes(q) ||
        (r.delegacion ?? "").toLowerCase().includes(q) ||
        gamaLabel(r.gama_principal).toLowerCase().includes(q),
      );
    }
    return f;
  }, [enriched, gamaFilter, search]);

  const gamasPresentes = useMemo(() => {
    const set = new Set(
      enriched.filter((r) => r.peer === "Central").map((r) => r.gama_principal).filter(Boolean) as string[],
    );
    return GAMA_ORDER.filter((g) => set.has(g));
  }, [enriched]);

  // Orden por prioridad de atención
  const sorted = useMemo(
    () => filtered.slice().sort((a, b) => a.prioridad - b.prioridad || b.cerradas - a.cerradas),
    [filtered],
  );

  // ---- Hallazgos automáticos ----------------------------------------------
  const hallazgos: HallazgoTecnico[] = useMemo(
    () =>
      generarHallazgosTecnicos(
        enriched
          .filter((r) => r.activo)
          .map((r) => ({
            tecnico: r.tecnico,
            delegacion: r.delegacion,
            cerradas: r.cerradas,
            cerradasPrev: r.cerradas_prev,
            pctBajas: r.pct_bajas,
            mediaDelegacion: r.mediaDelegacion,
            abiertas30: r.abiertas_30,
            pctSla20: r.pct_sla20,
            estado: r.estado,
          })),
      ),
    [enriched],
  );

  // ---- Auditoría de datos --------------------------------------------------
  const auditoria = useMemo(() => {
    const alerts = new Set<string>(); // Sin cruce con dashboard aún: placeholder
    return validarCalidadDatosTecnicos(
      enriched.map((r) => ({
        tecnico: r.tecnico,
        delegacion: r.delegacion,
        cerradas: r.cerradas,
        cerradasPrev: r.cerradas_prev,
        pctBajas: r.pct_bajas,
        pctBajasPrev: r.pct_bajas_prev,
        pctSla20: r.pct_sla20,
      })),
      alerts,
    );
  }, [enriched]);

  // ---- Elegibilidad para incentivos ---------------------------------------
  const incentivos = useMemo(() => {
    const buckets = {
      reconocimiento_potencial: [] as EnrichedRow[],
      revision_estandar: [] as EnrichedRow[],
      requiere_validacion: [] as EnrichedRow[],
      informacion_insuficiente: [] as EnrichedRow[],
    };
    for (const r of enriched.filter((x) => x.activo)) buckets[elegibilidadIncentivo(r.estado)].push(r);
    return buckets;
  }, [enriched]);

  // ---- Banner de período ---------------------------------------------------
  const now = { from: rpcParams.p_from as string, to: rpcParams.p_to as string };
  const prev = prevRange;
  const diasActual = diasEntre(now.from, now.to);
  const diasPrev = diasEntre(prev.from, prev.to);
  const diferenciaDias = diasActual !== diasPrev;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-ink/40" />
      </div>
    );
  }

  const totales = {
    total: enriched.length,
    activos: enriched.filter((r) => r.activo).length,
    conMuestra: enriched.filter((r) => r.activo && r.cerradas >= umbral).length,
    sinMuestra: enriched.filter((r) => r.activo && r.cerradas < umbral).length,
    inactivos: enriched.filter((r) => !r.activo).length,
  };

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Red HIPERSERVICE</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">Rendimiento por técnico</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-3xl">
          Evaluación multidimensional (producción, calidad y SLA) contra el peer group correspondiente —
          Central San Agustín (taller) vs Delegaciones (calle). El estado global agrega las tres dimensiones
          con reglas explícitas, no con un score oculto.
        </p>
      </header>
      <DataAsOf />

      {/* BANNER DE PERÍODO */}
      <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-ink/40 mr-2">Período</span>
          <span className="text-ink font-medium">{labelPeriodo(now.from, now.to)}</span>
          <span className="text-ink/40"> ({diasActual} días)</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-ink/40 mr-2">Comparado con</span>
          <span className="text-ink/70">{labelPeriodo(prev.from, prev.to)}</span>
          <span className="text-ink/40"> ({diasPrev} días)</span>
        </div>
        {diferenciaDias && (
          <div className="text-[11px] text-amber-800 bg-amber-50 rounded-full px-2 py-0.5">
            Períodos con distinta duración — interpretar variaciones con cautela.
          </div>
        )}
        <div className="text-[11px] text-ink/50 ml-auto">
          {totales.activos} activos ({totales.conMuestra} con muestra ≥ {umbral}, {totales.sinMuestra} sin muestra) ·{" "}
          {totales.inactivos} inactivos
        </div>
      </div>

      {/* CONTROLES */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar técnico o delegación…"
            className="w-64 pl-8 pr-3 py-1.5 rounded-full text-sm border border-black/[0.1] focus:border-ink/60 focus:outline-none bg-white"
          />
        </div>

        {gamasPresentes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mr-1">Gama (Central)</span>
            <button
              onClick={() => setGamaFilter(null)}
              className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${gamaFilter === null ? "bg-ink text-bone border-ink" : "border-black/[0.1] text-ink/60 hover:text-ink hover:border-ink/40"}`}
            >
              Todas
            </button>
            {gamasPresentes.map((g) => (
              <button
                key={g}
                onClick={() => setGamaFilter(g)}
                className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${gamaFilter === g ? "bg-ink text-bone border-ink" : "border-black/[0.1] text-ink/60 hover:text-ink hover:border-ink/40"}`}
              >
                {gamaLabel(g, g)}
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2 text-[11px] text-ink/60">
          <label>Umbral mínimo cierres:</label>
          <select
            value={umbral}
            onChange={(e) => setUmbral(Number(e.target.value))}
            className="border border-black/[0.1] rounded-md px-2 py-1 bg-white text-ink text-[11px]"
          >
            {[5, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* AVISOS DE CALIDAD DE DATOS */}
      {auditoria.porTecnico.size > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900">
                Calidad de datos · {auditoria.porTecnico.size} técnico(s) con incidencias
              </p>
              <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-[12px] text-amber-900/90 max-h-40 overflow-y-auto">
                {Array.from(auditoria.porTecnico.entries()).slice(0, 30).map(([tec, avisos]) => (
                  <div key={tec}>
                    <span className="font-medium">{tec}:</span>{" "}
                    <span className="text-amber-900/70">{avisos.map((a) => a.mensaje).join(" · ")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TABLA PLANA */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">
          Técnicos · orden por prioridad de atención · {sorted.length} filas
        </p>
        <div className="border border-black/[0.06] rounded-2xl bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.06] bg-white">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Técnico</th>
                <th className="text-left px-3 py-2.5 font-semibold">Peer</th>
                <th className="text-right px-3 py-2.5 font-semibold" title="Cerradas en el período">Cerr.</th>
                <th className="text-right px-3 py-2.5 font-semibold text-ink/40" title="Cerradas período anterior">Ant.</th>
                <th className="text-right px-3 py-2.5 font-semibold" title="Δ vs período anterior">Δ</th>
                <th className="text-right px-3 py-2.5 font-semibold" title="Ratio bajas / cerradas">% Bajas</th>
                <th className="text-right px-3 py-2.5 font-semibold" title="Diferencia vs media de su delegación">vs deleg.</th>
                <th className="text-right px-3 py-2.5 font-semibold" title="Δ ratio vs período anterior">Δ ratio</th>
                <th className="text-right px-3 py-2.5 font-semibold">SLA 20d</th>
                <th className="text-right px-3 py-2.5 font-semibold">Días</th>
                <th className="text-right px-3 py-2.5 font-semibold" title="Abiertas totales · +30 días">Ab. / +30</th>
                <th className="text-left px-3 py-2.5 font-semibold">Producción</th>
                <th className="text-left px-3 py-2.5 font-semibold">Calidad</th>
                <th className="text-left px-3 py-2.5 font-semibold">SLA</th>
                <th className="text-left px-3 py-2.5 font-semibold">Estado global</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {sorted.map((r) => {
                const dppDeleg = r.mediaDelegacion != null ? r.pct_bajas - r.mediaDelegacion : null;
                const dppDelegCls =
                  dppDeleg == null ? "text-ink/30" : dppDeleg > 0.05 ? "text-red-600" : dppDeleg < -0.05 ? "text-emerald-700" : "text-ink/60";
                const dRatio = r.delta_ratio_bajas;
                const dRatioCls =
                  dRatio == null ? "text-ink/30" : dRatio > 0.03 ? "text-red-600" : dRatio < -0.03 ? "text-emerald-700" : "text-ink/60";
                const delta = r.delta_pct;
                const deltaCls =
                  delta == null ? "text-ink/30" : delta > 0.05 ? "text-emerald-700" : delta < -0.05 ? "text-red-600" : "text-ink/60";

                return (
                  <tr key={r.tecnico} onClick={() => setSel(r)} className="cursor-pointer hover:bg-black/[0.02] transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="text-ink font-medium">{r.tecnico}</p>
                      <p className="text-[11px] text-ink/40">
                        {r.delegacion || "—"}
                        {r.gama_principal && <span> · {gamaLabel(r.gama_principal)}</span>}
                        {!r.activo && <span className="ml-1 text-red-700">· inactivo</span>}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-ink/60">{r.peer}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums">{fmtNum(r.cerradas)}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-ink/40">{fmtNum(r.cerradas_prev)}</td>
                    <td className={`text-right px-3 py-2.5 tabular-nums text-xs ${deltaCls}`}>{fmtPctSigned(delta)}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums">{fmtPct(r.pct_bajas)}</td>
                    <td className={`text-right px-3 py-2.5 tabular-nums text-xs ${dppDelegCls}`}>{fmtPP(dppDeleg)}</td>
                    <td className={`text-right px-3 py-2.5 tabular-nums text-xs ${dRatioCls}`}>{fmtPP(dRatio)}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums">{fmtPct(r.pct_sla20)}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums">{fmtDec(r.dias_medio, 1)}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-[11px]">
                      <span className="text-ink/60">{fmtNum(r.abiertas_total)}</span>
                      <span className={r.abiertas_30 >= 5 ? "text-red-600 ml-1" : "text-ink/40 ml-1"}>
                        · {fmtNum(r.abiertas_30)}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 text-[11px] ${PROD_STYLE[r.estado.produccion.nivel]}`}>
                      {LABEL_PRODUCCION[r.estado.produccion.nivel]}
                    </td>
                    <td className={`px-3 py-2.5 text-[11px] ${CAL_STYLE[r.estado.calidad.nivel]}`}>
                      {LABEL_CALIDAD[r.estado.calidad.nivel]}
                    </td>
                    <td className={`px-3 py-2.5 text-[11px] ${SLA_STYLE[r.estado.sla.nivel]}`}>
                      {LABEL_SLA[r.estado.sla.nivel]}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${GLOBAL_STYLE[r.estado.nivel].text}`}>
                        <span className={`h-2 w-2 rounded-full ${GLOBAL_STYLE[r.estado.nivel].dot}`} />
                        {LABEL_GLOBAL[r.estado.nivel]}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={15} className="text-center px-4 py-8 text-ink/40 text-sm">Sin técnicos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* HALLAZGOS */}
      {hallazgos.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">
            Hallazgos automáticos · {hallazgos.length}
          </p>
          <div className="space-y-2">
            {hallazgos.map((h, i) => (
              <div key={i} className="border border-black/[0.06] rounded-xl bg-white p-4 text-sm">
                <p className="text-ink font-medium mb-1">{h.hecho}</p>
                <p className="text-ink/70">{h.cifras}</p>
                <p className="text-[12px] text-ink/50 mt-1">{h.benchmark}</p>
                <p className="text-[12px] text-ink/60 mt-1"><span className="font-medium">Relevancia:</span> {h.relevancia}</p>
                <p className="text-[12px] text-amber-900 mt-1"><span className="font-medium">Validar antes de decidir:</span> {h.validacion}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ELEGIBILIDAD PARA INCENTIVOS */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">
          Elegibilidad para revisión de incentivos (provisional)
        </p>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 px-4 py-3 text-[12px] text-amber-900 mb-3 flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Estas categorías <span className="font-medium">no son propuestas de incentivo</span>. Definen a quién revisar
            primero. Cualquier decisión final exige integrar días trabajados, ausencias, satisfacción del cliente y
            reclamaciones — información que aún no está disponible en este sistema.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <BucketCard title="Reconocimiento potencial" nivel="reconocimiento_potencial" rows={incentivos.reconocimiento_potencial} onOpen={setSel} />
          <BucketCard title="Revisión estándar" nivel="rendimiento_equilibrado" rows={incentivos.revision_estandar} onOpen={setSel} />
          <BucketCard title="Requiere validación" nivel="atencion_requerida" rows={incentivos.requiere_validacion} onOpen={setSel} />
          <BucketCard title="Información insuficiente" nivel="informacion_insuficiente" rows={incentivos.informacion_insuficiente} onOpen={setSel} />
        </div>

        {/* Indicador provisional de producción y calidad (procede del Panorama operativo) */}
        <div className="mt-4 border border-black/[0.06] rounded-2xl bg-white p-5">
          <p className="font-display text-lg text-ink">Indicador provisional de producción y calidad</p>
          <p className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-3">
            Este indicador se basa únicamente en los datos de producción y bajas disponibles actualmente.
            No debe utilizarse como base única para decisiones de nómina o incentivos definitivos.
          </p>
          <button
            onClick={() => setShowPend((s) => !s)}
            className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50 hover:text-ink transition-colors"
          >
            {showPend ? "▾" : "▸"} Datos pendientes para el modelo definitivo
          </button>
          {showPend && (
            <ul className="text-[12px] text-ink/60 grid sm:grid-cols-2 gap-x-4 gap-y-1 list-disc pl-4 mt-3">
              <li>Trabajos asignados</li>
              <li>Días y horas trabajadas</li>
              <li>Vacaciones y bajas laborales</li>
              <li>First Time Fix</li>
              <li>Reincidencias</li>
              <li>Cumplimiento SLA</li>
              <li>Reclamaciones y satisfacción</li>
              <li>Complejidad de producto</li>
              <li>Desplazamientos</li>
              <li>Causas ajenas al técnico</li>
              <li>Disponibilidad y consumo de repuestos</li>
            </ul>
          )}
        </div>
      </section>


      {/* DEFINICIONES */}
      <section className="border-t border-black/[0.06] pt-6">
        <button
          onClick={() => setShowDefs((v) => !v)}
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50 hover:text-ink transition-colors"
        >
          {showDefs ? "▾" : "▸"} Definiciones y reglas
        </button>
        {showDefs && (
          <div className="mt-4 grid md:grid-cols-2 gap-4 text-[13px] text-ink/70 leading-relaxed">
            <div>
              <p className="font-medium text-ink mb-1">Producción</p>
              <p>Cerradas en el período (incluye bajas). Percentiles calculados dentro del peer group activo (Central vs Delegaciones).</p>
              <ul className="list-disc pl-5 mt-1 text-[12px] text-ink/60">
                <li>Sobre benchmark: ≥ p66 del grupo o Δ ≥ +15%.</li>
                <li>Bajo benchmark: ≤ p33 del grupo y Δ ≤ −15%.</li>
                <li>En línea: rango intermedio.</li>
                <li>Insuficiente: cerradas &lt; umbral configurable.</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-ink mb-1">Calidad</p>
              <p>Ratio bajas / cerradas, comparado contra la media ponderada de su delegación y contra el esperado por mix familia×cliente.</p>
              <ul className="list-disc pl-5 mt-1 text-[12px] text-ink/60">
                <li>Crítico: ≥ +10 pp sobre media y ≥ 1,5× esperado.</li>
                <li>Atención: ≥ +5 pp sobre media.</li>
                <li>Mejor que benchmark: ≤ −5 pp.</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-ink mb-1">SLA</p>
              <p>% cierres en 20 días laborables. Umbrales: 80% (sobre objetivo), 60% (en línea), 40% (atención), &lt;40% (crítico).</p>
            </div>
            <div>
              <p className="font-medium text-ink mb-1">Estado global</p>
              <p>No es un score. Se calcula por reglas: atención si cualquier dimensión está en atención/crítico o backlog +30 ≥ 5.
              Reconocimiento potencial exige las tres dimensiones sanas y cerradas ≥ mediana del grupo.</p>
            </div>
            <div className="md:col-span-2 text-[12px] text-ink/50 border-l-2 border-amber-300 pl-3">
              Datos pendientes para evaluación definitiva: días trabajados, ausencias, satisfacción del cliente,
              reclamaciones y motivos codificados de baja. Sin esos inputs, ninguna decisión de incentivo debe basarse
              únicamente en este panel.
            </div>
          </div>
        )}
      </section>

      {sel && <FichaDrawer tecnico={sel} onClose={() => setSel(null)} />}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Tarjeta de bucket de elegibilidad
// -----------------------------------------------------------------------------
const BucketCard = ({
  title, nivel, rows, onOpen,
}: {
  title: string;
  nivel: EstadoGlobalNivel;
  rows: EnrichedRow[];
  onOpen: (r: EnrichedRow) => void;
}) => {
  const style = GLOBAL_STYLE[nivel];
  return (
    <div className="border border-black/[0.06] rounded-2xl bg-white overflow-hidden">
      <div className={`px-4 py-2.5 flex items-center justify-between ${style.bg}`}>
        <span className={`text-[11px] font-medium ${style.text} flex items-center gap-1.5`}>
          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
          {title}
        </span>
        <span className="text-[11px] text-ink/50 tabular-nums">{rows.length}</span>
      </div>
      <div className="max-h-56 overflow-y-auto divide-y divide-black/[0.04]">
        {rows.slice(0, 20).map((r) => (
          <button
            key={r.tecnico}
            onClick={() => onOpen(r)}
            className="w-full text-left px-4 py-2 hover:bg-black/[0.02] transition-colors flex justify-between items-center"
          >
            <div>
              <p className="text-[13px] text-ink">{r.tecnico}</p>
              <p className="text-[11px] text-ink/40">{r.delegacion || "—"}</p>
            </div>
            <span className="text-[11px] tabular-nums text-ink/50">{fmtNum(r.cerradas)} cierres</span>
          </button>
        ))}
        {rows.length === 0 && (
          <p className="text-[12px] text-ink/40 px-4 py-4 text-center">Sin técnicos.</p>
        )}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// FICHA (drawer) — ampliada con desglose por marca y provincias +30
// -----------------------------------------------------------------------------
type Ficha = {
  evolucion: Array<{ mes: string; cerradas: number; pct_sla20: number; pct_bajas: number }>;
  canal: Array<{ canal: string; n: number; desp_medio: number | null; dias_medio: number | null }>;
  mix: Array<{ familia: string; cliente_wg: string; n: number; pct_bajas: number; pct_bajas_esp: number | null; pct_nff: number; pct_nff_esp: number | null }>;
  bajas_marca: Array<{ marca: string; bajas: number; cerradas: number; pct_bajas: number }>;
  abiertas: Array<{ num_ot: string; cliente_wg: string; familia: string; provincia: string; fecha_creacion: string; dias_abierta: number }>;
  abiertas_prov: Array<{ provincia: string; n_total: number; n_30: number }>;
};

const FichaDrawer = ({ tecnico, onClose }: { tecnico: EnrichedRow; onClose: () => void }) => {
  const data = useOpsRpc<Ficha | null>("ops_tecnico_ficha", { p_tecnico: tecnico.tecnico }).data ?? null;

  const maxEvo = Math.max(1, ...(data?.evolucion.map((e) => e.cerradas) ?? [1]));
  const style = GLOBAL_STYLE[tecnico.estado.nivel];

  return (
    <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white h-full overflow-y-auto p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Ficha técnico</p>
            <h2 className="font-display text-2xl tracking-tight text-ink mt-1">{tecnico.tecnico}</h2>
            <p className="text-xs text-ink/50">
              {tecnico.delegacion || "—"} · {tecnico.peer}
              {tecnico.gama_principal && <span> · Gama {gamaLabel(tecnico.gama_principal)}</span>}
            </p>
            <div className="mt-2">
              <BreadcrumbConceptual
                pasos={[
                  { nivel: "WG", valor: "Warranty Global" },
                  { nivel: "Unidad", valor: "Hiperservice" },
                  { nivel: "Base", valor: tecnico.delegacion || null },
                  { nivel: "Equipo", valor: tecnico.gama_principal ? gamaLabel(tecnico.gama_principal) : null },
                  { nivel: "Persona", valor: tecnico.tecnico },
                ]}
              />
            </div>
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>

        {/* Estado global explicable */}
        <div className={`rounded-2xl border border-black/[0.06] ${style.bg} p-4 mb-6`}>
          <p className={`text-[11px] font-medium ${style.text} flex items-center gap-1.5 mb-2`}>
            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
            {LABEL_GLOBAL[tecnico.estado.nivel]}
          </p>
          <p className="text-[13px] text-ink/80">{tecnico.estado.reglaGlobal}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <DimBox label="Producción" nivel={LABEL_PRODUCCION[tecnico.estado.produccion.nivel]} regla={tecnico.estado.produccion.regla} cls={PROD_STYLE[tecnico.estado.produccion.nivel]} />
            <DimBox label="Calidad" nivel={LABEL_CALIDAD[tecnico.estado.calidad.nivel]} regla={tecnico.estado.calidad.regla} cls={CAL_STYLE[tecnico.estado.calidad.nivel]} />
            <DimBox label="SLA" nivel={LABEL_SLA[tecnico.estado.sla.nivel]} regla={tecnico.estado.sla.regla} cls={SLA_STYLE[tecnico.estado.sla.nivel]} />
          </div>
        </div>

        {/* KPIs numéricos */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <MiniKpi label="Cerradas" value={fmtNum(tecnico.cerradas)} sub={`ant. ${fmtNum(tecnico.cerradas_prev)}`} />
          <MiniKpi label="% Bajas" value={fmtPct(tecnico.pct_bajas)} sub={`esp. ${fmtPct(tecnico.pct_bajas_esp)}`} />
          <MiniKpi label="SLA 20d" value={fmtPct(tecnico.pct_sla20)} sub={`días ${fmtDec(tecnico.dias_medio, 1)}`} />
          <MiniKpi label="Abiertas +30" value={fmtNum(tecnico.abiertas_30)} sub={`total ${fmtNum(tecnico.abiertas_total)}`} />
        </div>

        {data && (
          <>
            <Section title={`Evolución 12 meses — ${etiquetaVentana("tecnicos_evolucion")}`}>
              <div className="flex items-end gap-1 h-24">
                {data.evolucion.map((e) => (
                  <div key={e.mes} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-ink/70 rounded-t-sm"
                      style={{ height: `${(e.cerradas / maxEvo) * 100}%` }}
                      title={`${e.cerradas} · SLA ${fmtPct(e.pct_sla20)} · Bajas ${fmtPct(e.pct_bajas)}`}
                    />
                    <span className="text-[9px] text-ink/40">
                      {new Date(e.mes).toLocaleString("es-ES", { month: "short" })}
                    </span>
                  </div>
                ))}
                {data.evolucion.length === 0 && <p className="text-xs text-ink/40">Sin datos.</p>}
              </div>
            </Section>

            <Section title="Bajas por marca">
              {data.bajas_marca.length === 0 ? (
                <p className="text-xs text-ink/40">Sin bajas en el período.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-ink/40 border-b border-black/[0.06]">
                    <tr>
                      <th className="text-left py-2">Marca</th>
                      <th className="text-right">Bajas</th>
                      <th className="text-right">Cerradas</th>
                      <th className="text-right">% Bajas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {data.bajas_marca.map((m) => (
                      <tr key={m.marca}>
                        <td className="py-2">{m.marca}</td>
                        <td className="text-right tabular-nums">{fmtNum(m.bajas)}</td>
                        <td className="text-right tabular-nums text-ink/60">{fmtNum(m.cerradas)}</td>
                        <td className="text-right tabular-nums">{fmtPct(m.pct_bajas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            <Section title="Abiertas +30 días por provincia">
              {data.abiertas_prov.length === 0 ? (
                <p className="text-xs text-ink/40">Sin OTs abiertas envejecidas.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-ink/40 border-b border-black/[0.06]">
                    <tr>
                      <th className="text-left py-2">Provincia</th>
                      <th className="text-right">Abiertas</th>
                      <th className="text-right">+30 días</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {data.abiertas_prov.map((p) => (
                      <tr key={p.provincia}>
                        <td className="py-2">{p.provincia}</td>
                        <td className="text-right tabular-nums text-ink/60">{fmtNum(p.n_total)}</td>
                        <td className={`text-right tabular-nums ${p.n_30 >= 5 ? "text-red-600 font-medium" : "text-ink"}`}>
                          {fmtNum(p.n_30)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            <Section title="Canal">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-ink/40 border-b border-black/[0.06]">
                  <tr>
                    <th className="text-left py-2">Canal</th>
                    <th className="text-right">OTs</th>
                    <th className="text-right">Días medio</th>
                    <th className="text-right">Desp. €/OT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {data.canal.map((c) => (
                    <tr key={c.canal}>
                      <td className="py-2">{c.canal}</td>
                      <td className="text-right tabular-nums">{fmtNum(c.n)}</td>
                      <td className="text-right tabular-nums">{fmtDec(c.dias_medio, 1)}</td>
                      <td className="text-right tabular-nums">{c.desp_medio == null ? "—" : `${fmtDec(c.desp_medio, 1)} €`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section title="Mix familias × cliente (vs benchmark)">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-ink/40 border-b border-black/[0.06]">
                  <tr>
                    <th className="text-left py-2">Familia</th>
                    <th className="text-left">Cliente</th>
                    <th className="text-right">n</th>
                    <th className="text-right">% Bajas</th>
                    <th className="text-right">% NFF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {data.mix.map((m, i) => (
                    <tr key={i}>
                      <td className="py-2">{m.familia}</td>
                      <td className="text-ink/60">{m.cliente_wg || "—"}</td>
                      <td className="text-right tabular-nums">{fmtNum(m.n)}</td>
                      <td className="text-right tabular-nums">
                        {fmtPct(m.pct_bajas)}
                        <span className="block text-[10px] text-ink/40">esp. {fmtPct(m.pct_bajas_esp ?? 0)}</span>
                      </td>
                      <td className="text-right tabular-nums">
                        {fmtPct(m.pct_nff)}
                        <span className="block text-[10px] text-ink/40">esp. {fmtPct(m.pct_nff_esp ?? 0)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section title={`Últimas abiertas (${data.abiertas.length})`}>
              <div className="max-h-72 overflow-y-auto text-sm divide-y divide-black/[0.04]">
                {data.abiertas.map((a) => (
                  <div key={a.num_ot} className="py-2 flex justify-between">
                    <div>
                      <p className="text-ink">{a.num_ot} · {a.familia || "—"}</p>
                      <p className="text-[11px] text-ink/50">{a.cliente_wg || "—"} · {a.provincia || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className={`tabular-nums text-sm ${a.dias_abierta > 30 ? "text-red-600 font-medium" : a.dias_abierta > 20 ? "text-amber-700" : "text-ink/60"}`}>
                        {a.dias_abierta} d
                      </p>
                      <p className="text-[10px] text-ink/40">{a.fecha_creacion}</p>
                    </div>
                  </div>
                ))}
                {data.abiertas.length === 0 && <p className="text-xs text-ink/40 py-4">Sin OTs abiertas.</p>}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
};

const DimBox = ({ label, nivel, regla, cls }: { label: string; nivel: string; regla: string; cls: string }) => (
  <div className="rounded-lg bg-white/70 border border-black/[0.04] p-2">
    <p className="text-[9px] uppercase tracking-wider text-ink/40 mb-0.5">{label}</p>
    <p className={`font-medium ${cls}`}>{nivel}</p>
    <p className="text-[10px] text-ink/50 mt-0.5 leading-snug">{regla}</p>
  </div>
);

const MiniKpi = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="border border-black/[0.06] rounded-xl p-3">
    <p className="text-[10px] uppercase tracking-wider text-ink/40">{label}</p>
    <p className="font-display text-xl tabular-nums text-ink mt-0.5">{value}</p>
    {sub && <p className="text-[10px] text-ink/40 tabular-nums">{sub}</p>}
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-6">
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">{title}</p>
    <div className="border border-black/[0.06] rounded-xl bg-white p-4">{children}</div>
  </section>
);

export default Tecnicos;
