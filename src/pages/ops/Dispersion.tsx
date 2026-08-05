import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtNum, fmtDec, fmtPct } from "@/lib/ops-filters";
import { prevPeriod, labelPeriodo, diasEntre } from "@/lib/ops-performance";
import {
  UMBRALES_DISPERSION,
  LABEL_NIVEL,
  PESO_NIVEL,
  clasificarTerritorio,
  clasificarTecnico,
  clasificarSat,
  top1BacklogShare,
  detectarPuntosUnicosFallo,
  observacionTerritorio,
  validarCalidadDisp,
  generarHallazgos,
  mediana,
  pctCompleto,
  type NivelCobertura,
  type DispPayload,
  type DispProvincia,
  type DispMunicipio,
  type DispTecnico,
  type DispSat,
} from "@/lib/ops-dispersion";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { OpsPeriodPicker } from "@/components/ops/OpsPeriodPicker";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const defaultRange = () => {
  const now = new Date();
  return {
    from: iso(new Date(Date.UTC(now.getUTCFullYear(), 0, 1))),
    to: iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))),
  };
};

type Vista = "provincias" | "municipios" | "tecnicos" | "sats";
type SortState = { key: string; dir: 1 | -1 } | null;

const NIVEL_STYLE: Record<NivelCobertura, string> = {
  riesgo_critico_cobertura: "bg-red-50 text-red-700 border-red-200",
  alta: "bg-orange-50 text-orange-700 border-orange-200",
  moderada: "bg-amber-50 text-amber-700 border-amber-200",
  baja: "bg-emerald-50 text-emerald-700 border-emerald-200",
  informacion_insuficiente: "bg-black/[0.03] text-ink/50 border-black/[0.08]",
};

