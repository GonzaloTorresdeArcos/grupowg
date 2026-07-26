import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchOperationsData, type OtRow } from "@/lib/ops-queries";
import { Loader2, X } from "lucide-react";

type TecMaster = { tecnico: string; delegacion: string | null; activo: boolean; motivo_inactivo: string | null };
type Bench = { familia: string; cliente_wg: string; pct_bajas: number | null; pct_nff: number | null };

type Score = {
  tecnico: string;
  delegacion: string | null;
  grupo: "Central" | "Delegaciones";
  activo: boolean;
  motivo_inactivo: string | null;
  ots: number;
  otsPrev: number;
  cerradas: number;
  cerradasPrev: number;
  diasMedio: number;
  sla20: number;
  bajasPct: number;
  bajasEsperado: number;
  nffPct: number;
  nffEsperado: number;
  envejecidas: number;
  score: number;
};

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const monthKey = (d: string | null) => {
  if (!d) return -1;
  const dt = new Date(d);
  return dt.getUTCFullYear() * 12 + dt.getUTCMonth();
};

const groupOf = (delegacion: string | null | undefined): "Central" | "Delegaciones" =>
  (delegacion ?? "").toLowerCase().match(/central|san agust/) ? "Central" : "Delegaciones";

const Tecnicos = () => {
  const [rows, setRows] = useState<OtRow[]>([]);
  const [tecs, setTecs] = useState<TecMaster[]>([]);
  const [bench, setBench] = useState<Bench[]>([]);
  const [loading, setLoading] = useState(true);
  const [grupo, setGrupo] = useState<"todos" | "Central" | "Delegaciones">("todos");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [ots, master, b] = await Promise.all([
        fetchOperationsData(),
        supabase.from("ops_tecnicos").select("tecnico,delegacion,activo,motivo_inactivo"),
        supabase.from("ops_benchmark").select("familia,cliente_wg,pct_bajas,pct_nff"),
      ]);
      setRows(ots);
      setTecs((master.data ?? []) as TecMaster[]);
      setBench((b.data ?? []) as Bench[]);
      setLoading(false);
    })();
  }, []);

  const scores = useMemo<Score[]>(() => {
    const now = new Date();
    const cMonth = now.getUTCFullYear() * 12 + now.getUTCMonth();

    const byTec = new Map<string, OtRow[]>();
    for (const r of rows) {
      if (!r.tecnico) continue;
      const arr = byTec.get(r.tecnico) ?? [];
      arr.push(r); byTec.set(r.tecnico, arr);
    }
    const masterMap = new Map(tecs.map((t) => [t.tecnico, t]));
    // Añadir técnicos del maestro sin OTs
    for (const t of tecs) if (!byTec.has(t.tecnico)) byTec.set(t.tecnico, []);

    const benchMap = new Map<string, Bench>();
    for (const b of bench) benchMap.set(`${b.familia}‖${b.cliente_wg}`, b);

    const diffDays = (a: string | null) => (a ? Math.floor((now.getTime() - new Date(a).getTime()) / 86400000) : 0);

    const out: Score[] = [];
    for (const [tec, list] of byTec) {
      const master = masterMap.get(tec);
      const delegacion = master?.delegacion ?? list[0]?.delegacion ?? null;
      const activo = master?.activo ?? true;
      const grp = groupOf(delegacion);

      const curr = list.filter((r) => monthKey(r.fecha_creacion) === cMonth);
      const prev = list.filter((r) => monthKey(r.fecha_creacion) === cMonth - 1);

      const cerradas = list.filter((r) => r.situacion === "Cerrado");
      const cerradasCurr = curr.filter((r) => r.situacion === "Cerrado").length;
      const cerradasPrev = prev.filter((r) => r.situacion === "Cerrado").length;
      const sla20 = cerradas.length ? cerradas.filter((r) => r.kpi_20d).length / cerradas.length : 0;
      const dias = cerradas.map((r) => r.dias_cierre ?? 0).filter((x) => x > 0);
      const diasMedio = dias.length ? dias.reduce((a, b) => a + b, 0) / dias.length : 0;
      const bajasN = list.filter((r) => r.es_baja).length;
      const nffN = list.filter((r) => r.es_nff).length;
      const bajasPct = list.length ? bajasN / list.length : 0;
      const nffPct = list.length ? nffN / list.length : 0;

      // Esperado según mix familia×cliente
      const mix = new Map<string, number>();
      for (const r of list) {
        const k = `${r.familia ?? ""}‖${r.cliente_wg ?? ""}`;
        mix.set(k, (mix.get(k) ?? 0) + 1);
      }
      let wSum = 0, expB = 0, expN = 0;
      for (const [k, w] of mix) {
        const b = benchMap.get(k); if (!b) continue;
        wSum += w;
        expB += (Number(b.pct_bajas ?? 0) / 100) * w;
        expN += (Number(b.pct_nff ?? 0) / 100) * w;
      }
      const bajasEsp = wSum ? expB / wSum : 0;
      const nffEsp = wSum ? expN / wSum : 0;

      const abiertas = list.filter((r) => r.situacion === "Abierto");
      const envejecidas = abiertas.filter((r) => diffDays(r.fecha_creacion) > 20).length;

      // Score provisional 30/30/30/10
      const productividad = Math.min(1, list.length / 120);
      // Calidad vs benchmark de su mix
      const calidad = wSum > 0
        ? Math.max(0, 1 - ((Math.max(0, bajasPct - bajasEsp) + Math.max(0, nffPct - nffEsp)) / 0.3))
        : Math.max(0, 1 - (bajasPct + nffPct) / 0.5);
      const envejPenal = 1 - Math.min(1, envejecidas / 20);
      const score = Math.round(productividad * 30 + sla20 * 30 + calidad * 30 + envejPenal * 10);

      out.push({
        tecnico: tec, delegacion, grupo: grp, activo, motivo_inactivo: master?.motivo_inactivo ?? null,
        ots: list.length, otsPrev: prev.length,
        cerradas: cerradas.length, cerradasPrev,
        diasMedio, sla20, bajasPct, bajasEsperado: bajasEsp, nffPct, nffEsperado: nffEsp,
        envejecidas, score: activo ? score : 0,
      });
    }
    return out.sort((a, b) => (Number(b.activo) - Number(a.activo)) || b.score - a.score);
  }, [rows, tecs, bench]);

  const filtered = grupo === "todos" ? scores : scores.filter((s) => s.grupo === grupo);
  const detail = selected ? scores.find((s) => s.tecnico === selected) : null;
  const detailRows = detail ? rows.filter((r) => r.tecnico === detail.tecnico) : [];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
  }

  const deltaCierres = (s: Score) => {
    if (s.cerradasPrev === 0) return "";
    const d = ((s.cerradas - s.cerradasPrev) / s.cerradasPrev) * 100;
    const sign = d > 0 ? "+" : d < 0 ? "−" : "";
    return `${sign}${Math.abs(d).toFixed(0)}%`;
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Scorecard</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">Técnicos propios</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Ranking dentro de grupo comparable (Central taller vs. Delegaciones calle). Score 0-100
          <span className="text-ink/40"> · provisional</span>: pendiente incorporar días trabajados, ausencias,
          satisfacción y reclamaciones. Técnicos inactivos en gris, fuera del ranking.
        </p>
      </header>

      <div className="flex gap-2">
        {(["todos", "Central", "Delegaciones"] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGrupo(g)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              grupo === g ? "bg-ink text-bone border-ink" : "border-black/[0.12] text-ink/70 hover:border-ink/40"
            }`}
          >
            {g === "todos" ? "Todos" : g}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink/50 py-10 text-center">Sin datos de técnicos.</p>
      ) : (
        <div className="overflow-x-auto border border-black/[0.06] rounded-2xl bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.1em] text-ink/40 border-b border-black/[0.06]">
                <th className="text-left font-medium px-4 py-3">Técnico</th>
                <th className="text-left font-medium px-4 py-3">Grupo</th>
                <th className="text-right font-medium px-4 py-3">Cerradas</th>
                <th className="text-right font-medium px-4 py-3">Δ mes</th>
                <th className="text-right font-medium px-4 py-3">SLA 20d</th>
                <th className="text-right font-medium px-4 py-3">% Bajas · esp.</th>
                <th className="text-right font-medium px-4 py-3">% NFF · esp.</th>
                <th className="text-right font-medium px-4 py-3">Días</th>
                <th className="text-right font-medium px-4 py-3">+20d</th>
                <th className="text-right font-medium px-4 py-3">Score*</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const d = deltaCierres(s);
                const dTone = d.startsWith("−") || d.startsWith("-") ? "text-red-600" : d.startsWith("+") ? "text-emerald-600" : "text-ink/40";
                const bajasBad = s.bajasEsperado > 0 && s.bajasPct - s.bajasEsperado > 0.1;
                const nffBad = s.nffEsperado > 0 && s.nffPct - s.nffEsperado > 0.1;
                return (
                  <tr
                    key={s.tecnico}
                    className={`border-b border-black/[0.04] last:border-0 cursor-pointer ${s.activo ? "hover:bg-black/[0.02]" : "opacity-50"}`}
                    onClick={() => setSelected(s.tecnico)}
                  >
                    <td className="px-4 py-3 text-ink">
                      {s.tecnico}
                      <div className="text-[11px] text-ink/40">{s.delegacion ?? "—"}{!s.activo && s.motivo_inactivo ? ` · ${s.motivo_inactivo}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-ink/70">{s.grupo}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.cerradas}</td>
                    <td className={`px-4 py-3 text-right tabular-nums text-xs ${dTone}`}>{d || "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtPct(s.sla20)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${bajasBad ? "text-red-600 font-medium" : ""}`}>
                      {fmtPct(s.bajasPct)} <span className="text-ink/40 text-xs">· {s.bajasEsperado > 0 ? fmtPct(s.bajasEsperado) : "—"}</span>
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${nffBad ? "text-red-600 font-medium" : ""}`}>
                      {fmtPct(s.nffPct)} <span className="text-ink/40 text-xs">· {s.nffEsperado > 0 ? fmtPct(s.nffEsperado) : "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.diasMedio.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.envejecidas}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{s.activo ? s.score : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-ink/40">
        * Score provisional. Pesos: Productividad 30 · SLA-20d 30 · Calidad vs benchmark de su mix 30 · Envejecimiento 10.
      </p>

      {/* Ficha técnico */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6" onClick={() => setSelected(null)}>
          <div
            className="w-full md:max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl md:rounded-2xl border border-black/[0.06] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-black/[0.06] px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Ficha técnico</p>
                <p className="font-display text-xl tracking-tight text-ink">{detail.tecnico}</p>
              </div>
              <button onClick={() => setSelected(null)} className="h-8 w-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="border border-black/[0.06] rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">Delegación</p>
                  <p className="mt-1 text-sm text-ink">{detail.delegacion ?? "—"}</p>
                </div>
                <div className="border border-black/[0.06] rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">Grupo</p>
                  <p className="mt-1 text-sm text-ink">{detail.grupo}</p>
                </div>
                <div className="border border-black/[0.06] rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">OTs totales</p>
                  <p className="mt-1 text-sm text-ink tabular-nums">{detail.ots}</p>
                </div>
                <div className="border border-black/[0.06] rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">Score</p>
                  <p className="mt-1 text-sm text-ink tabular-nums">{detail.activo ? detail.score : "—"}</p>
                </div>
              </div>

              {/* Canal Taller vs Domicilio */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Desglose por canal</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["Taller", "Domicilio"] as const).map((canal) => {
                    const sub = detailRows.filter((r) => (r.canal ?? "").toLowerCase() === canal.toLowerCase());
                    const cerr = sub.filter((r) => r.situacion === "Cerrado");
                    const sla = cerr.length ? cerr.filter((r) => r.kpi_20d).length / cerr.length : 0;
                    return (
                      <div key={canal} className="border border-black/[0.06] rounded-xl p-4">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">{canal}</p>
                        <div className="mt-2 flex items-baseline gap-3">
                          <p className="font-display text-2xl tabular-nums text-ink">{sub.length}</p>
                          <p className="text-xs text-ink/50">OTs · SLA 20d {fmtPct(sla)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mix de familias vs benchmark */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Mix familias vs benchmark</p>
                {(() => {
                  const mix = new Map<string, { n: number; bajas: number; nff: number; cliente_wg: string | null }>();
                  for (const r of detailRows) {
                    const k = r.familia ?? "—";
                    const m = mix.get(k) ?? { n: 0, bajas: 0, nff: 0, cliente_wg: r.cliente_wg };
                    m.n++; if (r.es_baja) m.bajas++; if (r.es_nff) m.nff++;
                    mix.set(k, m);
                  }
                  const benchMap = new Map<string, Bench>();
                  for (const b of bench) benchMap.set(`${b.familia}‖${b.cliente_wg}`, b);
                  const items = Array.from(mix.entries()).sort((a, b) => b[1].n - a[1].n).slice(0, 8);
                  if (items.length === 0) return <p className="text-xs text-ink/40">Sin datos.</p>;
                  return (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-[0.1em] text-ink/40 border-b border-black/[0.06]">
                          <th className="text-left font-medium py-2">Familia</th>
                          <th className="text-right font-medium py-2">OTs</th>
                          <th className="text-right font-medium py-2">% Bajas · esp.</th>
                          <th className="text-right font-medium py-2">% NFF · esp.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(([fam, m]) => {
                          const b = benchMap.get(`${fam}‖${m.cliente_wg ?? ""}`);
                          const bE = b ? Number(b.pct_bajas ?? 0) / 100 : null;
                          const nE = b ? Number(b.pct_nff ?? 0) / 100 : null;
                          return (
                            <tr key={fam} className="border-b border-black/[0.04] last:border-0">
                              <td className="py-2 text-ink">{fam}</td>
                              <td className="py-2 text-right tabular-nums">{m.n}</td>
                              <td className="py-2 text-right tabular-nums">{fmtPct(m.bajas / m.n)} <span className="text-ink/40">· {bE !== null ? fmtPct(bE) : "—"}</span></td>
                              <td className="py-2 text-right tabular-nums">{fmtPct(m.nff / m.n)} <span className="text-ink/40">· {nE !== null ? fmtPct(nE) : "—"}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {/* Evolución mensual */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Evolución últimos 12 meses</p>
                {(() => {
                  const now = new Date();
                  const cMonth = now.getUTCFullYear() * 12 + now.getUTCMonth();
                  const buckets = new Map<number, { creadas: number; cerradas: number }>();
                  for (let i = 11; i >= 0; i--) buckets.set(cMonth - i, { creadas: 0, cerradas: 0 });
                  for (const r of detailRows) {
                    const kc = monthKey(r.fecha_creacion), kx = monthKey(r.fecha_cierre);
                    if (buckets.has(kc)) buckets.get(kc)!.creadas++;
                    if (buckets.has(kx)) buckets.get(kx)!.cerradas++;
                  }
                  const arr = Array.from(buckets.entries()).map(([k, v]) => {
                    const y = Math.floor(k / 12), m = k % 12;
                    return { label: new Date(Date.UTC(y, m, 1)).toLocaleString("es-ES", { month: "short" }), ...v };
                  });
                  const max = Math.max(1, ...arr.flatMap((e) => [e.creadas, e.cerradas]));
                  return (
                    <div className="border border-black/[0.06] rounded-xl p-4">
                      <div className="flex items-end gap-2 h-24">
                        {arr.map((e, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex items-end gap-0.5 h-20">
                              <div className="flex-1 bg-ink rounded-t-sm" style={{ height: `${(e.creadas / max) * 100}%` }} />
                              <div className="flex-1 bg-emerald-500 rounded-t-sm" style={{ height: `${(e.cerradas / max) * 100}%` }} />
                            </div>
                            <span className="text-[9px] text-ink/40">{e.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tecnicos;
