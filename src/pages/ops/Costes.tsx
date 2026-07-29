import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtEur, fmtNum, fmtPct } from "@/lib/ops-filters";
import { Loader2, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpsPeriodPicker } from "@/components/ops/OpsPeriodPicker";
import { variacion, labelPeriodo, diasEntre } from "@/lib/ops-performance";
import {
  componentesCoste,
  contribucionParcial,
  lecturaCoste,
  lecturaCostePorCerrada,
  estadoProductividad,
  ordenProductividad,
  generarHallazgosCostes,
  validarCalidadDatosCostes,
  medianaLocal,
  LABEL_PRODUCTIVIDAD,
  type EstadoProductividad,
  type LecturaKpi,
  type ClasificacionProductividad,
} from "@/lib/ops-costes";

// ─── Tipos payload ──────────────────────────────────────────────────────────
type Kpis = {
  coste: number; cierres: number; eur_cierre: number;
  coste_sat: number; coste_desplazamiento: number; ingreso_cli: number;
  cerradas_totales: number; cerradas_con_ingreso: number;
  cerradas_con_coste_sat: number; cerradas_con_desplazamiento: number;
  bajas: number; sla20: number;
};
type EvoRow = { mes: string; coste: number; cierres: number; eur_cierre: number };
type EqRow = { equipo: string; tecnicos: number; coste: number; cierres: number; eur_cierre: number; variable: number };
type TecRow = { tecnico: string; equipo: string; coste: number; cierres: number; eur_cierre: number };
type Payload = { kpis: Kpis; evolucion: EvoRow[]; equipos: EqRow[]; tecnicos: TecRow[] };

type EntidadRow = {
  entidad: string; cerradas: number; bajas: number;
  pct_bajas: number | null; pct_sla20: number | null;
  coste_directo: number; coste_sat: number; coste_desplazamiento: number;
  ingreso_cli: number; cerradas_con_ingreso: number;
  eur_cierre: number | null; contribucion_parcial: number | null;
  tipo_coste: string;
};

type Vista = "delegaciones" | "tecnicos" | "sats" | "clientes" | "gamas";

const VISTAS: { key: Vista; label: string; disclaimer?: string }[] = [
  { key: "delegaciones", label: "Delegaciones", disclaimer: "Solo técnicos propios. Coste = nómina + desplazamiento." },
  { key: "tecnicos", label: "Técnicos internos", disclaimer: "Solo técnicos con nómina casada. Coste = nómina + desplazamiento." },
  { key: "sats", label: "SATs externos", disclaimer: "Coste = factura SAT. Metodología distinta a técnicos internos — no comparar directamente." },
  { key: "clientes", label: "Clientes", disclaimer: "Coste directo = SAT externo + desplazamiento. Excluye nómina interna imputada." },
  { key: "gamas", label: "Gamas", disclaimer: "Coste directo = SAT externo + desplazamiento. Excluye nómina interna imputada." },
];