const Chip = ({ label, className = "" }: { label: string; className?: string }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${className}`}>
    {label}
  </span>
);

const Card = ({ label, def, value, hint, tone = "text-ink" }: {
  label: string; def?: string; value: string; hint?: string; tone?: string;
}) => (
  <div className="rounded-xl border border-black/[0.06] bg-white p-4" title={def}>
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
    <p className={`mt-2 heading-display text-3xl ${tone}`}>{value}</p>
    {hint && <p className="mt-1 text-[11px] text-ink/50 leading-snug">{hint}</p>}
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
    <div className="px-4 py-3 border-b border-black/[0.06]">
      <h2 className="text-sm font-medium text-ink tracking-tight">{title}</h2>
    </div>
    <div className="overflow-x-auto">{children}</div>
  </section>
);

const fmtPp = (d: number | null) => (d == null ? "—" : `${d >= 0 ? "+" : ""}${(d * 100).toFixed(1)} pp`);
const fmtRel = (d: number | null) => (d == null ? "—" : `${d >= 0 ? "+" : ""}${(d * 100).toFixed(1)}%`);

const num = (v: unknown): number | null => (v == null ? null : Number(v));

export default function OpsDispersion() {
  const [range, setRange] = useState(defaultRange);
  const [delegacion, setDelegacion] = useState<string | null>(null);
  const [gama, setGama] = useState<string | null>(null);
  const [familia, setFamilia] = useState<string | null>(null);
  const [data, setData] = useState<DispPayload | null>(null);
  const [dataPrev, setDataPrev] = useState<DispPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reqIdRef = useRef(0);
  const [delOpts, setDelOpts] = useState<string[]>([]);
  const [gamaOpts, setGamaOpts] = useState<string[]>([]);
  const [famOpts, setFamOpts] = useState<string[]>([]);
  const [optsErr, setOptsErr] = useState(false);
  const [optsReloadKey, setOptsReloadKey] = useState(0);
  const [vista, setVista] = useState<Vista>("provincias");
  const [provSel, setProvSel] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const { data: d, error } = await supabase.rpc("ops_filter_options" as never, {
          p_delegacion: null, p_cliente: null, p_gama: null, p_familia: null,
          p_marca: null, p_provincia: null, p_sat: null, p_tecnico: null, p_canal: null,
        } as never);
        if (!alive) return;
        if (error) {
          console.error("[ops_filter_options] dispersion", error);
          setOptsErr(true);
          return;
        }
        setOptsErr(false);
        const src = (Array.isArray(d) ? (d as unknown[])[0] : d) as Record<string, unknown> | null;
        const toArr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => x != null && x !== "").map(String) : []);
        setDelOpts(toArr(src?.delegaciones));
        setGamaOpts(toArr(src?.gamas));
        setFamOpts(toArr(src?.familias));
      } catch (e) {
        if (!alive) return;
        console.error("[ops_filter_options] dispersion", e);
        setOptsErr(true);
      }
    })();
    return () => { alive = false; };
  }, [optsReloadKey]);

  useEffect(() => {
    const myReq = ++reqIdRef.current;
    setLoading(true);
    setErrorMsg(null);
    const prev = prevPeriod(range.from, range.to);
    const mk = (from: string, to: string) => ({
      p_from: from, p_to: to, p_delegacion: delegacion, p_gama: gama, p_familia: familia,
    });
    Promise.all([
      supabase.rpc("ops_dispersion" as never, mk(range.from, range.to) as never),
      supabase.rpc("ops_dispersion" as never, mk(prev.from, prev.to) as never),
    ]).then((pair) => {
      const [a, b] = pair as [{ data: unknown; error: unknown }, { data: unknown; error: unknown }];
      if (myReq !== reqIdRef.current) return; // llegó una petición más reciente
      if (a.error || !a.data) {
        console.error("[ops_dispersion]", a.error);
        setErrorMsg("No se han podido cargar los datos de dispersión. Reintenta o acota el período.");
        setLoading(false);
        return; // conserva los datos previos en pantalla
      }
      setData(a.data as unknown as DispPayload);
      if (!b.error && b.data) setDataPrev(b.data as unknown as DispPayload);
      setLoading(false);
    }).catch((e) => {
      if (myReq !== reqIdRef.current) return;
      console.error("[ops_dispersion]", e);
      setErrorMsg("No se han podido cargar los datos de dispersión. Reintenta o acota el período.");
      setLoading(false);
    });
  }, [range.from, range.to, delegacion, gama, familia, reloadKey]);

  // Auto-limpieza: si la provincia seleccionada ya no existe en los datos, la soltamos.
  useEffect(() => {
    if (provSel && data && !data.provincias.some((p) => p.provincia === provSel)) setProvSel(null);
  }, [data, provSel]);

  // ── Derivados ────────────────────────────────────────────────────────────
  const prev = prevPeriod(range.from, range.to);
  const L = diasEntre(range.from, range.to);
  const Lprev = diasEntre(prev.from, prev.to);

  const kpis = data?.kpis ?? null;
  const kpisPrev = dataPrev?.kpis ?? null;

  const pctGeo = kpis ? pctCompleto(kpis.con_provincia, kpis.cerradas) : null;
  const pctGeoPrev = kpisPrev ? pctCompleto(kpisPrev.con_provincia, kpisPrev.cerradas) : null;
  const pctFueraCap = kpis && kpis.capital_si + kpis.capital_no > 0
    ? kpis.capital_no / (kpis.capital_si + kpis.capital_no) : null;
  const pctFueraCapPrev = kpisPrev && kpisPrev.capital_si + kpisPrev.capital_no > 0
    ? kpisPrev.capital_no / (kpisPrev.capital_si + kpisPrev.capital_no) : null;

  // Medianas de municipios por delegación (técnicos con muestra suficiente)
  const medianasMunicipiosDeleg = useMemo(() => {
    const map = new Map<string, number>();
    if (!data) return map;
    const grupos = new Map<string, number[]>();
    for (const t of data.tecnicos) {
      if (!t.delegacion || num(t.cerradas)! < UMBRALES_DISPERSION.MUESTRA_MIN) continue;
      if (!grupos.has(t.delegacion)) grupos.set(t.delegacion, []);
      grupos.get(t.delegacion)!.push(num(t.municipios)!);
    }
    for (const [d, xs] of grupos) {
      const m = mediana(xs);
      if (m != null) map.set(d, m);
    }
    return map;
  }, [data]);

  const medianaProvinciasSat = useMemo(() => {
    if (!data) return null;
    return mediana(
      data.sats.filter((s) => num(s.cerradas)! >= UMBRALES_DISPERSION.MUESTRA_MIN).map((s) => num(s.provincias)!),
    );
  }, [data]);

  const provClas = useMemo(() => {
    const map = new Map<string, { nivel: NivelCobertura; regla: string }>();
    for (const r of data?.provincias ?? []) {
      map.set(r.provincia, clasificarTerritorio({
        cerradas: num(r.cerradas)!,
        cuotaTop1: num(r.cuota_top1),
        cuotaTop3: num(r.cuota_top3),
        abiertas: num(r.abiertas)!,
        abiertas30: num(r.abiertas30)!,
        pctFueraCapital: num(r.pct_fuera_capital),
        top1BacklogShare: top1BacklogShare({
          top1_n30: num(r.top1_n30),
          n30_asignado: num(r.n30_asignado),
        }),
      }));
    }
    return map;
  }, [data]);

  const tecClas = useMemo(() => {
    const map = new Map<string, { nivel: NivelCobertura; regla: string }>();
    for (const t of data?.tecnicos ?? []) {
      map.set(t.tecnico, clasificarTecnico({
        cerradas: num(t.cerradas)!,
        municipios: num(t.municipios)!,
        medianaMunicipiosDeleg: t.delegacion ? medianasMunicipiosDeleg.get(t.delegacion) ?? null : null,
      }));
    }
    return map;
  }, [data, medianasMunicipiosDeleg]);

  const satClas = useMemo(() => {
    const map = new Map<string, { nivel: NivelCobertura; regla: string }>();
    for (const s of data?.sats ?? []) {
      map.set(s.sat, clasificarSat({ cerradas: num(s.cerradas)!, provincias: num(s.provincias)! }, medianaProvinciasSat));
    }
    return map;
  }, [data, medianaProvinciasSat]);

  const puntosUnicos = useMemo(
    () =>
      detectarPuntosUnicosFallo(
        (data?.provincias ?? []).map((r) => ({
          ...r,
          cerradas: num(r.cerradas)!,
          cuota_top1: num(r.cuota_top1),
          cuota_top3: num(r.cuota_top3),
          top1_n30: num(r.top1_n30),
          n30_asignado: num(r.n30_asignado),
        })),
      ),
    [data],
  );

  const hallazgos = useMemo(() => {
    if (!data) return [];
    return generarHallazgos({
      kpis: data.kpis,
      provincias: data.provincias.map((r) => ({ ...r, abiertas30: num(r.abiertas30)! })),
      tecnicos: data.tecnicos,
      sats: data.sats,
      medianasMunicipiosDeleg,
    });
  }, [data, medianasMunicipiosDeleg]);

  const avisosCalidad = useMemo(() => (data ? validarCalidadDisp(data.calidad) : []), [data]);

  // ── Ordenación ───────────────────────────────────────────────────────────
  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));

  const applySort = <T,>(rows: T[], getters: Record<string, (r: T) => number | string | null>, defaultSort: (a: T, b: T) => number): T[] => {
    if (!sort || !getters[sort.key]) return [...rows].sort(defaultSort);
    const g = getters[sort.key]!;
    return [...rows].sort((a, b) => {
      const va = g(a);
      const vb = g(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  };

  const atencionProv = (a: DispProvincia, b: DispProvincia) =>
    PESO_NIVEL[provClas.get(a.provincia)?.nivel ?? "baja"] - PESO_NIVEL[provClas.get(b.provincia)?.nivel ?? "baja"] ||
    num(b.abiertas30)! - num(a.abiertas30)!;

  const atencionTec = (a: DispTecnico, b: DispTecnico) =>
    PESO_NIVEL[tecClas.get(a.tecnico)?.nivel ?? "baja"] - PESO_NIVEL[tecClas.get(b.tecnico)?.nivel ?? "baja"] ||
    num(b.abiertas30)! - num(a.abiertas30)!;

  const atencionSat = (a: DispSat, b: DispSat) =>
    PESO_NIVEL[satClas.get(a.sat)?.nivel ?? "baja"] - PESO_NIVEL[satClas.get(b.sat)?.nivel ?? "baja"] ||
    num(b.abiertas30)! - num(a.abiertas30)!;

  const provGetters: Record<string, (r: DispProvincia) => number | string | null> = {
    provincia: (r) => r.provincia,
    cerradas: (r) => num(r.cerradas),
    abiertas: (r) => num(r.abiertas),
    abiertas30: (r) => num(r.abiertas30),
    sla20: (r) => num(r.sla20),
    bajas: (r) => num(r.pct_bajas),
    municipios: (r) => num(r.municipios),
    cps: (r) => num(r.cps),
    recursos: (r) => num(r.recursos),
    otsrec: (r) => num(r.ots_por_recurso),
    fuera: (r) => num(r.pct_fuera_capital),
    km: (r) => num(r.km_mediana),
    cuota: (r) => num(r.cuota_top1),
  };
  const munGetters: Record<string, (r: DispMunicipio) => number | string | null> = {
    municipio: (r) => r.municipio,
    cerradas: (r) => num(r.cerradas),
    abiertas: (r) => num(r.abiertas),
    abiertas30: (r) => num(r.abiertas30),
    sla20: (r) => num(r.sla20),
    cps: (r) => num(r.cps),
    recursos: (r) => num(r.recursos),
    fuera: (r) => num(r.pct_fuera_capital),
    cuota: (r) => num(r.cuota_top1),
  };
  const tecGetters: Record<string, (r: DispTecnico) => number | string | null> = {
    tecnico: (r) => r.tecnico,
    delegacion: (r) => r.delegacion,
    cerradas: (r) => num(r.cerradas),
    abiertas30: (r) => num(r.abiertas30),
    sla20: (r) => num(r.sla20),
    municipios: (r) => num(r.municipios),
    cps: (r) => num(r.cps),
    provincias: (r) => num(r.provincias),
    fuera: (r) => num(r.pct_fuera_capital),
    km: (r) => num(r.km_mediana),
    kmreal: (r) => num(r.km_reales),
  };
  const satGetters: Record<string, (r: DispSat) => number | string | null> = {
    sat: (r) => r.sat,
    cerradas: (r) => num(r.cerradas),
    abiertas30: (r) => num(r.abiertas30),
    sla20: (r) => num(r.sla20),
    provincias: (r) => num(r.provincias),
    municipios: (r) => num(r.municipios),
    fuera: (r) => num(r.pct_fuera_capital),
  };

  const provRows = useMemo(
    () => applySort(data?.provincias ?? [], provGetters, atencionProv),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, sort, provClas],
  );
  const munRowsAll = useMemo(() => {
    const rows = (data?.municipios ?? []).filter((m) => (provSel ? m.provincia === provSel : true));
    return applySort(rows, munGetters, (a, b) => num(b.cerradas)! - num(a.cerradas)!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, provSel, sort]);
  const MUN_CAP = 200;
  const munRows = munRowsAll.slice(0, MUN_CAP);
  const tecRows = useMemo(
    () => applySort(data?.tecnicos ?? [], tecGetters, atencionTec),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, sort, tecClas],
  );
  const satRows = useMemo(
    () => applySort(data?.sats ?? [], satGetters, atencionSat),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, sort, satClas],
  );

  // ── UI helpers ───────────────────────────────────────────────────────────
  const Th = ({ k, label, right = true }: { k: string; label: string; right?: boolean }) => (
    <th
      onClick={() => toggleSort(k)}
      className={`px-3 py-2 cursor-pointer select-none hover:text-ink ${right ? "text-right" : "text-left"}`}
    >
      {label}
      {sort?.key === k ? (sort.dir === -1 ? " ↓" : " ↑") : ""}
    </th>
  );

  const NivelCell = ({ clas }: { clas?: { nivel: NivelCobertura; regla: string } }) =>
    clas ? (
      <span title={clas.regla}>
        <Chip label={LABEL_NIVEL[clas.nivel]} className={NIVEL_STYLE[clas.nivel]} />
      </span>
    ) : (
      <span className="text-ink/30">—</span>
    );

  const Sel = ({ label, value, options, onChange }: {
    label: string; value: string | null; options: string[]; onChange: (v: string | null) => void;
  }) => {
    // Blindaje: cualquier payload no-array degrada a lista vacía, nunca rompe el render.
    const list = Array.isArray(options) ? options : [];
    return (
      <label className="flex flex-col gap-1 min-w-[140px]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</span>
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-8 px-2 rounded-md border border-black/[0.08] bg-white text-[13px] text-ink focus:outline-none focus:border-ink/40"
        >
          <option value="">Todas</option>
          {list.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
    );
  };

  const completitudItems = kpis && data ? [
    { label: "Con provincia", pct: pctCompleto(kpis.con_provincia, kpis.cerradas) },
    { label: "Con municipio", pct: pctCompleto(kpis.con_municipio, kpis.cerradas) },
    { label: "CP válido", pct: pctCompleto(kpis.cp_valido, kpis.cerradas) },
    { label: "Geocodificadas", pct: pctCompleto(kpis.geocodificadas, kpis.cerradas) },
    {
      label: "Con recurso asignado",
      pct: pctCompleto(
        data.calidad.total - data.calidad.propio_sin_tecnico - data.calidad.sat_sin_nombre,
        data.calidad.total,
      ),
    },
    {
      label: "Técnicos con km reales > 0",
      pct: data.tecnicos.length > 0
        ? data.tecnicos.filter((t) => (num(t.km_reales) ?? 0) > 0).length / data.tecnicos.length
        : null,
    },
  ] : [];

  const VISTAS: { id: Vista; label: string }[] = [
    { id: "provincias", label: "Provincias" },
    { id: "municipios", label: "Municipios" },
    { id: "tecnicos", label: "Técnicos" },
    { id: "sats", label: "SATs" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Operaciones</p>
        <h1 className="heading-display text-3xl md:text-4xl text-ink mt-1">Dispersión y cobertura territorial</h1>
        <p className="text-[13px] text-ink/60 mt-1">
          Dónde se produce la demanda, quién la cubre y con qué dependencia de recursos.
        </p>
      </header>

      {/* Aviso obligatorio de limitación del dato */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900 leading-relaxed">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
        <p>
          <b>La distancia real de desplazamiento por OT no está disponible.</b> La dispersión se aproxima mediante
          cobertura territorial, distribución de municipios y distancia en línea recta desde la base de la delegación
          (etiquetada siempre como «aprox.»). Los km mensuales por técnico sí son <b>dato real registrado</b>.
          Zonas L1/L2, tiempos de viaje, rutas y radios de servicio: <b>no disponibles con los campos actuales</b>.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-black/[0.06] bg-white p-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Período</span>
          <OpsPeriodPicker value={range} onChange={setRange} />
        </div>
        <Sel label="Delegación" value={delegacion} options={delOpts} onChange={setDelegacion} />
        <Sel label="Gama" value={gama} options={gamaOpts} onChange={setGama} />
        <Sel label="Familia" value={familia} options={famOpts} onChange={setFamilia} />
      </div>

      {loading && !data && (
        <div className="flex items-center gap-2 text-ink/50 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Calculando…</div>
      )}

      {errorMsg && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          <span>{errorMsg}</span>
          <button onClick={() => setReloadKey((k) => k + 1)}
            className="px-3 py-1 rounded-full bg-red-600 text-white text-[12px] font-semibold hover:bg-red-700">
            Reintentar
          </button>
        </div>
      )}

      {kpis && data && (
        <>
          {loading && (
            <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] text-ink/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Actualizando datos…
            </div>
          )}
          {/* Comparabilidad de períodos */}
          <section className="border border-black/[0.06] rounded-xl bg-white p-4 text-[13px] text-ink/70 flex flex-wrap items-center gap-x-6 gap-y-1.5">
            <span><span className="text-ink/40">Período actual:</span> <b className="text-ink">{labelPeriodo(range.from, range.to)}</b> · {L} días naturales</span>
            <span><span className="text-ink/40">Período anterior:</span> <b className="text-ink">{labelPeriodo(prev.from, prev.to)}</b> · {Lprev} días naturales</span>
            {L !== Lprev && (
              <Chip label="Distinta duración — compara proporciones, no absolutos" className="bg-amber-50 text-amber-700 border-amber-200" />
            )}
          </section>

          {/* A.2 — Resumen ejecutivo */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Resumen ejecutivo</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card
                label="OTs con geo válida"
                def="% de OTs cerradas del período con provincia registrada (dato real del ERP)."
                value={fmtPct(pctGeo)}
                hint={`${fmtNum(kpis.con_provincia)} de ${fmtNum(kpis.cerradas)} cerradas · anterior ${fmtPct(pctGeoPrev)} (${fmtPp(pctGeo != null && pctGeoPrev != null ? pctGeo - pctGeoPrev : null)})`}
              />
              <Card
                label="Provincias servidas"
                def="Provincias con al menos una OT cerrada en el período."
                value={fmtNum(kpis.provincias_servidas)}
                hint={kpisPrev ? `anterior ${fmtNum(kpisPrev.provincias_servidas)} (${fmtRel(kpisPrev.provincias_servidas ? (kpis.provincias_servidas - kpisPrev.provincias_servidas) / kpisPrev.provincias_servidas : null)})` : undefined}
              />
              <Card
                label="Municipios servidos"
                def="Municipios distintos con al menos una OT cerrada (con municipio registrado)."
                value={fmtNum(kpis.municipios_servidos)}
                hint={kpisPrev ? `anterior ${fmtNum(kpisPrev.municipios_servidos)} · ${fmtNum(kpis.cps_servidos)} CPs distintos` : `${fmtNum(kpis.cps_servidos)} CPs distintos`}
              />
              <Card
                label="% fuera de capital"
                def="OTs con flag capital = 'NO' sobre las que tienen flag (dato real del ERP, no inferido)."
                value={fmtPct(pctFueraCap)}
                hint={`dato real (flag capital) · anterior ${fmtPct(pctFueraCapPrev)} (${fmtPp(pctFueraCap != null && pctFueraCapPrev != null ? pctFueraCap - pctFueraCapPrev : null)})`}
              />
              <Card
                label="Km aprox. por intervención"
                def="Mediana de la distancia en línea recta base→CP (solo plantilla propia a domicilio con CP geocodificado). NO son km reales ni rutas."
                value={kpis.km_mediana != null ? `${fmtDec(num(kpis.km_mediana), 1)} km` : "—"}
                hint={`aprox. línea recta desde HUB · media ${fmtDec(num(kpis.km_media), 1)} km · ${fmtNum(kpis.salidas_km)} salidas${kpisPrev?.km_mediana != null ? ` · anterior ${fmtDec(num(kpisPrev.km_mediana), 1)} km` : ""}`}
              />
              <Card
                label="Km reales registrados"
                def="Suma de km mensuales por técnico en ops_coste_mensual dentro de los meses del período. Dato real registrado (nivel técnico/mes)."
                value={kpis.km_reales_total > 0 ? `${fmtNum(kpis.km_reales_total)} km` : "no disponible"}
                hint={kpis.km_reales_total > 0
                  ? `real registrado · ${fmtNum(kpis.km_reales_tecnicos)} técnicos con dato en el período`
                  : kpis.km_reales_tecnicos > 0
                    ? "los registros del período están a 0 km — el campo km no se está cargando en la fuente"
                    : "sin registros de km en los meses del período"}
              />
            </div>
          </section>

          {/* A.3 — Completitud geográfica */}
          <section className="rounded-xl border border-black/[0.06] bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Completitud del dato geográfico</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3">
              {completitudItems.map((c) => (
                <div key={c.label}>
                  <p className="text-[11px] text-ink/50">{c.label}</p>
                  <p className="text-sm font-medium text-ink tabular-nums mt-0.5">{fmtPct(c.pct)}</p>
                  <div className="mt-1 h-1 rounded-full bg-black/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${(c.pct ?? 0) >= 0.9 ? "bg-emerald-500" : (c.pct ?? 0) >= 0.7 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(100, (c.pct ?? 0) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-ink/50 leading-relaxed">
              Ningún análisis de esta página se presenta como definitivo con cobertura incompleta. La red SAT externa
              concentra la mayor parte de la geografía ausente (esperado por su menor calidad de registro).
            </p>
          </section>

          {/* A.6 — Tabla territorial con selector de vista */}
          <section>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mr-2">Tabla territorial</p>
              {VISTAS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { setVista(v.id); setSort(null); }}
                  className={`h-7 px-3 rounded-full border text-[12px] ${vista === v.id ? "bg-ink text-bone border-ink" : "border-black/[0.1] text-ink/60 hover:text-ink"}`}
                >
                  {v.label}
                </button>
              ))}
              {vista === "municipios" && (
                <select
                  value={provSel ?? ""}
                  onChange={(e) => setProvSel(e.target.value || null)}
                  className="h-7 px-2 rounded-md border border-black/[0.08] bg-white text-[12px] text-ink"
                >
                  <option value="">Todas las provincias</option>
                  {(data.provincias ?? []).map((p) => (
                    <option key={p.provincia} value={p.provincia}>{p.provincia}</option>
                  ))}
                </select>
              )}
            </div>

            {vista === "provincias" && (
              <Section title="Provincias — alcance, densidad, dependencia y estado de cobertura">
                <table className="min-w-full text-[12px]">
                  <thead className="bg-black/[0.02] text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/50">
                    <tr>
                      <Th k="provincia" label="Provincia" right={false} />
                      <Th k="cerradas" label="Cerradas" />
                      <Th k="abiertas" label="Abiertas" />
                      <Th k="abiertas30" label="+30d" />
                      <Th k="sla20" label="SLA20" />
                      <Th k="bajas" label="Bajas" />
                      <Th k="municipios" label="Municipios" />
                      <Th k="cps" label="CPs" />
                      <Th k="recursos" label="Recursos" />
                      <Th k="otsrec" label="OT/recurso" />
                      <Th k="fuera" label="% fuera cap." />
                      <Th k="km" label="Km aprox." />
                      <Th k="cuota" label="Top-1 (cuota)" />
                      <th className="px-3 py-2 text-left">Estado</th>
                      <th className="px-3 py-2 text-left min-w-[220px]">Observación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {provRows.map((r) => (
                      <tr key={r.provincia} className="hover:bg-black/[0.02]">
                        <td className="px-3 py-2 text-ink font-medium whitespace-nowrap">{r.provincia}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(num(r.cerradas))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(num(r.abiertas))}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${num(r.abiertas30)! > 0 ? "text-amber-700 font-medium" : ""}`}>{fmtNum(num(r.abiertas30))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtPct(num(r.sla20))}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink/70">{fmtPct(num(r.pct_bajas))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(num(r.municipios))}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink/70">{fmtNum(num(r.cps))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(num(r.recursos))}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink/70">{fmtDec(num(r.ots_por_recurso), 1)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtPct(num(r.pct_fuera_capital))}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink/70" title="Aproximación línea recta desde la base (solo propios a domicilio)">
                          {r.km_mediana != null ? fmtDec(num(r.km_mediana), 1) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                          {r.top1 ? `${r.top1} · ${fmtPct(num(r.cuota_top1))}` : "—"}
                        </td>
                        <td className="px-3 py-2"><NivelCell clas={provClas.get(r.provincia)} /></td>
                        <td className="px-3 py-2 text-ink/60 text-[11px] leading-snug">{observacionTerritorio({ ...r, cerradas: num(r.cerradas)!, abiertas: num(r.abiertas)!, abiertas30: num(r.abiertas30)!, cuota_top1: num(r.cuota_top1), pct_fuera_capital: num(r.pct_fuera_capital), top1_n30: num(r.top1_n30), n30_asignado: num(r.n30_asignado) }) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {vista === "municipios" && (
              <Section title={`Municipios${provSel ? ` de ${provSel}` : ""} — ${fmtNum(munRowsAll.length)} con actividad${munRowsAll.length > MUN_CAP ? ` (mostrando ${MUN_CAP})` : ""}`}>
                <table className="min-w-full text-[12px]">
                  <thead className="bg-black/[0.02] text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/50">
                    <tr>
                      {!provSel && <th className="px-3 py-2 text-left">Provincia</th>}
                      <Th k="municipio" label="Municipio" right={false} />
                      <Th k="cerradas" label="Cerradas" />
                      <Th k="abiertas" label="Abiertas" />
                      <Th k="abiertas30" label="+30d" />
                      <Th k="sla20" label="SLA20" />
                      <Th k="cps" label="CPs" />
                      <Th k="recursos" label="Recursos" />
                      <Th k="fuera" label="% fuera cap." />
                      <Th k="cuota" label="Recurso principal" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {munRows.map((m) => (
                      <tr key={`${m.provincia}-${m.municipio}`} className="hover:bg-black/[0.02]">
                        {!provSel && <td className="px-3 py-2 text-ink/60 whitespace-nowrap">{m.provincia}</td>}
                        <td className="px-3 py-2 text-ink font-medium">{m.municipio}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(num(m.cerradas))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(num(m.abiertas))}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${num(m.abiertas30)! > 0 ? "text-amber-700" : ""}`}>{fmtNum(num(m.abiertas30))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtPct(num(m.sla20))}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink/70">{fmtNum(num(m.cps))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(num(m.recursos))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtPct(num(m.pct_fuera_capital))}</td>
                        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-ink/70">
                          {m.top1 ? `${m.top1} · ${fmtPct(num(m.cuota_top1))}` : "—"}
                        </td>
                      </tr>
                    ))}
                    {!munRows.length && (
                      <tr><td colSpan={10} className="px-4 py-6 text-center text-ink/50">Sin municipios con actividad suficiente en el período</td></tr>
                    )}
                  </tbody>
                </table>
              </Section>
            )}

            {vista === "tecnicos" && (
              <Section title="Técnicos propios — extensión territorial vs. su delegación">
                <table className="min-w-full text-[12px]">
                  <thead className="bg-black/[0.02] text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/50">
                    <tr>
                      <Th k="tecnico" label="Técnico" right={false} />
                      <Th k="delegacion" label="Delegación" right={false} />
                      <Th k="cerradas" label="Cerradas" />
                      <Th k="abiertas30" label="+30d" />
                      <Th k="sla20" label="SLA20" />
                      <Th k="municipios" label="Municipios" />
                      <Th k="cps" label="CPs" />
                      <Th k="provincias" label="Prov." />
                      <Th k="fuera" label="% fuera cap." />
                      <Th k="km" label="Km aprox." />
                      <Th k="kmreal" label="Km reales" />
                      <th className="px-3 py-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {tecRows.map((t) => (
                      <tr key={t.tecnico} className="hover:bg-black/[0.02]">
                        <td className="px-3 py-2 text-ink font-medium whitespace-nowrap">{t.tecnico}</td>
                        <td className="px-3 py-2 text-ink/70 whitespace-nowrap">{t.delegacion ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(num(t.cerradas))}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${num(t.abiertas30)! > 0 ? "text-amber-700" : ""}`}>{fmtNum(num(t.abiertas30))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtPct(num(t.sla20))}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtNum(num(t.municipios))}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink/70">{fmtNum(num(t.cps))}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink/70">{fmtNum(num(t.provincias))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtPct(num(t.pct_fuera_capital))}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink/70" title="Mediana de distancia en línea recta desde la base — aproximación, no ruta">
                          {t.km_mediana != null ? fmtDec(num(t.km_mediana), 1) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap" title="Dato real registrado (técnico/mes)">
                          {t.km_reales != null ? `${fmtNum(num(t.km_reales))} km` : "—"}
                          {t.km_reales_meses != null && <span className="text-ink/40 text-[10px]"> /{num(t.km_reales_meses)} m</span>}
                        </td>
                        <td className="px-3 py-2"><NivelCell clas={tecClas.get(t.tecnico)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {vista === "sats" && (
              <Section title={`SATs externos — alcance geográfico (mediana de la red: ${medianaProvinciasSat != null ? fmtDec(medianaProvinciasSat, 0) : "—"} provincias)`}>
                <table className="min-w-full text-[12px]">
                  <thead className="bg-black/[0.02] text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/50">
                    <tr>
                      <Th k="sat" label="SAT" right={false} />
                      <Th k="cerradas" label="Cerradas" />
                      <Th k="abiertas30" label="+30d" />
                      <Th k="sla20" label="SLA20" />
                      <Th k="provincias" label="Provincias" />
                      <Th k="municipios" label="Municipios" />
                      <Th k="fuera" label="% fuera cap." />
                      <th className="px-3 py-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {satRows.slice(0, 150).map((s) => (
                      <tr key={s.sat} className="hover:bg-black/[0.02]">
                        <td className="px-3 py-2 text-ink font-medium">{s.sat}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(num(s.cerradas))}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${num(s.abiertas30)! > 0 ? "text-amber-700" : ""}`}>{fmtNum(num(s.abiertas30))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtPct(num(s.sla20))}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtNum(num(s.provincias))}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink/70">{fmtNum(num(s.municipios))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtPct(num(s.pct_fuera_capital))}</td>
                        <td className="px-3 py-2"><NivelCell clas={satClas.get(s.sat)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {satRows.length > 150 && (
                  <p className="px-4 py-2 text-[11px] text-ink/50 border-t border-black/[0.04]">Mostrando 150 de {fmtNum(satRows.length)} SATs — usa la ordenación por cabecera.</p>
                )}
              </Section>
            )}
          </section>

          {/* A.7 — Dependencia de cobertura */}
          <Section title={`Dependencia de cobertura — puntos únicos de fallo (muestra ≥ ${UMBRALES_DISPERSION.MUESTRA_MIN_DEPENDENCIA} cierres)`}>
            {puntosUnicos.length ? (
              <table className="min-w-full text-[12px]">
                <thead className="bg-black/[0.02] text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/50">
                  <tr>
                    <th className="px-4 py-2 text-left">Provincia</th>
                    <th className="px-4 py-2 text-left">Recurso</th>
                    <th className="px-4 py-2 text-right">Cuota top-1</th>
                    <th className="px-4 py-2 text-right">Cuota top-3</th>
                    <th className="px-4 py-2 text-right">Backlog +30d del recurso</th>
                    <th className="px-4 py-2 text-left min-w-[280px]">Regla</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {puntosUnicos.map((p) => (
                    <tr key={p.provincia} className="hover:bg-black/[0.02]">
                      <td className="px-4 py-2 text-ink font-medium">{p.provincia}</td>
                      <td className="px-4 py-2 text-ink/80">{p.recurso}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium text-red-700">{fmtPct(p.cuotaTop1)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-ink/70">{fmtPct(p.cuotaTop3)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtPct(p.backlogShare)}</td>
                      <td className="px-4 py-2 text-ink/60 text-[11px] leading-snug">{p.regla}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-6 text-[13px] text-ink/50">Ninguna provincia supera el umbral provisional de dependencia con muestra suficiente en el período.</p>
            )}
          </Section>

          {/* A.8 — Hallazgos */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Hallazgos automáticos</p>
            <div className="space-y-3">
              {hallazgos.map((h, i) => (
                <div key={i} className="rounded-xl border border-black/[0.06] bg-white p-4 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Chip
                      label={h.confianza === "real" ? "Dato real" : "Aproximación"}
                      className={h.confianza === "real" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}
                    />
                    <span className="text-[11px] text-ink/40">Benchmark: {h.benchmark}</span>
                  </div>
                  <p className="text-[13px] text-ink"><b className="text-ink/60 font-semibold">HECHO.</b> {h.hecho}</p>
                  <p className="text-[13px] text-ink/70"><b className="text-ink/50 font-semibold">HIPÓTESIS.</b> {h.hipotesis}</p>
                  <p className="text-[13px] text-ink/70"><b className="text-ink/50 font-semibold">ACCIÓN.</b> {h.accion}</p>
                </div>
              ))}
              {!hallazgos.length && (
                <p className="text-[13px] text-ink/50">Sin hallazgos con muestra suficiente en el período seleccionado.</p>
              )}
            </div>
          </section>

          {/* A.9 — Calidad de datos */}
          {avisosCalidad.length > 0 && (
            <section className="rounded-xl border border-black/[0.06] bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Calidad de datos</p>
              <ul className="space-y-1.5">
                {avisosCalidad.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] leading-snug">
                    <Info className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${a.severidad === "aviso" ? "text-amber-600" : "text-ink/40"}`} />
                    <span className={a.severidad === "aviso" ? "text-amber-900" : "text-ink/60"}>{a.mensaje}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Definiciones y umbrales */}
          <details className="rounded-xl border border-black/[0.06] bg-white p-4 text-[12px] text-ink/70 leading-relaxed">
            <summary className="cursor-pointer text-sm font-medium text-ink">Definiciones, metodología y umbrales provisionales</summary>
            <div className="mt-3 space-y-3">
              <div>
                <p className="font-semibold text-ink">Metodología de distancia</p>
                <p>
                  La distancia es una <b>aproximación geográfica en línea recta</b> (haversine) entre la base de la
                  delegación (tabla ops_bases) y el código postal del aviso (ops_cp_geo), calculada solo para plantilla
                  propia en canal Domicilio con CP geocodificado ({fmtPct(pctCompleto(kpis.salidas_km, kpis.cerradas))} de las cerradas).
                  Central mide desde el HUB de San Agustín de Guadalix; las delegaciones usan de momento el centro de su
                  ciudad como base (proxy). Nunca son rutas ni km reales por OT. Los km reales registrados existen solo a
                  nivel técnico/mes (ops_coste_mensual).
                </p>
              </div>
              <div>
                <p className="font-semibold text-ink">No disponible con los campos actuales</p>
                <p>Zonas L1/L2, tiempos de viaje, rutas reales, radios de servicio aprobados y coordenadas por OT más allá del CP.</p>
              </div>
              <div>
                <p className="font-semibold text-ink">Umbrales provisionales de clasificación</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li>Muestra mínima para clasificar: {UMBRALES_DISPERSION.MUESTRA_MIN} cierres (territorio/entidad) y {UMBRALES_DISPERSION.MUESTRA_MIN_DEPENDENCIA} para dependencia.</li>
                  <li>Riesgo crítico: ≥{(UMBRALES_DISPERSION.BACKLOG30_CRIT_PCT * 100).toFixed(0)}% de abiertas +30d (mín. {UMBRALES_DISPERSION.BACKLOG30_CRIT_MIN}), o dependencia ≥{(UMBRALES_DISPERSION.TOP1_ALTA * 100).toFixed(0)}% con ≥{(UMBRALES_DISPERSION.TOP1_BACKLOG_CRIT * 100).toFixed(0)}% del backlog +30d en ese recurso.</li>
                  <li>Dependencia alta ≥{(UMBRALES_DISPERSION.TOP1_ALTA * 100).toFixed(0)}% · moderada ≥{(UMBRALES_DISPERSION.TOP1_MODERADA * 100).toFixed(0)}% · concentración top-3 ≥{(UMBRALES_DISPERSION.TOP3_ALTA * 100).toFixed(0)}%.</li>
                  <li>Técnico disperso: ≥{UMBRALES_DISPERSION.MUNICIPIOS_FACTOR_ALTA}× la mediana de municipios de su delegación (mín. {UMBRALES_DISPERSION.MUNICIPIOS_MIN_ALTA}) → alto; ≥{UMBRALES_DISPERSION.MUNICIPIOS_FACTOR_MODERADA}× (mín. {UMBRALES_DISPERSION.MUNICIPIOS_MIN_MODERADA}) → moderado.</li>
                  <li>SAT con alcance excesivo: ≥{UMBRALES_DISPERSION.SAT_PROV_FACTOR_ALTA}× la mediana de provincias de la red SAT.</li>
                  <li>Actividad fuera de capital (dato real del flag): ≥{(UMBRALES_DISPERSION.FUERA_CAPITAL_ALTA * 100).toFixed(0)}% → alta; ≥{(UMBRALES_DISPERSION.FUERA_CAPITAL_MODERADA * 100).toFixed(0)}% → moderada.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-ink">Bases de delegación</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  {data.bases.map((b) => (
                    <li key={b.delegacion}><b>{b.delegacion}</b>{b.nota ? ` — ${b.nota}` : ""}</li>
                  ))}
                </ul>
              </div>
              <p className="text-ink/50">
                Dispersión ≠ volumen: un técnico con menos cierres puede cubrir un territorio mucho más disperso.
                Nunca evaluar rendimiento sin considerar territorio. Este análisis no es base única de decisiones de red,
                plantilla o incentivos.
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
