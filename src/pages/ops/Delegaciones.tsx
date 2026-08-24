import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOpsFilters, fmtNum, fmtPct, fmtDec } from "@/lib/ops-filters";
import {
  variacion, ratioBajas, prevPeriod, labelPeriodo, diasEntre,
  esDelegacionReal, estadoDelegacionMulti, validarCalidadDatosDelegaciones,
  generarHallazgosDelegaciones, UMBRAL_MIN_DELEGACION, UMBRAL_ALERTA_CAIDA,
  LABEL_GLOBAL_DELEG, type EstadoGlobalDeleg, type EstadoDelegacionMulti,
  type ValidacionDelegInput, type DelegHallazgoInput,
} from "@/lib/ops-performance";
import { DelegacionesResumen } from "@/components/ops/DelegacionesResumen";
import type { EquipoRow } from "@/lib/ops-performance";
import { Loader2, Info, X, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

type KpiRow = {
  delegacion: string; cerradas: number; pct_sla20: number; dias_medio: number;
  pct_bajas: number; pct_nff: number; tecnicos: number; abiertas: number; abiertas_30: number;
};
type EvoRow = { delegacion: string; mes: string; cerradas: number };
type TecRow = { delegacion: string; tecnico: string; cerradas: number; pct_sla20: number };
type Data = { kpis: KpiRow[]; evo: EvoRow[]; tecnicos: TecRow[] };

type Ficha = {
  tecnicos: Array<{ tecnico: string; cerradas: number; bajas: number; pct_bajas: number; pct_sla20: number }>;
  por_gama: Array<{ gama: string; cerradas: number; bajas: number; pct_bajas: number; pct_sla20: number }>;
  por_marca: Array<{ marca: string; cerradas: number; bajas: number; pct_bajas: number }>;
  por_cliente: Array<{ cliente: string; cerradas: number; bajas: number; pct_bajas: number }>;
  por_provincia: Array<{ provincia: string; cerradas: number }>;
  abiertas_prov: Array<{ provincia: string; abiertas: number; abiertas_30: number }>;
  evolucion: Array<{ mes: string; cerradas: number; pct_bajas: number; pct_sla20: number }>;
};

const DOT: Record<EstadoGlobalDeleg, string> = {
  equilibrado: "bg-emerald-500", atencion: "bg-amber-500",
  critico: "bg-red-500", informacion_insuficiente: "bg-ink/25",
};
const TEXT: Record<EstadoGlobalDeleg, string> = {
  equilibrado: "text-emerald-700", atencion: "text-amber-700",
  critico: "text-red-700", informacion_insuficiente: "text-ink/50",
};
const ORD_ESTADO: Record<EstadoGlobalDeleg, number> = {
  critico: 0, atencion: 1, equilibrado: 2, informacion_insuficiente: 3,
};

const Delta = ({ v, favorable }: { v: number | null; favorable: "up" | "down" }) => {
  if (v == null) return <span className="text-ink/30 text-xs">—</span>;
  const positive = v > 0;
  const neutral = Math.abs(v) < 0.005;
  const good = (positive && favorable === "up") || (!positive && favorable === "down");
  const cls = neutral ? "text-ink/50" : good ? "text-emerald-700" : "text-red-700";
  return (
    <span className={`tabular-nums text-xs ${cls}`}>
      {positive ? "+" : ""}{(v * 100).toFixed(1)}%
    </span>
  );
};

const Delegaciones = () => {
  const { filters, rpcParams, prevRange, modo } = useOpsFilters();
  const [now, setNow] = useState<Data | null>(null);
  const [prev, setPrev] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loadingFicha, setLoadingFicha] = useState(false);
  const [showDefs, setShowDefs] = useState(false);


  const dNow = diasEntre(filters.from, filters.to);
  const dPrev = diasEntre(prevRange.from, prevRange.to);
  const mismasDuraciones = dNow === dPrev;

  const [equiposNow, setEquiposNow] = useState<EquipoRow[]>([]);
  const [equiposPrev, setEquiposPrev] = useState<EquipoRow[]>([]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const paramsNow = {
        p_from: rpcParams.p_from, p_to: rpcParams.p_to,
        p_cliente: rpcParams.p_cliente, p_gama: rpcParams.p_gama, p_familia: rpcParams.p_familia,
      };
      const paramsPrev = { ...paramsNow, p_from: prevRange.from, p_to: prevRange.to };
      const equipNow = {
        p_from: rpcParams.p_from, p_to: rpcParams.p_to,
        p_cliente: rpcParams.p_cliente, p_familia: rpcParams.p_familia,
      };
      const equipPrev = { ...equipNow, p_from: prevRange.from, p_to: prevRange.to };
      const [n, p, eq, eqp] = await Promise.all([
        supabase.rpc("ops_delegaciones" as never, paramsNow as never),
        supabase.rpc("ops_delegaciones" as never, paramsPrev as never),
        supabase.rpc("ops_equipos" as never, equipNow as never),
        supabase.rpc("ops_equipos" as never, equipPrev as never),
      ]);
      setNow((n.data ?? null) as Data | null);
      setPrev((p.data ?? null) as Data | null);
      setEquiposNow((eq.data ?? []) as EquipoRow[]);
      setEquiposPrev((eqp.data ?? []) as EquipoRow[]);
      setLoading(false);
    })();
  }, [rpcParams, prevRange.from, prevRange.to]);


  useEffect(() => {
    if (!selected) { setFicha(null); return; }
    setLoadingFicha(true);
    (async () => {
      const { data } = await supabase.rpc("ops_delegacion_ficha" as never, {
        p_delegacion: selected, p_from: rpcParams.p_from, p_to: rpcParams.p_to,
      } as never);
      setFicha((data ?? null) as Ficha | null);
      setLoadingFicha(false);
    })();
  }, [selected, rpcParams.p_from, rpcParams.p_to]);

  if (loading || !now) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
  }

  const kpisReales = now.kpis.filter((d) => esDelegacionReal(d.delegacion));
  const kpisPrev = (prev?.kpis ?? []).filter((d) => esDelegacionReal(d.delegacion));
  const prevMap = new Map(kpisPrev.map((d) => [d.delegacion, d] as const));

  // Media de empresa: agregada sobre delegaciones reales.
  const empresa = {
    cerradas: kpisReales.reduce((a, r) => a + r.cerradas, 0),
    bajas: kpisReales.reduce((a, r) => a + Math.round(r.pct_bajas * r.cerradas), 0),
    slaW: kpisReales.reduce((a, r) => a + (r.pct_sla20 * r.cerradas), 0),
    tec: kpisReales.reduce((a, r) => a + (r.tecnicos ?? 0), 0),
  };
  const mediaEmpresaBajas = ratioBajas(empresa.bajas, empresa.cerradas);
  const mediaEmpresaSla = empresa.cerradas > 0 ? empresa.slaW / empresa.cerradas : 0;

  // Filas con estado global.
  const rows = kpisReales.map((d) => {
    const p = prevMap.get(d.delegacion) ?? null;
    const bajas = Math.round(d.pct_bajas * d.cerradas);
    const bajasPrev = p ? Math.round(p.pct_bajas * p.cerradas) : null;
    const ratio = ratioBajas(bajas, d.cerradas) ?? 0;
    const dppEmpresa = mediaEmpresaBajas != null ? d.pct_bajas - mediaEmpresaBajas : null;
    const cuota = empresa.cerradas > 0 ? d.cerradas / empresa.cerradas : null;
    const cerradasPorTec = d.tecnicos > 0 ? d.cerradas / d.tecnicos : null;
    const pctEnvejecidas = d.abiertas > 0 ? d.abiertas_30 / d.abiertas : null;
    const vC = variacion(d.cerradas, p?.cerradas ?? null);
    const vB = variacion(bajas, bajasPrev);

    const estado = estadoDelegacionMulti({
      delegacion: d.delegacion,
      cerradas: d.cerradas, cerradasPrev: p?.cerradas ?? null,
      pctBajas: d.pct_bajas, mediaEmpresaBajas,
      pctSla20: d.pct_sla20,
      abiertas: d.abiertas, abiertas30: d.abiertas_30,
    });
    return {
      d, p, bajas, bajasPrev, ratio, dppEmpresa, cuota, cerradasPorTec, pctEnvejecidas, vC, vB, estado,
    };
  }).sort((a, b) => {
    const d = ORD_ESTADO[a.estado.nivel] - ORD_ESTADO[b.estado.nivel];
    if (d !== 0) return d;
    return b.d.cerradas - a.d.cerradas;
  });

  // Consistencia con alertas del dashboard: se marcan aquí las delegaciones
  // cuya caída supera el UMBRAL_ALERTA_CAIDA para el validador de calidad.
  const alertasCaida = new Set<string>();
  for (const r of rows) {
    if (r.vC.pct != null && r.vC.pct <= -UMBRAL_ALERTA_CAIDA) alertasCaida.add(r.d.delegacion);
  }

  const validaciones = validarCalidadDatosDelegaciones(
    rows.map<ValidacionDelegInput>((r) => ({
      delegacion: r.d.delegacion, cerradas: r.d.cerradas, cerradasPrev: r.p?.cerradas ?? null,
      bajas: r.bajas, bajasPrev: r.bajasPrev, pctSla20: r.d.pct_sla20,
      abiertas: r.d.abiertas, abiertas30: r.d.abiertas_30,
    })),
    alertasCaida,
  );

  const hallazgos = generarHallazgosDelegaciones(rows.map<DelegHallazgoInput>((r) => ({
    delegacion: r.d.delegacion, cerradas: r.d.cerradas, cerradasPrev: r.p?.cerradas ?? null,
    bajas: r.bajas, bajasPrev: r.bajasPrev, pctBajas: r.d.pct_bajas,
    mediaEmpresaBajas, pctSla20: r.d.pct_sla20, abiertas30: r.d.abiertas_30, estado: r.estado,
  })));

  const seleccion = selected ? rows.find((r) => r.d.delegacion === selected) ?? null : null;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Red HIPERSERVICE</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">Delegaciones</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Solo delegaciones reales del ERP. Los equipos de gama de Central se ven en la comparativa de equipos;
          los SATs externos y técnicos individuales tienen sus propias secciones.
        </p>
        {/* Cabecera de comparabilidad */}
        <div className="mt-4 border border-black/[0.06] rounded-xl bg-white px-4 py-3 grid sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40 font-semibold">Período actual</p>
            <p className="text-sm text-ink tabular-nums">{labelPeriodo(filters.from, filters.to)} · {dNow} días naturales</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40 font-semibold">Período anterior</p>
            <p className="text-sm text-ink tabular-nums">{labelPeriodo(prevRange.from, prevRange.to)} · {dPrev} días naturales{mismasDuraciones ? " · comparables" : ""}</p>
          </div>
          {!mismasDuraciones && (
            <p className="sm:col-span-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Los dos períodos tienen distinto número de días ({dNow} vs {dPrev}). Interpretar las variaciones de volumen con cautela.
            </p>
          )}
          <p className="sm:col-span-2 text-[12px] text-ink/60 bg-black/[0.02] rounded px-3 py-2 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-ink/40" />
            La variación de volumen no está ajustada por días laborables, vacaciones, ausencias ni capacidad disponible.
          </p>
        </div>
      </header>

      {/* Tabla de delegaciones */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">
          Delegaciones · ordenadas por prioridad de atención
        </p>
        <div className="border border-black/[0.06] rounded-2xl bg-white overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.06] bg-white">
              <tr>
                <Th l>Delegación</Th>
                <Th>Cerradas</Th>
                <Th mu>Ant.</Th>
                <Th>Δ</Th>
                <Th>Bajas</Th>
                <Th mu>Ant.</Th>
                <Th>Δ</Th>
                <Th title="Bajas / Cerradas">Ratio</Th>
                <Th title="Media de empresa Bajas / Cerradas">Media emp.</Th>
                <Th title="Diferencia en puntos porcentuales vs media de empresa">Δ pp emp.</Th>
                <Th title="SLA ≤ 20 días">SLA 20d</Th>
                <Th mu title="SLA medio ponderado de la empresa">SLA emp.</Th>
                <Th>Abiertas</Th>
                <Th title="Abiertas con más de 30 días">+30d</Th>
                <Th title="+30d / Abiertas totales">% env.</Th>
                <Th title="Cerradas de la delegación / total de la empresa">Cuota</Th>
                <Th title="Técnicos con actividad en el período (según maestro)">Técnicos</Th>
                <Th title="Cerradas / técnicos">C/téc.</Th>
                <Th l>Estado</Th>
                <Th l>Observación</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {rows.map((r) => (
                <tr key={r.d.delegacion}
                    className="cursor-pointer hover:bg-black/[0.02]"
                    onClick={() => setSelected(r.d.delegacion)}>
                  <td className="px-4 py-2.5 text-ink font-medium">{r.d.delegacion}</td>
                  <Td>{fmtNum(r.d.cerradas)}</Td>
                  <Td mu>{fmtNum(r.p?.cerradas ?? null)}</Td>
                  <td className="text-right px-3 py-2.5"><Delta v={r.vC.pct} favorable="up" /></td>
                  <Td>{fmtNum(r.bajas)}</Td>
                  <Td mu>{fmtNum(r.bajasPrev)}</Td>
                  <td className="text-right px-3 py-2.5"><Delta v={r.vB.pct} favorable="down" /></td>
                  <Td>{fmtPct(r.ratio)}</Td>
                  <Td mu>{fmtPct(mediaEmpresaBajas)}</Td>
                  <td className="text-right px-3 py-2.5 tabular-nums text-xs">
                    {r.dppEmpresa == null ? "—" : (
                      <span className={r.dppEmpresa >= 0.05 ? "text-red-700" : r.dppEmpresa <= -0.05 ? "text-emerald-700" : "text-ink/60"}>
                        {r.dppEmpresa > 0 ? "+" : ""}{(r.dppEmpresa * 100).toFixed(1)} pp
                      </span>
                    )}
                  </td>
                  <Td>{fmtPct(r.d.pct_sla20)}</Td>
                  <Td mu>{fmtPct(mediaEmpresaSla)}</Td>
                  <Td>{fmtNum(r.d.abiertas)}</Td>
                  <Td>{fmtNum(r.d.abiertas_30)}</Td>
                  <Td>{r.pctEnvejecidas == null ? "—" : fmtPct(r.pctEnvejecidas)}</Td>
                  <Td>{r.cuota == null ? "—" : fmtPct(r.cuota)}</Td>
                  <Td>{fmtNum(r.d.tecnicos)}</Td>
                  <Td>{r.cerradasPorTec == null ? "—" : fmtDec(r.cerradasPorTec, 1)}</Td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${TEXT[r.estado.nivel]}`}
                          title={r.estado.reglaGlobal}>
                      <span className={`h-2 w-2 rounded-full ${DOT[r.estado.nivel]}`} />
                      {LABEL_GLOBAL_DELEG[r.estado.nivel]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-ink/60 max-w-[320px]">{r.estado.observacion}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={20} className="text-center px-4 py-8 text-ink/40 text-sm">Sin delegaciones reales en el período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Hallazgos automáticos */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">
          Hallazgos automáticos (máx. 5) · HECHO / HIPÓTESIS / ACCIÓN
        </p>
        <div className="border border-black/[0.06] rounded-2xl bg-white divide-y divide-black/[0.05]">
          {hallazgos.length === 0 && (
            <p className="px-5 py-6 text-sm text-ink/40">Sin desviaciones materiales en el período.</p>
          )}
          {hallazgos.map((h, i) => (
            <div key={i} className="px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40 font-semibold mb-2">{h.delegacion} · {h.relevancia}</p>
              <p className="text-sm text-ink"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-ink/[0.06] text-ink mr-2">Hecho</span>{h.hecho}</p>
              <p className="text-sm text-ink mt-2"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 mr-2">Hipótesis</span>{h.hipotesis}</p>
              <p className="text-sm text-ink mt-2"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 mr-2">Acción</span>{h.accion}</p>
              <p className="text-[11px] text-ink/40 mt-2">{h.benchmark}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Avisos de calidad de datos */}
      {validaciones.size > 0 && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Avisos de calidad de datos</p>
          <div className="border border-amber-200 bg-amber-50/50 rounded-2xl divide-y divide-amber-100">
            {Array.from(validaciones.entries()).map(([deleg, avisos]) => (
              <div key={deleg} className="px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-amber-800 font-semibold">{deleg}</p>
                <ul className="text-[12px] text-amber-900 list-disc pl-5 mt-1">
                  {avisos.map((a, i) => <li key={i}>{a.mensaje}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Evaluación operativa provisional */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">
          Evaluación operativa provisional de las delegaciones
        </p>
        <p className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
          Esta evaluación es provisional y no debe utilizarse como base única para incentivos, sanciones o decisiones de plantilla.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map((r) => (
            <div key={r.d.delegacion} className="border border-black/[0.06] rounded-xl bg-white p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-sm font-semibold text-ink">{r.d.delegacion}</p>
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${TEXT[r.estado.nivel]}`}>
                  <span className={`h-2 w-2 rounded-full ${DOT[r.estado.nivel]}`} />
                  {LABEL_GLOBAL_DELEG[r.estado.nivel]}
                </span>
              </div>
              <ul className="text-[12px] text-ink/70 space-y-0.5">
                <li>Producción: <span className="text-ink">{r.estado.produccion.nivel}</span> — {r.estado.produccion.regla}</li>
                <li>Calidad: <span className="text-ink">{r.estado.calidad.nivel}</span> — {r.estado.calidad.regla}</li>
                <li>SLA: <span className="text-ink">{r.estado.sla.nivel}</span> — {r.estado.sla.regla}</li>
                <li>Backlog: <span className="text-ink">{r.estado.backlog.nivel}</span> — {r.estado.backlog.regla}</li>
                <li className="text-ink/50">Capacidad: técnicos={r.d.tecnicos}. Días trabajados, ausencias y First Time Fix: no disponibles.</li>
              </ul>
              <p className="text-[11px] text-ink/50 mt-2 italic">{r.estado.reglaGlobal}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Definiciones */}
      <section>
        <button onClick={() => setShowDefs((s) => !s)}
                className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 hover:text-ink transition-colors mb-3">
          {showDefs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Definiciones y umbrales
        </button>
        {showDefs && (
          <div className="border border-black/[0.06] rounded-2xl bg-white p-5 text-[13px] text-ink/70 space-y-2">
            <p><strong className="text-ink">Delegación real</strong>: valor no vacío de <code>ops_fact_ot.delegacion</code>. Se excluyen "Gama PAE/Marrón/Blanca/Movilidad/Clima" (equipos) y OTs con delegación NULL (red SAT externa).</p>
            <p><strong className="text-ink">Bajas / Cerradas</strong>: bajas del período divididas entre cerradas del período. Una baja cuenta como cierre.</p>
            <p><strong className="text-ink">Δ pp empresa</strong>: diferencia en puntos porcentuales entre el ratio de bajas de la delegación y la media agregada de las delegaciones reales.</p>
            <p><strong className="text-ink">% envejecidas</strong>: OTs abiertas con más de 30 días / OTs abiertas totales de la delegación.</p>
            <p><strong className="text-ink">Umbral muestra insuficiente</strong>: {UMBRAL_MIN_DELEGACION} cierres. Por debajo se marca información insuficiente y no se clasifica.</p>
            <p><strong className="text-ink">Umbral compartido con alertas del dashboard</strong>: caída ≥ {(UMBRAL_ALERTA_CAIDA * 100).toFixed(0)}% en cierres vs período anterior. Se valida coherencia entre tabla y alertas.</p>
            <p><strong className="text-ink">Backlog crítico</strong>: ≥ 20 OTs +30d Y ≥ 30% del backlog abierto de la delegación.</p>
            <p className="text-ink/50 italic">La lógica de estado global reside en <code>src/lib/ops-performance.ts</code> (funciones puras y testeadas).</p>
          </div>
        )}
      </section>

      {/* Drawer de detalle */}
      {seleccion && (
        <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <aside className="absolute right-0 top-0 h-full w-full max-w-3xl bg-bone overflow-y-auto shadow-2xl"
                 onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-bone/95 backdrop-blur border-b border-black/[0.06] px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40 font-semibold">Ficha de delegación</p>
                <p className="font-display text-2xl tracking-tight text-ink">{seleccion.d.delegacion}</p>
                <p className="text-xs text-ink/50 mt-0.5">{labelPeriodo(filters.from, filters.to)} · {seleccion.d.tecnicos} técnicos</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded-md hover:bg-black/[0.04] text-ink/60"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-6 py-6 space-y-6">
              <FichaResumen r={seleccion} mediaEmpresaBajas={mediaEmpresaBajas} mediaEmpresaSla={mediaEmpresaSla} />
              {loadingFicha && <Loader2 className="h-5 w-5 animate-spin text-ink/40" />}
              {ficha && <FichaDetalle f={ficha} estado={seleccion.estado} />}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

const Th = ({ children, l, mu, title }: { children: React.ReactNode; l?: boolean; mu?: boolean; title?: string }) => (
  <th title={title} className={`px-3 py-2.5 font-semibold ${l ? "text-left" : "text-right"} ${mu ? "text-ink/40" : ""}`}>{children}</th>
);
const Td = ({ children, mu }: { children: React.ReactNode; mu?: boolean }) => (
  <td className={`text-right px-3 py-2.5 tabular-nums ${mu ? "text-ink/50" : ""}`}>{children}</td>
);

const FichaResumen = ({ r, mediaEmpresaBajas, mediaEmpresaSla }: {
  r: { d: KpiRow; bajas: number; ratio: number; dppEmpresa: number | null; estado: EstadoDelegacionMulti; vC: { pct: number | null } };
  mediaEmpresaBajas: number | null;
  mediaEmpresaSla: number;
}) => (
  <>
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${TEXT[r.estado.nivel]}`}>
          <span className={`h-2 w-2 rounded-full ${DOT[r.estado.nivel]}`} />
          {LABEL_GLOBAL_DELEG[r.estado.nivel]}
        </span>
      </div>
      <p className="text-sm text-ink/70">{r.estado.reglaGlobal}</p>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Metric label="Cerradas" value={fmtNum(r.d.cerradas)} sub={r.vC.pct != null ? `${(r.vC.pct * 100).toFixed(1)}% vs ant.` : "—"} />
      <Metric label="Bajas / Cerradas" value={fmtPct(r.ratio)} sub={`Emp. ${fmtPct(mediaEmpresaBajas)} · ${r.dppEmpresa == null ? "—" : ((r.dppEmpresa > 0 ? "+" : "") + (r.dppEmpresa * 100).toFixed(1) + " pp")}`} />
      <Metric label="SLA ≤20d" value={fmtPct(r.d.pct_sla20)} sub={`Emp. ${fmtPct(mediaEmpresaSla)}`} />
      <Metric label="Abiertas +30d" value={`${fmtNum(r.d.abiertas_30)} / ${fmtNum(r.d.abiertas)}`} sub={r.d.abiertas > 0 ? `${((r.d.abiertas_30 / r.d.abiertas) * 100).toFixed(1)}% del backlog` : "—"} />
    </div>
  </>
);

const Metric = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="border border-black/[0.06] rounded-xl bg-white p-3">
    <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40 font-semibold">{label}</p>
    <p className="font-display text-xl tabular-nums text-ink mt-1">{value}</p>
    {sub && <p className="text-[11px] text-ink/50">{sub}</p>}
  </div>
);

const FichaDetalle = ({ f, estado }: { f: Ficha; estado: EstadoDelegacionMulti }) => {
  const totalCerr = f.tecnicos.reduce((a, t) => a + t.cerradas, 0);
  const totalBajas = f.tecnicos.reduce((a, t) => a + t.bajas, 0);
  const top1 = f.tecnicos[0];
  const top3 = f.tecnicos.slice(0, 3).reduce((a, t) => a + t.cerradas, 0);
  const cuotaTop1 = totalCerr > 0 && top1 ? top1.cerradas / totalCerr : null;
  const cuotaTop3 = totalCerr > 0 ? top3 / totalCerr : null;

  const avisos: string[] = [];
  if (cuotaTop1 != null && cuotaTop1 >= 0.4) avisos.push(`El técnico principal (${top1.tecnico}) concentra ${(cuotaTop1 * 100).toFixed(0)}% de los cierres — dependencia elevada.`);
  const topBajasTec = f.tecnicos.slice().sort((a, b) => b.bajas - a.bajas)[0];
  if (topBajasTec && totalBajas > 0 && topBajasTec.bajas / totalBajas >= 0.4)
    avisos.push(`${topBajasTec.tecnico} aporta ${((topBajasTec.bajas / totalBajas) * 100).toFixed(0)}% de las bajas — revisar carga asignada y mix antes de concluir.`);

  return (
    <>
      <Section title="Composición del equipo">
        <p className="text-[12px] text-ink/60 mb-2">
          Distribución de cierres y bajas por técnico. Top 1: <strong>{cuotaTop1 == null ? "—" : (cuotaTop1 * 100).toFixed(0)}%</strong> · Top 3: <strong>{cuotaTop3 == null ? "—" : (cuotaTop3 * 100).toFixed(0)}%</strong> de los cierres.
        </p>
        {avisos.map((a, i) => (
          <p key={i} className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-1.5 mb-1 flex items-start gap-2">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{a}
          </p>
        ))}
        <MiniTable
          head={["Técnico", "Cerradas", "Bajas", "% Bajas", "SLA 20d"]}
          rows={f.tecnicos.map((t) => [t.tecnico, fmtNum(t.cerradas), fmtNum(t.bajas), fmtPct(t.pct_bajas), fmtPct(t.pct_sla20)])}
        />
      </Section>

      <Section title="Drivers por gama">
        <MiniTable head={["Gama", "Cerradas", "Bajas", "% Bajas", "SLA 20d"]}
                   rows={f.por_gama.map((g) => [g.gama, fmtNum(g.cerradas), fmtNum(g.bajas), fmtPct(g.pct_bajas), fmtPct(g.pct_sla20)])} />
      </Section>
      <Section title="Drivers por marca">
        <MiniTable head={["Marca", "Cerradas", "Bajas", "% Bajas"]}
                   rows={f.por_marca.map((m) => [m.marca, fmtNum(m.cerradas), fmtNum(m.bajas), fmtPct(m.pct_bajas)])} />
      </Section>
      <Section title="Drivers por cliente">
        <MiniTable head={["Cliente", "Cerradas", "Bajas", "% Bajas"]}
                   rows={f.por_cliente.map((c) => [c.cliente, fmtNum(c.cerradas), fmtNum(c.bajas), fmtPct(c.pct_bajas)])} />
      </Section>
      <Section title="Territorio">
        <MiniTable head={["Provincia", "Cerradas"]} rows={f.por_provincia.map((p) => [p.provincia, fmtNum(p.cerradas)])} />
      </Section>
      <Section title="Abiertas +30 días por provincia">
        {f.abiertas_prov.length === 0
          ? <p className="text-xs text-ink/40">Sin OTs +30 días.</p>
          : <MiniTable head={["Provincia", "Abiertas", "+30d"]}
                       rows={f.abiertas_prov.map((p) => [p.provincia, fmtNum(p.abiertas), fmtNum(p.abiertas_30)])} />}
      </Section>

      <Section title="Acciones de dirección">
        <ul className="text-[12px] text-ink/70 list-disc pl-5 space-y-1">
          <li><strong className="text-ink">Acción inmediata:</strong> {estado.nivel === "critico" ? "reunión de dirección con la delegación esta semana." : estado.nivel === "atencion" ? "revisar la dimensión afectada antes del próximo comité." : "seguimiento habitual."}</li>
          <li><strong className="text-ink">Investigación requerida:</strong> descomponer por técnico, gama y cliente; no responsabilizar sin revisar carga, ausencias y territorio.</li>
          <li><strong className="text-ink">Datos que faltan:</strong> capacidad diaria disponible, ausencias, First Time Fix, reincidencias, motivos codificados de baja, satisfacción, reclamaciones.</li>
          <li><strong className="text-ink">Área responsable:</strong> Dirección Operaciones — Delegaciones (con Calidad y RRHH según dimensión afectada).</li>
        </ul>
      </Section>
    </>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">{title}</p>
    {children}
  </div>
);

const MiniTable = ({ head, rows }: { head: string[]; rows: (string | number)[][] }) => (
  <div className="border border-black/[0.06] rounded-xl bg-white overflow-hidden">
    <table className="w-full text-[12px]">
      <thead className="bg-black/[0.02] text-ink/50 text-[10px] uppercase tracking-[0.14em]">
        <tr>{head.map((h, i) => <th key={i} className={`px-3 py-2 ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-black/[0.04]">
        {rows.length === 0 && <tr><td colSpan={head.length} className="text-center px-3 py-4 text-ink/40">Sin datos.</td></tr>}
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => <td key={j} className={`px-3 py-1.5 ${j === 0 ? "text-left text-ink" : "text-right tabular-nums text-ink/80"}`}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default Delegaciones;