const MES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesLabel = (iso: string) => {
  const d = new Date(iso);
  return `${MES_ES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
};

const firstOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
const lastOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
const monthKey = (iso: string) => iso.slice(0, 7);
const monthsBetween = (from: string, to: string) => {
  const f = new Date(from + "T00:00:00Z");
  const t = new Date(to + "T00:00:00Z");
  return (t.getUTCFullYear() - f.getUTCFullYear()) * 12 + (t.getUTCMonth() - f.getUTCMonth()) + 1;
};
const shiftMonths = (iso: string, delta: number) => {
  const d = new Date(iso + "T00:00:00Z");
  return firstOfMonth(d.getUTCFullYear(), d.getUTCMonth() + delta);
};

const fetchCostes = async (from: string, to: string) => {
  const { data, error } = await supabase.rpc("ops_costes" as never, { p_from: from, p_to: to } as never);
  if (error) throw error;
  return data as unknown as Payload;
};

const fetchEntidades = async (from: string, to: string, vista: Vista) => {
  const { data, error } = await supabase.rpc("ops_costes_entidades" as never, { p_from: from, p_to: to, p_vista: vista } as never);
  if (error) throw error;
  return (data ?? []) as unknown as EntidadRow[];
};

const defaultRange = () => {
  const now = new Date();
  return { from: firstOfMonth(2026, 0), to: lastOfMonth(now.getUTCFullYear(), now.getUTCMonth()) };
};

// ─── Componente ─────────────────────────────────────────────────────────────
const Costes = () => {
  const [range, setRange] = useState(defaultRange);
  const [data, setData] = useState<Payload | null>(null);
  const [prev, setPrev] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [openTec, setOpenTec] = useState(false);
  const [openDef, setOpenDef] = useState(false);
  const [openInv, setOpenInv] = useState(false);
  const [vista, setVista] = useState<Vista>("delegaciones");
  const [entidades, setEntidades] = useState<EntidadRow[]>([]);
  const [loadingEnt, setLoadingEnt] = useState(false);
  const [umbral, setUmbral] = useState(20);

  const prevInfo = useMemo(() => {
    const n = monthsBetween(range.from, range.to);
    const prevFrom = shiftMonths(range.from, -n);
    const prevToStart = shiftMonths(range.from, -1);
    const prevTo = lastOfMonth(Number(prevToStart.slice(0, 4)), Number(prevToStart.slice(5, 7)) - 1);
    return { from: prevFrom, to: prevTo };
  }, [range]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    (async () => {
      try {
        const [cur, prv] = await Promise.all([
          fetchCostes(range.from, range.to),
          fetchCostes(prevInfo.from, prevInfo.to),
        ]);
        if (cancel) return;
        setData(cur); setPrev(prv?.kpis ?? null);
      } catch (e) {
        console.error("[ops_costes]", e);
        if (!cancel) { setData(null); setPrev(null); }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [range, prevInfo]);

  useEffect(() => {
    let cancel = false;
    setLoadingEnt(true);
    (async () => {
      try {
        const rows = await fetchEntidades(range.from, range.to, vista);
        if (!cancel) setEntidades(rows);
      } catch (e) {
        console.error("[ops_costes_entidades]", e);
        if (!cancel) setEntidades([]);
      } finally {
        if (!cancel) setLoadingEnt(false);
      }
    })();
    return () => { cancel = true; };
  }, [range, vista]);

  const evo18 = useMemo(() => {
    if (!data) return [] as EvoRow[];
    const end = new Date(range.to + "T00:00:00Z");
    const keys: string[] = [];
    for (let i = 17; i >= 0; i--) {
      const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1));
      keys.push(firstOfMonth(d.getUTCFullYear(), d.getUTCMonth()).slice(0, 7));
    }
    const map = new Map(data.evolucion.map((r) => [monthKey(r.mes), r]));
    return keys.map((k) => map.get(k) ?? { mes: `${k}-01`, coste: 0, cierres: 0, eur_cierre: 0 });
  }, [data, range.to]);

  // Comparabilidad de días
  const diasAct = diasEntre(range.from, range.to);
  const diasPrev = diasEntre(prevInfo.from, prevInfo.to);
  const comparabilidad = diasAct === diasPrev;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Rentabilidad plantilla y red</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">Coste y productividad</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-3xl">
          Coste laboral y coste de red externa por entidad, con productividad ajustada por calidad. Este análisis es una <strong>referencia operativa</strong>: no es base única de decisiones de nómina, proveedores o plantilla.
        </p>
      </header>

      {/* Selector de período + comparabilidad */}
      <div className="flex flex-wrap items-center gap-4 border border-black/[0.06] rounded-2xl bg-white px-5 py-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Período</span>
          <OpsPeriodPicker value={range} onChange={(v) => setRange(v)} />
        </div>
        <div className="flex flex-col gap-1 text-xs text-ink/60">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Comparativa</span>
          <span>Actual: {labelPeriodo(range.from, range.to)} · {diasAct}d</span>
          <span>Previo: {labelPeriodo(prevInfo.from, prevInfo.to)} · {diasPrev}d</span>
        </div>
        {!comparabilidad && (
          <span className="text-[11px] px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            Períodos con distinta duración — variaciones pueden reflejar cobertura de días.
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={() => setRange(defaultRange())}>Restablecer</Button>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>
      ) : (
        <>
          {/* Resumen ejecutivo — 6 tarjetas tri-tonales */}
          <ResumenEjecutivo cur={data.kpis} prv={prev} />

          {/* Composición del coste */}
          <ComposicionCoste kpis={data.kpis} prev={prev} />

          {/* Evolución 18 meses */}
          <section className="border border-black/[0.06] rounded-2xl bg-white p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-1">Evolución 18 meses</p>
            <h2 className="font-display text-lg tracking-tight text-ink mb-5">Cierres y €/cierre por mes</h2>
            <EvoChart rows={evo18} />
          </section>

          {/* Vista por entidad */}
          <VistaEntidad
            vista={vista}
            onVistaChange={setVista}
            rows={entidades}
            loading={loadingEnt}
            umbral={umbral}
            onUmbralChange={setUmbral}
          />

          {/* Detalle técnicos (legacy conservado) */}
          <section className="border border-black/[0.06] rounded-2xl bg-white overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 border-b border-black/[0.05] hover:bg-ink/[0.015]"
              onClick={() => setOpenTec((o) => !o)}
            >
              <div className="text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Nómina interna</p>
                <h2 className="font-display text-lg tracking-tight text-ink">Detalle por técnico ({data.tecnicos?.length ?? 0})</h2>
              </div>
              {openTec ? <ChevronDown className="h-4 w-4 text-ink/50" /> : <ChevronRight className="h-4 w-4 text-ink/50" />}
            </button>
            {openTec && <TecnicosTable rows={data.tecnicos ?? []} />}
          </section>

          {/* Inventario de fuentes de coste */}
          <section className="border border-black/[0.06] rounded-2xl bg-white overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 border-b border-black/[0.05] hover:bg-ink/[0.015]"
              onClick={() => setOpenInv((o) => !o)}
            >
              <div className="text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Metodología</p>
                <h2 className="font-display text-lg tracking-tight text-ink">Inventario de fuentes de coste</h2>
              </div>
              {openInv ? <ChevronDown className="h-4 w-4 text-ink/50" /> : <ChevronRight className="h-4 w-4 text-ink/50" />}
            </button>
            {openInv && <InventarioFuentes kpis={data.kpis} />}
          </section>

          {/* Definiciones */}
          <section className="border border-black/[0.06] rounded-2xl bg-white overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 border-b border-black/[0.05] hover:bg-ink/[0.015]"
              onClick={() => setOpenDef((o) => !o)}
            >
              <div className="text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Glosario</p>
                <h2 className="font-display text-lg tracking-tight text-ink">Definiciones de métricas y estados</h2>
              </div>
              {openDef ? <ChevronDown className="h-4 w-4 text-ink/50" /> : <ChevronRight className="h-4 w-4 text-ink/50" />}
            </button>
            {openDef && <Definiciones />}
          </section>
        </>
      )}
    </div>
  );
};

// ─── Resumen ejecutivo ──────────────────────────────────────────────────────
const ResumenEjecutivo = ({ cur, prv }: { cur: Kpis; prv: Kpis | null }) => {
  const cobIngresoAct = cur.cerradas_totales > 0 ? cur.cerradas_con_ingreso / cur.cerradas_totales : 0;
  const cobIngresoPrev = prv && prv.cerradas_totales > 0 ? prv.cerradas_con_ingreso / prv.cerradas_totales : null;

  const totalCoste = cur.coste + cur.coste_sat + cur.coste_desplazamiento;
  const totalCostePrev = prv ? prv.coste + prv.coste_sat + prv.coste_desplazamiento : null;

  const eurCierreAct = cur.cierres > 0 ? totalCoste / cur.cierres : 0;
  const eurCierrePrev = prv && prv.cierres > 0 ? totalCostePrev! / prv.cierres : null;

  const lecCoste = lecturaCoste({
    costeAct: totalCoste, costePrev: totalCostePrev,
    cerradasAct: cur.cierres, cerradasPrev: prv?.cierres ?? null,
    bajasAct: cur.bajas, bajasPrev: prv?.bajas ?? null,
    ingresoCoberturaAct: cobIngresoAct, ingresoCoberturaPrev: cobIngresoPrev,
  });
  const lecEur = lecturaCostePorCerrada(eurCierreAct, eurCierrePrev);
  const vCierres = variacion(cur.cierres, prv?.cierres ?? null);
  const contrib = contribucionParcial({
    ingresoCli: cur.ingreso_cli, costesDirectos: totalCoste,
    cerradasConIngreso: cur.cerradas_con_ingreso, cerradasTotales: cur.cerradas_totales,
  });

  const tarjetas = [
    { clave: "coste", etiqueta: "Coste operativo total", valor: fmtEur(totalCoste),
      variacion: totalCostePrev != null ? `${((totalCoste / totalCostePrev - 1) * 100).toFixed(1)}% vs previo` : "—",
      lectura: lecCoste.lectura, motivo: lecCoste.motivo,
      definicion: "Nómina interna + coste SAT externo + desplazamiento. Excluye repuestos, logística y retrabajo (no disponibles)." },
    { clave: "eur_cierre", etiqueta: "€ / cierre (mixto)", valor: fmtEur(Math.round(eurCierreAct)),
      variacion: eurCierrePrev != null ? `${((eurCierreAct / eurCierrePrev - 1) * 100).toFixed(1)}% vs previo` : "—",
      lectura: lecEur.lectura, motivo: lecEur.motivo,
      definicion: "Coste total ÷ cierres. Mezcla nómina interna y facturación SAT — la comparación entre técnicos internos y externos requiere segmentar." },
    { clave: "cierres", etiqueta: "Cierres (incluye bajas)", valor: fmtNum(cur.cierres),
      variacion: vCierres.pct != null ? `${(vCierres.pct * 100).toFixed(1)}% vs previo` : "—",
      lectura: (vCierres.pct == null ? "neutro" : vCierres.pct >= 0 ? "favorable" : "requiere_interpretacion") as LecturaKpi,
      motivo: vCierres.pct != null && vCierres.pct < 0 ? "Menor volumen puede reflejar carga o capacidad, no rendimiento." : "",
      definicion: "OTs con situación Cerrado o Baja en el período." },
    { clave: "sla", etiqueta: "SLA ≤ 20d", valor: fmtPct(cur.cierres > 0 ? cur.sla20 / cur.cierres : 0),
      variacion: prv && prv.cierres > 0 ? `${(((cur.sla20 / cur.cierres) - (prv.sla20 / prv.cierres)) * 100).toFixed(1)} pp vs previo` : "—",
      lectura: (cur.cierres > 0 && cur.sla20 / cur.cierres >= 0.60 ? "favorable" : "desfavorable") as LecturaKpi,
      motivo: "Porcentaje de cierres dentro de 20 días laborables.",
      definicion: "% de OTs cerradas en ≤20 días laborables." },
    { clave: "bajas", etiqueta: "Ratio bajas", valor: fmtPct(cur.cierres > 0 ? cur.bajas / cur.cierres : 0),
      variacion: prv && prv.cierres > 0 ? `${(((cur.bajas / cur.cierres) - (prv.bajas / prv.cierres)) * 100).toFixed(1)} pp vs previo` : "—",
      lectura: (cur.cierres > 0 && prv && prv.cierres > 0 && (cur.bajas / cur.cierres) > (prv.bajas / prv.cierres) + 0.01 ? "desfavorable" : "neutro") as LecturaKpi,
      motivo: "Ratio ajusta el interpretar del coste por cerrada.",
      definicion: "Bajas ÷ cierres. Contextualiza calidad." },
    { clave: "contrib", etiqueta: "Contribución operativa (parcial)", valor: contrib.valor != null ? fmtEur(Math.round(contrib.valor)) : "n/d",
      variacion: contrib.completitud != null ? `Cobertura ingreso ${(contrib.completitud * 100).toFixed(0)}%` : "Sin ingreso",
      lectura: "requiere_interpretacion" as LecturaKpi,
      motivo: contrib.etiqueta,
      definicion: "Ingreso cliente (fact_cli) − coste directo. No es margen, EBITDA ni rentabilidad." },
  ];

  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Resumen ejecutivo</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tarjetas.map((t) => (
          <TarjetaEj key={t.clave} {...t} />
        ))}
      </div>
    </section>
  );
};

const toneKpi: Record<LecturaKpi, string> = {
  favorable: "text-emerald-700 bg-emerald-50 border-emerald-200",
  desfavorable: "text-red-700 bg-red-50 border-red-200",
  requiere_interpretacion: "text-amber-700 bg-amber-50 border-amber-200",
  neutro: "text-ink/60 bg-ink/[0.03] border-black/[0.06]",
};

const labelLectura: Record<LecturaKpi, string> = {
  favorable: "Favorable",
  desfavorable: "Desfavorable",
  requiere_interpretacion: "Requiere interpretación",
  neutro: "Neutro",
};

const TarjetaEj = ({ etiqueta, valor, variacion, lectura, motivo, definicion }: {
  etiqueta: string; valor: string; variacion: string; lectura: LecturaKpi; motivo: string; definicion: string;
}) => (
  <div className="border border-black/[0.06] rounded-2xl bg-white p-5 flex flex-col gap-2" title={definicion}>
    <div className="flex items-start justify-between gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{etiqueta}</p>
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${toneKpi[lectura]}`}>{labelLectura[lectura]}</span>
    </div>
    <p className="font-display text-2xl tabular-nums text-ink">{valor}</p>
    <p className="text-xs text-ink/60">{variacion}</p>
    {motivo && <p className="text-[11px] text-ink/50 leading-relaxed">{motivo}</p>}
  </div>
);

