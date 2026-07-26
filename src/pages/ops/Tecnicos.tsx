import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOpsFilters, fmtNum, fmtPct, fmtDec } from "@/lib/ops-filters";
import { Loader2, X } from "lucide-react";

type Row = {
  tecnico: string; delegacion: string; grupo: string; activo: boolean; motivo_inactivo: string | null;
  cerradas: number; cerradas_prev: number; delta_pct: number | null;
  pct_bajas: number; pct_bajas_esp: number;
  pct_nff: number; pct_nff_esp: number;
  dias_medio: number; pct_sla20: number;
  mix_top: string; score: number | null;
};

const scoreBadge = (s: number | null) => {
  if (s == null) return <span className="text-ink/30">—</span>;
  const cls = s >= 70 ? "bg-emerald-100 text-emerald-800" : s >= 50 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium tabular-nums ${cls}`}>{s}</span>;
};

const deltaBadge = (d: number | null) => {
  if (d == null) return <span className="text-ink/30">—</span>;
  const pct = Math.round(d * 100);
  const cls = pct > 5 ? "text-emerald-600" : pct < -5 ? "text-red-600" : "text-ink/50";
  return <span className={`tabular-nums text-xs ${cls}`}>{pct > 0 ? "+" : ""}{pct}%</span>;
};

const compareCell = (v: number, esp: number, thr = 0.1) => {
  const diff = v - esp;
  const cls = diff > thr ? "text-red-600 font-medium" : diff < -thr ? "text-emerald-600" : "text-ink";
  return (
    <div className="text-right tabular-nums">
      <span className={cls}>{fmtPct(v)}</span>
      <span className="block text-[10px] text-ink/40">esp. {fmtPct(esp)}</span>
    </div>
  );
};

const Tecnicos = () => {
  const { rpcParams } = useOpsFilters();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Row | null>(null);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data } = await supabase.rpc("ops_tecnicos_scorecard" as never, {
        p_from: rpcParams.p_from, p_to: rpcParams.p_to,
        p_delegacion: rpcParams.p_delegacion, p_cliente: rpcParams.p_cliente,
        p_gama: rpcParams.p_gama, p_familia: rpcParams.p_familia,
        p_provincia: rpcParams.p_provincia, p_sat: rpcParams.p_sat,
        p_canal: rpcParams.p_canal,
      } as never);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [rpcParams]);

  const activos = rows.filter((r) => r.activo);
  const inactivos = rows.filter((r) => !r.activo);
  const central = activos.filter((r) => r.grupo === "Central");
  const dele = activos.filter((r) => r.grupo === "Delegaciones");

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Red HIPERSERVICE</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">Scorecard técnicos</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Score comparado dentro del grupo (Central San Agustín vs Delegaciones).
          <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-medium">Score PROVISIONAL — pendiente días trabajados, satisfacción y reclamaciones.</span>
        </p>
      </header>

      <TecGroup title="Central San Agustín (taller)" rows={central} onOpen={setSel} />
      <TecGroup title="Delegaciones (calle)" rows={dele} onOpen={setSel} />

      {inactivos.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Técnicos inactivos</p>
          <div className="border border-black/[0.06] rounded-2xl bg-white divide-y divide-black/[0.05]">
            {inactivos.map((r) => (
              <div key={r.tecnico} className="px-4 py-2.5 flex justify-between items-center text-sm text-ink/50">
                <span>{r.tecnico} <span className="text-ink/30">· {r.delegacion || "—"}</span></span>
                <span className="text-xs italic">{r.motivo_inactivo || "Inactivo"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {sel && <FichaDrawer tecnico={sel} onClose={() => setSel(null)} />}
    </div>
  );
};

const TecGroup = ({ title, rows, onOpen }: { title: string; rows: Row[]; onOpen: (r: Row) => void }) => (
  <section>
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">{title} · {rows.length} técnicos</p>
    <div className="border border-black/[0.06] rounded-2xl bg-white overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.06]">
          <tr>
            <th className="text-left px-4 py-2.5 font-semibold">Técnico</th>
            <th className="text-right px-3 py-2.5 font-semibold">Cerradas</th>
            <th className="text-right px-3 py-2.5 font-semibold">Δ</th>
            <th className="text-right px-3 py-2.5 font-semibold">SLA 20d</th>
            <th className="text-right px-3 py-2.5 font-semibold">Días</th>
            <th className="text-right px-3 py-2.5 font-semibold">% Bajas</th>
            <th className="text-right px-3 py-2.5 font-semibold">% NFF</th>
            <th className="text-left px-3 py-2.5 font-semibold">Mix top</th>
            <th className="text-right px-4 py-2.5 font-semibold">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.04]">
          {rows.map((r) => (
            <tr key={r.tecnico} onClick={() => onOpen(r)} className="cursor-pointer hover:bg-black/[0.02] transition-colors">
              <td className="px-4 py-2.5">
                <p className="text-ink font-medium">{r.tecnico}</p>
                <p className="text-[11px] text-ink/40">{r.delegacion || "—"}</p>
              </td>
              <td className="text-right px-3 py-2.5 tabular-nums">{fmtNum(r.cerradas)}</td>
              <td className="text-right px-3 py-2.5">{deltaBadge(r.delta_pct)}</td>
              <td className="text-right px-3 py-2.5 tabular-nums">{fmtPct(r.pct_sla20)}</td>
              <td className="text-right px-3 py-2.5 tabular-nums">{fmtDec(r.dias_medio, 1)}</td>
              <td className="px-3 py-2.5">{compareCell(r.pct_bajas, r.pct_bajas_esp)}</td>
              <td className="px-3 py-2.5">{compareCell(r.pct_nff, r.pct_nff_esp)}</td>
              <td className="px-3 py-2.5 text-[11px] text-ink/60 truncate max-w-[180px]">{r.mix_top}</td>
              <td className="text-right px-4 py-2.5">{scoreBadge(r.score)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={9} className="text-center px-4 py-8 text-ink/40 text-sm">Sin técnicos en el período con los filtros actuales.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
);

type Ficha = {
  evolucion: Array<{ mes: string; cerradas: number; pct_sla20: number; pct_bajas: number }>;
  canal: Array<{ canal: string; n: number; desp_medio: number | null; dias_medio: number | null }>;
  mix: Array<{ familia: string; cliente_wg: string; n: number; pct_bajas: number; pct_bajas_esp: number | null; pct_nff: number; pct_nff_esp: number | null }>;
  abiertas: Array<{ num_ot: string; cliente_wg: string; familia: string; provincia: string; fecha_creacion: string; dias_abierta: number }>;
};

const FichaDrawer = ({ tecnico, onClose }: { tecnico: Row; onClose: () => void }) => {
  const [data, setData] = useState<Ficha | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("ops_tecnico_ficha" as never, { p_tecnico: tecnico.tecnico } as never);
      setData((data ?? null) as Ficha | null);
    })();
  }, [tecnico.tecnico]);

  const maxEvo = Math.max(1, ...(data?.evolucion.map((e) => e.cerradas) ?? [1]));

  return (
    <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white h-full overflow-y-auto p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Ficha técnico</p>
            <h2 className="font-display text-2xl tracking-tight text-ink mt-1">{tecnico.tecnico}</h2>
            <p className="text-xs text-ink/50">{tecnico.delegacion || "—"} · {tecnico.grupo}</p>
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="border border-black/[0.06] rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-ink/40">Cerradas</p>
            <p className="font-display text-2xl tabular-nums">{fmtNum(tecnico.cerradas)}</p>
          </div>
          <div className="border border-black/[0.06] rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-ink/40">SLA 20d</p>
            <p className="font-display text-2xl tabular-nums">{fmtPct(tecnico.pct_sla20)}</p>
          </div>
          <div className="border border-black/[0.06] rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-ink/40">Score</p>
            <p className="font-display text-2xl">{scoreBadge(tecnico.score)}</p>
          </div>
        </div>

        {data && (
          <>
            <Section title="Evolución 12 meses">
              <div className="flex items-end gap-1 h-24">
                {data.evolucion.map((e) => (
                  <div key={e.mes} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-ink/70 rounded-t-sm" style={{ height: `${(e.cerradas / maxEvo) * 100}%` }} title={`${e.cerradas} · SLA ${fmtPct(e.pct_sla20)} · Bajas ${fmtPct(e.pct_bajas)}`} />
                    <span className="text-[9px] text-ink/40">{new Date(e.mes).toLocaleString("es-ES", { month: "short" })}</span>
                  </div>
                ))}
                {data.evolucion.length === 0 && <p className="text-xs text-ink/40">Sin datos.</p>}
              </div>
            </Section>

            <Section title="Canal">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-ink/40 border-b border-black/[0.06]">
                  <tr><th className="text-left py-2">Canal</th><th className="text-right">OTs</th><th className="text-right">Días medio</th><th className="text-right">Desp. €/OT</th></tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {data.canal.map((c) => (
                    <tr key={c.canal}><td className="py-2">{c.canal}</td>
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
                  <tr><th className="text-left py-2">Familia</th><th className="text-left">Cliente</th><th className="text-right">n</th><th className="text-right">% Bajas</th><th className="text-right">% NFF</th></tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {data.mix.map((m, i) => (
                    <tr key={i}>
                      <td className="py-2">{m.familia}</td>
                      <td className="text-ink/60">{m.cliente_wg || "—"}</td>
                      <td className="text-right tabular-nums">{fmtNum(m.n)}</td>
                      <td className="text-right tabular-nums">{fmtPct(m.pct_bajas)}<span className="block text-[10px] text-ink/40">esp. {fmtPct(m.pct_bajas_esp ?? 0)}</span></td>
                      <td className="text-right tabular-nums">{fmtPct(m.pct_nff)}<span className="block text-[10px] text-ink/40">esp. {fmtPct(m.pct_nff_esp ?? 0)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section title={`Abiertas (${data.abiertas.length})`}>
              <div className="max-h-80 overflow-y-auto text-sm divide-y divide-black/[0.04]">
                {data.abiertas.map((a) => (
                  <div key={a.num_ot} className="py-2 flex justify-between">
                    <div>
                      <p className="text-ink">{a.num_ot} · {a.familia || "—"}</p>
                      <p className="text-[11px] text-ink/50">{a.cliente_wg || "—"} · {a.provincia || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className={`tabular-nums text-sm ${a.dias_abierta > 30 ? "text-red-600 font-medium" : a.dias_abierta > 20 ? "text-amber-600" : "text-ink/60"}`}>{a.dias_abierta} d</p>
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

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-6">
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">{title}</p>
    <div className="border border-black/[0.06] rounded-xl bg-white p-4">{children}</div>
  </section>
);

export default Tecnicos;
