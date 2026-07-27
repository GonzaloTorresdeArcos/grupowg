import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtEur, fmtNum } from "@/lib/ops-filters";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpsPeriodPicker } from "@/components/ops/OpsPeriodPicker";

type Kpis = { coste: number; cierres: number; eur_cierre: number };
type EvoRow = { mes: string; coste: number; cierres: number; eur_cierre: number };
type EqRow = { equipo: string; tecnicos: number; coste: number; cierres: number; eur_cierre: number; variable: number };
type TecRow = { tecnico: string; equipo: string; coste: number; cierres: number; eur_cierre: number };
type Payload = { kpis: Kpis; evolucion: EvoRow[]; equipos: EqRow[]; tecnicos: TecRow[] };

const MES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesLabel = (iso: string) => {
  const d = new Date(iso);
  return `${MES_ES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
};

const firstOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
const lastOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
const monthKey = (iso: string) => iso.slice(0, 7); // YYYY-MM

const monthsBetween = (from: string, to: string) => {
  const f = new Date(from + "T00:00:00Z");
  const t = new Date(to + "T00:00:00Z");
  return (t.getUTCFullYear() - f.getUTCFullYear()) * 12 + (t.getUTCMonth() - f.getUTCMonth()) + 1;
};

const shiftMonths = (iso: string, delta: number) => {
  const d = new Date(iso + "T00:00:00Z");
  return firstOfMonth(d.getUTCFullYear(), d.getUTCMonth() + delta);
};

const eurCierre = (coste: number, cierres: number) =>
  cierres > 0 ? Math.round(coste / cierres) : 0;

const median = (arr: number[]) => {
  const clean = arr.filter((n) => n > 0).sort((a, b) => a - b);
  if (!clean.length) return 0;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
};

const fetchCostes = async (from: string, to: string) => {
  const { data, error } = await supabase.rpc("ops_costes" as never, { p_from: from, p_to: to } as never);
  if (error) throw error;
  return data as unknown as Payload;
};

// Default: enero 2026 → mes actual
const defaultRange = () => {
  const now = new Date();
  return {
    from: firstOfMonth(2026, 0),
    to: lastOfMonth(now.getUTCFullYear(), now.getUTCMonth()),
  };
};

const monthInputValue = (iso: string) => iso.slice(0, 7);
const parseMonthInput = (v: string, end: boolean) => {
  const [y, m] = v.split("-").map(Number);
  return end ? lastOfMonth(y, m - 1) : firstOfMonth(y, m - 1);
};

const Costes = () => {
  const [range, setRange] = useState(defaultRange);
  const [data, setData] = useState<Payload | null>(null);
  const [prev, setPrev] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [openTec, setOpenTec] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    (async () => {
      try {
        const nMonths = monthsBetween(range.from, range.to);
        const prevFrom = shiftMonths(range.from, -nMonths);
        const prevToStart = shiftMonths(range.from, -1);
        const prevTo = lastOfMonth(
          Number(prevToStart.slice(0, 4)),
          Number(prevToStart.slice(5, 7)) - 1,
        );
        const [cur, prv] = await Promise.all([
          fetchCostes(range.from, range.to),
          fetchCostes(prevFrom, prevTo),
        ]);
        if (cancel) return;
        setData(cur);
        setPrev(prv?.kpis ?? null);
      } catch (e) {
        console.error("[ops_costes]", e);
        if (!cancel) { setData(null); setPrev(null); }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [range]);

  // Evolución: pegamos 18 meses hasta 'to'
  const evo18 = useMemo(() => {
    if (!data) return [] as EvoRow[];
    const end = new Date(range.to + "T00:00:00Z");
    const keys: string[] = [];
    for (let i = 17; i >= 0; i--) {
      const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1));
      keys.push(firstOfMonth(d.getUTCFullYear(), d.getUTCMonth()).slice(0, 7));
    }
    const map = new Map(data.evolucion.map((r) => [monthKey(r.mes), r]));
    return keys.map((k) => {
      const r = map.get(k);
      return r ?? { mes: `${k}-01`, coste: 0, cierres: 0, eur_cierre: 0 };
    });
  }, [data, range.to]);

  const medianEqEurCierre = useMemo(
    () => median((data?.equipos ?? []).map((e) => e.eur_cierre ?? eurCierre(e.coste, e.cierres))),
    [data],
  );

  const deltaPct = useMemo(() => {
    if (!data || !prev || !prev.eur_cierre) return null;
    return (data.kpis.eur_cierre - prev.eur_cierre) / prev.eur_cierre;
  }, [data, prev]);

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Rentabilidad plantilla</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">Coste y productividad</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Coste laboral mensual por técnico, cierres reales y €/cierre.
          Selector de período independiente de los filtros globales.
        </p>
      </header>

      {/* Selector de período */}
      <div className="flex flex-wrap items-end gap-4 border border-black/[0.06] rounded-2xl bg-white px-5 py-4">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-1">Desde</label>
          <input
            type="month"
            value={monthInputValue(range.from)}
            onChange={(e) => setRange((r) => ({ ...r, from: parseMonthInput(e.target.value, false) }))}
            className="border border-black/10 rounded-md px-3 py-1.5 text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-1">Hasta</label>
          <input
            type="month"
            value={monthInputValue(range.to)}
            onChange={(e) => setRange((r) => ({ ...r, to: parseMonthInput(e.target.value, true) }))}
            className="border border-black/10 rounded-md px-3 py-1.5 text-sm bg-white"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setRange(defaultRange())}>
          Restablecer
        </Button>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Coste plantilla" value={fmtEur(data.kpis.coste)} />
            <Kpi label="Cierres" value={fmtNum(data.kpis.cierres)} />
            <Kpi label="€ / cierre" value={fmtEur(data.kpis.eur_cierre)} />
            <Kpi
              label="€ / cierre vs período previo"
              value={prev?.eur_cierre ? fmtEur(prev.eur_cierre) : "—"}
              hint={
                deltaPct == null
                  ? "Sin período comparable"
                  : `${deltaPct > 0 ? "+" : ""}${(deltaPct * 100).toFixed(1)}% vs previo`
              }
              tone={deltaPct == null ? "" : deltaPct <= 0 ? "text-emerald-600" : "text-red-600"}
            />
          </div>

          {/* Evolución */}
          <section className="border border-black/[0.06] rounded-2xl bg-white p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-1">Evolución 18 meses</p>
            <h2 className="font-display text-lg tracking-tight text-ink mb-5">Cierres y €/cierre por mes</h2>
            <EvoChart rows={evo18} />
          </section>

          {/* Equipos */}
          <EquiposTable rows={data.equipos ?? []} mediana={medianEqEurCierre} />

          {/* Detalle técnicos */}
          <section className="border border-black/[0.06] rounded-2xl bg-white overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 border-b border-black/[0.05] hover:bg-ink/[0.015]"
              onClick={() => setOpenTec((o) => !o)}
            >
              <div className="text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Detalle</p>
                <h2 className="font-display text-lg tracking-tight text-ink">Por técnico ({data.tecnicos?.length ?? 0})</h2>
              </div>
              {openTec ? <ChevronDown className="h-4 w-4 text-ink/50" /> : <ChevronRight className="h-4 w-4 text-ink/50" />}
            </button>
            {openTec && <TecnicosTable rows={data.tecnicos ?? []} />}
          </section>

          <p className="text-[11px] text-ink/50 leading-relaxed border-t border-black/[0.05] pt-4">
            <strong className="text-ink/70">Nota metodológica.</strong> Coste = coste empresa (SS incluida) de técnicos con nómina casada.
            Excluye externos sin nómina (Iván) y personal de logística. Fuente: resúmenes de nómina de las 3 sociedades.
          </p>
        </>
      )}
    </div>
  );
};

const Kpi = ({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) => (
  <div className="border border-black/[0.06] rounded-2xl bg-white p-5">
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
    <p className="font-display text-2xl tabular-nums text-ink mt-2">{value}</p>
    {hint && <p className={`text-xs mt-1 ${tone ?? "text-ink/50"}`}>{hint}</p>}
  </div>
);

const EvoChart = ({ rows }: { rows: EvoRow[] }) => {
  const maxCierres = Math.max(1, ...rows.map((r) => r.cierres));
  const eurs = rows.map((r) => r.eur_cierre || 0);
  const maxEur = Math.max(1, ...eurs);
  const minEur = Math.min(...eurs.filter((n) => n > 0), maxEur);
  const range = Math.max(1, maxEur - minEur);
  const H = 160;
  const W = 720;
  const step = rows.length > 1 ? W / (rows.length - 1) : W;
  const pointY = (v: number) => v > 0 ? H - ((v - minEur) / range) * H : H;

  const path = rows
    .map((r, i) => `${i === 0 ? "M" : "L"} ${i * step} ${pointY(r.eur_cierre || 0)}`)
    .join(" ");

  return (
    <div>
      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H + 40}`} className="w-full min-w-[560px]" preserveAspectRatio="none">
          {/* barras cierres */}
          {rows.map((r, i) => {
            const h = (r.cierres / maxCierres) * H;
            const x = i * step - step * 0.3;
            const w = step * 0.6;
            return (
              <rect key={i} x={x} y={H - h} width={Math.max(2, w)} height={h} className="fill-ink/15" rx={1.5} />
            );
          })}
          {/* línea €/cierre */}
          <path d={path} fill="none" className="stroke-ink" strokeWidth={1.5} />
          {rows.map((r, i) => (
            <circle key={i} cx={i * step} cy={pointY(r.eur_cierre || 0)} r={2.5} className="fill-ink" />
          ))}
          {/* etiquetas meses */}
          {rows.map((r, i) => (
            <text key={i} x={i * step} y={H + 18} textAnchor="middle" className="fill-ink/50 text-[9px]" style={{ fontSize: 9 }}>
              {mesLabel(r.mes)}
            </text>
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

const eurCierreTone = (v: number, med: number) => {
  if (!med || v <= 0) return "text-ink";
  if (v < med) return "text-emerald-600";
  if (v > 1.5 * med) return "text-red-600";
  return "text-amber-600";
};

const EquiposTable = ({ rows, mediana }: { rows: EqRow[]; mediana: number }) => {
  const sorted = [...rows].sort((a, b) => b.cierres - a.cierres);
  return (
    <section className="border border-black/[0.06] rounded-2xl bg-white overflow-hidden">
      <div className="px-6 py-5 border-b border-black/[0.05] flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-1">Vista principal</p>
          <h2 className="font-display text-xl tracking-tight text-ink">Equipos</h2>
          <p className="text-xs text-ink/50 mt-1">
            Semáforo €/cierre relativo a la mediana de equipos ({fmtEur(mediana)}).
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.05]">
              <th className="px-4 py-3">Equipo</th>
              <th className="px-4 py-3 text-right">Técnicos</th>
              <th className="px-4 py-3 text-right">Coste</th>
              <th className="px-4 py-3 text-right">Cierres</th>
              <th className="px-4 py-3 text-right">€ / cierre</th>
              <th className="px-4 py-3 text-right">Variable pagada</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.equipo} className="border-b border-black/[0.04] hover:bg-ink/[0.015]">
                <td className="px-4 py-3 font-medium text-ink">{r.equipo}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink">{fmtNum(r.tecnicos)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink">{fmtEur(r.coste)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink">{fmtNum(r.cierres)}</td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium ${eurCierreTone(r.eur_cierre, mediana)}`}>
                  {fmtEur(r.eur_cierre)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink/70">{fmtEur(r.variable)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