// ─── Composición del coste ──────────────────────────────────────────────────
const ComposicionCoste = ({ kpis, prev }: { kpis: Kpis; prev: Kpis | null }) => {
  const comps = componentesCoste({
    nomina: kpis.coste, sat: kpis.coste_sat, desplazamiento: kpis.coste_desplazamiento,
    cerradasTotales: kpis.cerradas_totales,
    cerradasConCosteSat: kpis.cerradas_con_coste_sat,
    cerradasConDesplazamiento: kpis.cerradas_con_desplazamiento,
  });
  const total = comps.reduce((s, c) => s + (c.importe ?? 0), 0);

  const avisos = validarCalidadDatosCostes({
    cerradasTotales: kpis.cerradas_totales,
    cerradasConIngreso: kpis.cerradas_con_ingreso,
    cerradasConCosteSat: kpis.cerradas_con_coste_sat,
    cerradasConDesplazamiento: kpis.cerradas_con_desplazamiento,
    coste: kpis.coste + kpis.coste_sat + kpis.coste_desplazamiento,
    cierres: kpis.cierres,
    costePrev: prev ? prev.coste + prev.coste_sat + prev.coste_desplazamiento : null,
    ciclesPrev: prev?.cierres ?? null,
  });

  return (
    <section className="border border-black/[0.06] rounded-2xl bg-white p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-1">Composición del coste</p>
      <h2 className="font-display text-lg tracking-tight text-ink mb-4">Qué está incluido y qué no</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {comps.map((c) => (
          <div key={c.clave} className="border border-black/[0.05] rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-1">
              <span className="text-sm font-medium text-ink">{c.etiqueta}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.tipo === "real_registrado" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-ink/[0.04] text-ink/50 border border-black/[0.06]"}`}>
                {c.tipo === "real_registrado" ? "Real registrado" : "No disponible"}
              </span>
            </div>
            <p className="font-display text-lg tabular-nums text-ink">
              {c.importe != null ? fmtEur(c.importe) : "n/d"}
              {c.importe != null && total > 0 && (
                <span className="text-xs text-ink/50 ml-2">({((c.importe / total) * 100).toFixed(0)}%)</span>
              )}
            </p>
            {c.cobertura != null && c.cobertura > 0 && (
              <p className="text-[11px] text-ink/50 mt-1">Cobertura: {(c.cobertura * 100).toFixed(0)}% de OTs</p>
            )}
            <p className="text-[11px] text-ink/50 leading-relaxed mt-1">{c.metodologia}</p>
          </div>
        ))}
      </div>
      {avisos.length > 0 && (
        <div className="mt-4 border border-amber-200 bg-amber-50 rounded-xl p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800 mb-1">Avisos de calidad de datos</p>
          <ul className="text-xs text-amber-900 space-y-0.5 list-disc list-inside">
            {avisos.map((a, i) => <li key={i}>{a.mensaje}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
};

// ─── Vista por entidad ──────────────────────────────────────────────────────
const VistaEntidad = ({ vista, onVistaChange, rows, loading, umbral, onUmbralChange }: {
  vista: Vista; onVistaChange: (v: Vista) => void;
  rows: EntidadRow[]; loading: boolean;
  umbral: number; onUmbralChange: (n: number) => void;
}) => {
  const meta = VISTAS.find((v) => v.key === vista)!;
  const mediana = useMemo(() => medianaLocal(rows.map((r) => r.eur_cierre ?? 0)), [rows]);
  const ratioBajasMed = useMemo(() => {
    const vals = rows.map((r) => r.pct_bajas).filter((n): n is number => n != null && n > 0);
    return vals.length ? vals.sort((a, b) => a - b)[Math.floor(vals.length / 2)] : null;
  }, [rows]);

  const filas = useMemo(() => {
    return rows.map((r) => {
      const clas = estadoProductividad({
        entidad: r.entidad, cerradas: r.cerradas,
        pctBajas: r.pct_bajas, pctSla20: r.pct_sla20,
        eurCierre: r.eur_cierre, eurCierreMediana: mediana,
        ratioBajasMediana: ratioBajasMed, umbralMin: umbral,
      });
      return { ...r, clasificacion: clas };
    }).sort((a, b) => ordenProductividad[a.clasificacion.nivel] - ordenProductividad[b.clasificacion.nivel]);
  }, [rows, mediana, ratioBajasMed, umbral]);

  const hallazgos = useMemo(() => generarHallazgosCostes(filas.map((f) => ({
    entidad: f.entidad, cerradas: f.cerradas, pctBajas: f.pct_bajas, pctSla20: f.pct_sla20,
    eurCierre: f.eur_cierre, eurCierreMediana: mediana, ratioBajasMediana: ratioBajasMed, umbralMin: umbral,
    clasificacion: f.clasificacion,
  }))), [filas, mediana, ratioBajasMed, umbral]);

  const avisos = useMemo(() => validarCalidadDatosCostes({
    cerradasTotales: rows.reduce((s, r) => s + r.cerradas, 0),
    cerradasConIngreso: rows.reduce((s, r) => s + r.cerradas_con_ingreso, 0),
    cerradasConCosteSat: null, cerradasConDesplazamiento: null,
    coste: null, cierres: null, costePrev: null, ciclesPrev: null,
    filas: rows.map((r) => ({ entidad: r.entidad, cerradas: r.cerradas, costeDirecto: r.coste_directo })),
  }), [rows]);

  return (
    <section className="border border-black/[0.06] rounded-2xl bg-white overflow-hidden">
      <div className="px-6 py-5 border-b border-black/[0.05]">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-1">Vista por entidad</p>
            <h2 className="font-display text-xl tracking-tight text-ink">Productividad ajustada por calidad</h2>
            <p className="text-xs text-ink/50 mt-1">Mediana €/cierre en esta vista: {fmtEur(mediana)}{ratioBajasMed != null && ` · Ratio bajas mediana: ${(ratioBajasMed * 100).toFixed(1)}%`}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {VISTAS.map((v) => (
              <button
                key={v.key}
                onClick={() => onVistaChange(v.key)}
                className={`text-xs px-3 py-1.5 rounded-full border ${vista === v.key ? "bg-ink text-bone border-ink" : "bg-white text-ink/70 border-black/[0.08] hover:border-ink/40"}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <label className="text-[11px] text-ink/60">
            Muestra mínima:
            <input
              type="number" min={5} max={200} value={umbral}
              onChange={(e) => onUmbralChange(Math.max(5, Math.min(200, Number(e.target.value) || 20)))}
              className="ml-2 w-16 border border-black/[0.08] rounded px-2 py-0.5 text-xs"
            />
          </label>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-ink/[0.04] text-ink/60 border border-black/[0.06] inline-flex items-center gap-1">
            <Info className="h-3 w-3" /> {meta.disclaimer}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-ink/40" /></div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.05] sticky top-0 bg-white">
                  <th className="px-4 py-3">Entidad</th>
                  <th className="px-4 py-3 text-right">Cierres</th>
                  <th className="px-4 py-3 text-right">%Bajas</th>
                  <th className="px-4 py-3 text-right">SLA ≤20d</th>
                  <th className="px-4 py-3 text-right">Coste directo</th>
                  <th className="px-4 py-3 text-right">€ / cierre</th>
                  <th className="px-4 py-3 text-right">Contribución parcial</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((r) => (
                  <FilaEntidad key={r.entidad} r={r} mediana={mediana} />
                ))}
                {filas.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-ink/50 text-xs">Sin datos en el período.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {hallazgos.length > 0 && (
            <div className="border-t border-black/[0.05] px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Hallazgos operativos (máx 5)</p>
              <div className="space-y-3">
                {hallazgos.map((h, i) => (
                  <div key={i} className="border border-black/[0.06] rounded-xl p-4 bg-ink/[0.015]">
                    <p className="text-sm text-ink"><strong className="text-ink/70">Hecho:</strong> {h.hecho}</p>
                    <p className="text-xs text-ink/60 mt-1"><strong className="text-ink/70">Hipótesis:</strong> {h.hipotesis}</p>
                    <p className="text-xs text-ink/60 mt-1"><strong className="text-ink/70">Acción:</strong> {h.accion}</p>
                    <p className="text-[11px] text-ink/45 mt-2">{h.benchmark} · {h.relevancia}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {avisos.length > 0 && (
            <div className="border-t border-black/[0.05] px-6 py-4 bg-amber-50/40">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800 mb-2">Avisos de calidad</p>
              <ul className="text-xs text-amber-900 space-y-0.5 list-disc list-inside">
                {avisos.slice(0, 8).map((a, i) => <li key={i}>{a.mensaje}</li>)}
              </ul>
            </div>
          )}

          <div className="border-t border-black/[0.05] px-6 py-4 bg-ink/[0.02]">
            <p className="text-[11px] text-ink/60 leading-relaxed">
              <strong className="text-ink/80">Aviso.</strong> Los estados de productividad son <em>provisionales</em> y se basan
              en coste directo disponible, ratio de bajas y SLA. No incorporan carga asignada, mix real de producto,
              ausencias, satisfacción del cliente, reincidencias ni causas externas. No usar como base única para decisiones
              de nómina, plantilla, cambios de proveedor o resolución contractual.
            </p>
          </div>
        </>
      )}
    </section>
  );
};

const toneProductividad: Record<EstadoProductividad, string> = {
  equilibrado_eficiente: "bg-emerald-50 text-emerald-700 border-emerald-200",
  productivo_costoso: "bg-amber-50 text-amber-700 border-amber-200",
  coste_bajo_riesgo_calidad: "bg-amber-50 text-amber-800 border-amber-200",
  atencion: "bg-amber-50 text-amber-800 border-amber-200",
  critico: "bg-red-50 text-red-700 border-red-200",
  informacion_insuficiente: "bg-ink/[0.04] text-ink/50 border-black/[0.06]",
};

const FilaEntidad = ({ r, mediana }: { r: EntidadRow & { clasificacion: ClasificacionProductividad }; mediana: number }) => {
  const tone = r.eur_cierre == null || mediana <= 0 ? "text-ink"
    : r.eur_cierre < mediana ? "text-emerald-700"
    : r.eur_cierre > mediana * 1.25 ? "text-red-700"
    : "text-amber-700";
  return (
    <tr className="border-b border-black/[0.04] hover:bg-ink/[0.015]">
      <td className="px-4 py-3 font-medium text-ink">{r.entidad}</td>
      <td className="px-4 py-3 text-right tabular-nums text-ink">{fmtNum(r.cerradas)}</td>
      <td className="px-4 py-3 text-right tabular-nums text-ink/70">{r.pct_bajas != null ? fmtPct(r.pct_bajas) : "—"}</td>
      <td className="px-4 py-3 text-right tabular-nums text-ink/70">{r.pct_sla20 != null ? fmtPct(r.pct_sla20) : "—"}</td>
      <td className="px-4 py-3 text-right tabular-nums text-ink">{r.coste_directo > 0 ? fmtEur(r.coste_directo) : "n/d"}</td>
      <td className={`px-4 py-3 text-right tabular-nums font-medium ${tone}`}>{r.eur_cierre != null ? fmtEur(r.eur_cierre) : "n/d"}</td>
      <td className="px-4 py-3 text-right tabular-nums text-ink/70">
        {r.contribucion_parcial != null ? fmtEur(Math.round(r.contribucion_parcial)) : <span className="text-ink/40">n/d</span>}
        {r.cerradas > 0 && (
          <span className="block text-[10px] text-ink/40">cob. {((r.cerradas_con_ingreso / r.cerradas) * 100).toFixed(0)}%</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`text-[10px] px-2 py-0.5 rounded border ${toneProductividad[r.clasificacion.nivel]}`} title={r.clasificacion.regla + (r.clasificacion.motivos.length ? " " + r.clasificacion.motivos.join(" ") : "")}>
          {LABEL_PRODUCTIVIDAD[r.clasificacion.nivel]}
        </span>
      </td>
    </tr>
  );
};

// ─── Inventario de fuentes ──────────────────────────────────────────────────
const InventarioFuentes = ({ kpis }: { kpis: Kpis }) => (
  <div className="p-6 text-sm text-ink/70 space-y-3">
    <div>
      <p className="font-medium text-ink">Costes reales registrados</p>
      <ul className="list-disc list-inside text-xs text-ink/60 mt-1 space-y-0.5">
        <li><strong>Nómina interna</strong>: {fmtEur(kpis.coste)} — coste empresa (SS incluida) por técnico con nómina casada.</li>
        <li><strong>Coste SAT externo</strong>: {fmtEur(kpis.coste_sat)} — factura del SAT (fact_sat), cobertura {kpis.cerradas_totales > 0 ? (kpis.cerradas_con_coste_sat / kpis.cerradas_totales * 100).toFixed(0) : 0}%.</li>
        <li><strong>Desplazamiento</strong>: {fmtEur(kpis.coste_desplazamiento)} — importe_desplazamiento por OT, cobertura {kpis.cerradas_totales > 0 ? (kpis.cerradas_con_desplazamiento / kpis.cerradas_totales * 100).toFixed(0) : 0}%.</li>
      </ul>
    </div>
    <div>
      <p className="font-medium text-ink">Costes no disponibles en el modelo</p>
      <ul className="list-disc list-inside text-xs text-ink/60 mt-1 space-y-0.5">
        <li>Repuestos — sin integración con almacén/compras.</li>
        <li>Logística — sin registro estructurado por OT.</li>
        <li>Retrabajo / reincidencias — sin identificador de reincidencia.</li>
        <li>Otros indirectos (call center, back-office, marketing).</li>
      </ul>
    </div>
    <div>
      <p className="font-medium text-ink">Ingresos</p>
      <p className="text-xs text-ink/60 mt-1">
        Ingreso cliente (fact_cli): {fmtEur(kpis.ingreso_cli)} · cobertura {kpis.cerradas_totales > 0 ? (kpis.cerradas_con_ingreso / kpis.cerradas_totales * 100).toFixed(0) : 0}% de OTs. La contribución operativa mostrada es <strong>parcial</strong>: no es margen, EBITDA ni rentabilidad.
      </p>
    </div>
  </div>
);

// ─── Definiciones ───────────────────────────────────────────────────────────
const Definiciones = () => (
  <div className="p-6 text-sm text-ink/70 space-y-3">
    <div><strong className="text-ink">€ / cierre</strong>: coste directo del período ÷ cierres (incluye bajas).</div>
    <div><strong className="text-ink">Coste directo</strong>: nómina interna + desplazamiento (delegaciones/técnicos), factura SAT (externos) o suma de ambos (clientes/gamas).</div>
    <div><strong className="text-ink">Contribución operativa parcial</strong>: ingreso cliente − coste directo, solo sobre OTs con ingreso registrado. No es margen ni EBITDA.</div>
    <div><strong className="text-ink">Equilibrado y eficiente</strong>: €/cierre en rango (±25% de la mediana), calidad y SLA sin señales negativas.</div>
    <div><strong className="text-ink">Productivo pero costoso</strong>: €/cierre &gt; 1,25× mediana, sin problemas de calidad/SLA. Puede reflejar mix, desplazamiento o menor volumen.</div>
    <div><strong className="text-ink">Coste bajo con riesgo de calidad</strong>: €/cierre &lt; 0,75× mediana pero ratio de bajas &gt; +5 pp de la mediana. No interpretar como eficiencia.</div>
    <div><strong className="text-ink">Atención</strong>: una dimensión (SLA &lt; 40% o bajas +5 pp) con señal negativa.</div>
    <div><strong className="text-ink">Crítico</strong>: calidad crítica (+10 pp bajas) combinada con coste alto o SLA bajo.</div>
    <div><strong className="text-ink">Información insuficiente</strong>: cierres &lt; umbral configurable.</div>
  </div>
);

// ─── Gráficos y tabla técnicos existentes ───────────────────────────────────
const EvoChart = ({ rows }: { rows: EvoRow[] }) => {
  const maxCierres = Math.max(1, ...rows.map((r) => r.cierres));
  const eurs = rows.map((r) => r.eur_cierre || 0);
  const maxEur = Math.max(1, ...eurs);
  const minEur = Math.min(...eurs.filter((n) => n > 0), maxEur);
  const range = Math.max(1, maxEur - minEur);
  const H = 160; const W = 720;
  const step = rows.length > 1 ? W / (rows.length - 1) : W;
  const pointY = (v: number) => v > 0 ? H - ((v - minEur) / range) * H : H;
  const path = rows.map((r, i) => `${i === 0 ? "M" : "L"} ${i * step} ${pointY(r.eur_cierre || 0)}`).join(" ");
  return (
    <div>
      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H + 40}`} className="w-full min-w-[560px]" preserveAspectRatio="none">
          {rows.map((r, i) => {
            const h = (r.cierres / maxCierres) * H;
            const x = i * step - step * 0.3;
            const w = step * 0.6;
            return <rect key={i} x={x} y={H - h} width={Math.max(2, w)} height={h} className="fill-ink/15" rx={1.5} />;
          })}
          <path d={path} fill="none" className="stroke-ink" strokeWidth={1.5} />
          {rows.map((r, i) => <circle key={i} cx={i * step} cy={pointY(r.eur_cierre || 0)} r={2.5} className="fill-ink" />)}
          {rows.map((r, i) => (
            <text key={i} x={i * step} y={H + 18} textAnchor="middle" className="fill-ink/50" style={{ fontSize: 9 }}>{mesLabel(r.mes)}</text>
          ))}
        </svg>
      </div>
      <div className="flex gap-4 mt-3 text-[11px] text-ink/60">
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-ink/15 rounded-sm inline-block" /> Cierres</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] bg-ink inline-block" /> €/cierre</span>
      </div>
    </div>
  );
};

const TecnicosTable = ({ rows }: { rows: TecRow[] }) => {
  const sorted = [...rows].sort((a, b) => (a.eur_cierre || Infinity) - (b.eur_cierre || Infinity));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.05]">
            <th className="px-4 py-3">Técnico</th>
            <th className="px-4 py-3">Equipo</th>
            <th className="px-4 py-3 text-right">Coste</th>
            <th className="px-4 py-3 text-right">Cierres</th>
            <th className="px-4 py-3 text-right">€ / cierre</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.tecnico} className="border-b border-black/[0.04] hover:bg-ink/[0.015]">
              <td className="px-4 py-3 text-ink">{r.tecnico}</td>
              <td className="px-4 py-3 text-ink/60 text-xs">{r.equipo}</td>
              <td className="px-4 py-3 text-right tabular-nums text-ink">{fmtEur(r.coste)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-ink">{fmtNum(r.cierres)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-ink font-medium">{fmtEur(r.eur_cierre)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Costes;
