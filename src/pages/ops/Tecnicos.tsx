import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOpsFilters, fmtNum, fmtPct, fmtDec } from "@/lib/ops-filters";
import {
  prevPeriod,
  estadoTecnico,
  ordenEstado,
  type EstadoTecnicoNivel,
  type EstadoTecnicoResult,
} from "@/lib/ops-perf";

import { Loader2, X } from "lucide-react";


type Row = {
  tecnico: string; delegacion: string; grupo: string; gama_principal: string | null;
  activo: boolean; motivo_inactivo: string | null;
  cerradas: number; cerradas_prev: number; delta_pct: number | null;
  pct_bajas: number; pct_bajas_esp: number;
  pct_nff: number; pct_nff_esp: number;
  dias_medio: number; pct_sla20: number;
  mix_top: string; score: number | null;
};
type EnrichedRow = Row & {
  bajas_prev: number | null;
  pct_bajas_prev: number | null;
  delta_ratio_bajas: number | null;
  estadoInfo: EstadoTecnicoResult;
};

const ESTADO_STYLE: Record<EstadoTecnicoNivel, { dot: string; text: string; label: string }> = {
  critico: { dot: "bg-red-500", text: "text-red-700", label: "Crítico" },
  atencion: { dot: "bg-amber-500", text: "text-amber-700", label: "Atención" },
  ok: { dot: "bg-emerald-500", text: "text-emerald-700", label: "OK" },
  sin_contexto: { dot: "bg-ink/30", text: "text-ink/50", label: "Sin contexto" },
};

const EstadoBadge = ({ e }: { e: EstadoTecnicoResult }) => (
  <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${ESTADO_STYLE[e.estado].text}`}>
    <span className={`h-2 w-2 rounded-full ${ESTADO_STYLE[e.estado].dot}`} />
    {ESTADO_STYLE[e.estado].label}
  </span>
);


const GAMA_ORDER = ["Gama Blanca", "Gama PAE", "Gama Marron", "Gama Movilidad"] as const;
const GAMA_LABEL: Record<string, string> = {
  "Gama Blanca": "Blanca",
  "Gama PAE": "PAE",
  "Gama Marron": "Marrón",
  "Gama Movilidad": "Movilidad",
};
const gamaLabel = (g: string | null | undefined) => (g ? GAMA_LABEL[g] ?? g : "—");

const GamaChip = ({ gama }: { gama: string | null | undefined }) => {
  if (!gama) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border border-black/[0.08] bg-black/[0.02] text-[10px] font-medium text-ink/70">
      {gamaLabel(gama)}
    </span>
  );
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
  const [rowsRaw, setRowsRaw] = useState<Row[]>([]);
  const [rowsPrev, setRowsPrev] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<EnrichedRow | null>(null);

  useEffect(() => {
    setLoading(true);
    const prev = prevPeriod(rpcParams.p_from as string, rpcParams.p_to as string);
    const base = {
      p_delegacion: rpcParams.p_delegacion, p_cliente: rpcParams.p_cliente,
      p_gama: rpcParams.p_gama, p_familia: rpcParams.p_familia,
      p_marca: rpcParams.p_marca,
      p_provincia: rpcParams.p_provincia, p_sat: rpcParams.p_sat,
      p_canal: rpcParams.p_canal,
    };
    (async () => {
      const [cur, pre] = await Promise.all([
        supabase.rpc("ops_tecnicos_scorecard" as never, { p_from: rpcParams.p_from, p_to: rpcParams.p_to, ...base } as never),
        supabase.rpc("ops_tecnicos_scorecard" as never, { p_from: prev.from, p_to: prev.to, ...base } as never),
      ]);
      setRowsRaw((cur.data ?? []) as Row[]);
      setRowsPrev((pre.data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [rpcParams]);

  const [gamaFilter, setGamaFilter] = useState<string | null>(null);

  // Enrich: media bajas por delegación (contexto peer-group) + estado
  const rows: EnrichedRow[] = useMemo(() => {
    const prevMap = new Map(rowsPrev.map((r) => [r.tecnico, r] as const));
    // Media bajas por delegación en el período actual (ponderada por cerradas)
    const accum = new Map<string, { b: number; c: number }>();
    for (const r of rowsRaw.filter((x) => x.activo)) {
      const cur = accum.get(r.delegacion) ?? { b: 0, c: 0 };
      cur.b += r.pct_bajas * r.cerradas;
      cur.c += r.cerradas;
      accum.set(r.delegacion, cur);
    }
    const mediaByDeleg = new Map<string, number>();
    for (const [k, v] of accum) mediaByDeleg.set(k, v.c > 0 ? v.b / v.c : 0);

    return rowsRaw.map((r) => {
      const p = prevMap.get(r.tecnico) ?? null;
      const bajas_prev = p ? Math.round(p.pct_bajas * p.cerradas) : null;
      const pct_bajas_prev = p ? p.pct_bajas : null;
      const delta_ratio_bajas = pct_bajas_prev != null ? r.pct_bajas - pct_bajas_prev : null;
      const estadoInfo = estadoTecnico(
        { tecnico: r.tecnico, delegacion: r.delegacion, cerradas: r.cerradas, pct_bajas: r.pct_bajas, pct_bajas_esp: r.pct_bajas_esp, cerradas_prev: p?.cerradas ?? r.cerradas_prev, delta_pct: r.delta_pct },
        p ? { tecnico: p.tecnico, delegacion: p.delegacion, cerradas: p.cerradas, pct_bajas: p.pct_bajas, pct_bajas_esp: p.pct_bajas_esp } : null,
        mediaByDeleg.get(r.delegacion) ?? null,
      );
      return { ...r, bajas_prev, pct_bajas_prev, delta_ratio_bajas, estadoInfo };
    });
  }, [rowsRaw, rowsPrev]);

  const sortByEstado = (arr: EnrichedRow[]) =>
    arr.slice().sort((a, b) => {
      const d = ordenEstado[a.estadoInfo.estado] - ordenEstado[b.estadoInfo.estado];
      if (d !== 0) return d;
      return b.cerradas - a.cerradas;
    });

  const activos = rows.filter((r) => r.activo);
  const inactivos = rows.filter((r) => !r.activo);
  const centralAll = activos.filter((r) => r.grupo === "Central");
  const dele = sortByEstado(activos.filter((r) => r.grupo === "Delegaciones"));

  const gamasPresentes = useMemo(() => {
    const set = new Set(centralAll.map((r) => r.gama_principal).filter(Boolean) as string[]);
    return GAMA_ORDER.filter((g) => set.has(g));
  }, [centralAll]);

  const central = gamaFilter ? centralAll.filter((r) => r.gama_principal === gamaFilter) : centralAll;

  const centralGroups = useMemo(() => {
    const groups: Array<{ gama: string | null; rows: EnrichedRow[] }> = [];
    const byGama = new Map<string, EnrichedRow[]>();
    const sinGama: EnrichedRow[] = [];
    for (const r of central) {
      if (r.gama_principal) {
        const arr = byGama.get(r.gama_principal) ?? [];
        arr.push(r);
        byGama.set(r.gama_principal, arr);
      } else {
        sinGama.push(r);
      }
    }
    for (const g of GAMA_ORDER) {
      const arr = byGama.get(g);
      if (arr && arr.length) groups.push({ gama: g, rows: sortByEstado(arr) });
    }
    if (sinGama.length) groups.push({ gama: null, rows: sortByEstado(sinGama) });
    return groups;
  }, [central]);



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

      {gamasPresentes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mr-1">Filtro por gama (Central)</span>
          <button
            onClick={() => setGamaFilter(null)}
            className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${gamaFilter === null ? "bg-ink text-bone border-ink" : "border-black/[0.1] text-ink/60 hover:text-ink hover:border-ink/40"}`}
          >Todas</button>
          {gamasPresentes.map((g) => (
            <button
              key={g}
              onClick={() => setGamaFilter(g)}
              className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${gamaFilter === g ? "bg-ink text-bone border-ink" : "border-black/[0.1] text-ink/60 hover:text-ink hover:border-ink/40"}`}
            >{GAMA_LABEL[g] ?? g}</button>
          ))}
        </div>
      )}

      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">
          Central San Agustín (taller) · {central.length} técnicos
          {gamaFilter && <span className="ml-2 text-ink/50 normal-case tracking-normal">— gama {GAMA_LABEL[gamaFilter] ?? gamaFilter}</span>}
        </p>
        <div className="space-y-4">
          {centralGroups.length === 0 && (
            <div className="border border-black/[0.06] rounded-2xl bg-white px-4 py-8 text-center text-sm text-ink/40">
              Sin técnicos en el período con los filtros actuales.
            </div>
          )}
          {centralGroups.map((g) => (
            <TecTable
              key={g.gama ?? "sin-gama"}
              subtitle={g.gama ? `Gama ${GAMA_LABEL[g.gama] ?? g.gama}` : "Sin gama asignada"}
              rows={g.rows}
              onOpen={setSel}
            />
          ))}
        </div>
      </section>

      <TecGroup title="Delegaciones (calle)" rows={dele} onOpen={setSel} />

      {inactivos.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Técnicos inactivos</p>
          <div className="border border-black/[0.06] rounded-2xl bg-white divide-y divide-black/[0.05]">
            {inactivos.map((r) => (
              <div key={r.tecnico} className="px-4 py-2.5 flex justify-between items-center text-sm text-ink/50">
                <span>{r.tecnico} <span className="text-ink/30">· {r.delegacion || "—"}</span> {r.gama_principal && <span className="text-ink/30">· {gamaLabel(r.gama_principal)}</span>}</span>
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

const HeaderCells = () => (
  <tr>
    <th className="text-left px-4 py-2.5 font-semibold">Técnico</th>
    <th className="text-right px-3 py-2.5 font-semibold" title="Cerradas en el período">Cerradas</th>
    <th className="text-right px-3 py-2.5 font-semibold text-ink/40" title="Cerradas en el período anterior equivalente">Ant.</th>
    <th className="text-right px-3 py-2.5 font-semibold" title="Variación de cierres vs. período anterior">Δ</th>
    <th className="text-right px-3 py-2.5 font-semibold">SLA 20d</th>
    <th className="text-right px-3 py-2.5 font-semibold">Días</th>
    <th className="text-right px-3 py-2.5 font-semibold" title="Ratio bajas / cerradas del período">% Bajas</th>
    <th className="text-right px-3 py-2.5 font-semibold text-ink/40" title="Bajas absolutas del período anterior">B. ant.</th>
    <th className="text-right px-3 py-2.5 font-semibold" title="Diferencia en puntos porcentuales del ratio de bajas">Δ ratio</th>
    <th className="text-right px-3 py-2.5 font-semibold">% NFF</th>
    <th className="text-left px-3 py-2.5 font-semibold">Estado</th>
    <th className="text-left px-3 py-2.5 font-semibold">Observación</th>
    <th className="text-right px-4 py-2.5 font-semibold" title="Score PROVISIONAL 0-100">Score</th>
  </tr>
);

const RowCells = ({
  r,
  onOpen,
  showGamaChip,
}: {
  r: EnrichedRow;
  onOpen: (r: EnrichedRow) => void;
  showGamaChip?: boolean;
}) => {
  const dRatio = r.delta_ratio_bajas;
  const dRatioCls =
    dRatio == null ? "text-ink/30" : dRatio > 0.02 ? "text-red-600" : dRatio < -0.02 ? "text-emerald-600" : "text-ink/50";
  return (
    <tr onClick={() => onOpen(r)} className="cursor-pointer hover:bg-black/[0.02] transition-colors">
      <td className="px-4 py-2.5">
        <p className="text-ink font-medium flex items-center gap-2">
          {r.tecnico}
          {showGamaChip && <GamaChip gama={r.gama_principal} />}
        </p>
        <p className="text-[11px] text-ink/40">{r.delegacion || "—"}</p>
      </td>
      <td className="text-right px-3 py-2.5 tabular-nums">{fmtNum(r.cerradas)}</td>
      <td className="text-right px-3 py-2.5 tabular-nums text-ink/40">{fmtNum(r.cerradas_prev)}</td>
      <td className="text-right px-3 py-2.5">{deltaBadge(r.delta_pct)}</td>
      <td className="text-right px-3 py-2.5 tabular-nums">{fmtPct(r.pct_sla20)}</td>
      <td className="text-right px-3 py-2.5 tabular-nums">{fmtDec(r.dias_medio, 1)}</td>
      <td className="px-3 py-2.5">{compareCell(r.pct_bajas, r.pct_bajas_esp)}</td>
      <td className="text-right px-3 py-2.5 tabular-nums text-ink/40">{r.bajas_prev == null ? "—" : fmtNum(r.bajas_prev)}</td>
      <td className={`text-right px-3 py-2.5 tabular-nums text-xs ${dRatioCls}`}>
        {dRatio == null ? "—" : `${dRatio > 0 ? "+" : ""}${(dRatio * 100).toFixed(1)} pp`}
      </td>
      <td className="px-3 py-2.5">{compareCell(r.pct_nff, r.pct_nff_esp)}</td>
      <td className="px-3 py-2.5"><EstadoBadge e={r.estadoInfo} /></td>
      <td className="px-3 py-2.5 text-[11px] text-ink/60 max-w-[260px]">
        {r.estadoInfo.razones.length ? r.estadoInfo.razones.join(" ") : "—"}
      </td>
      <td className="text-right px-4 py-2.5">{scoreBadge(r.score)}</td>
    </tr>
  );
};

const TecTable = ({ subtitle, rows, onOpen }: { subtitle?: string; rows: EnrichedRow[]; onOpen: (r: EnrichedRow) => void }) => (
  <div className="border border-black/[0.06] rounded-2xl bg-white overflow-x-auto">
    {subtitle && (
      <div className="px-4 py-2 border-b border-black/[0.05] flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-tight text-ink/70">{subtitle}</span>
        <span className="text-[10px] text-ink/40 tabular-nums">{rows.length} técnicos</span>
      </div>
    )}
    <table className="w-full text-sm">
      <thead className="text-[10px] uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.06] sticky top-0 bg-white">
        <HeaderCells />
      </thead>
      <tbody className="divide-y divide-black/[0.04]">
        {rows.map((r) => <RowCells key={r.tecnico} r={r} onOpen={onOpen} showGamaChip />)}
        {rows.length === 0 && (
          <tr><td colSpan={13} className="text-center px-4 py-8 text-ink/40 text-sm">Sin técnicos.</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

const TecGroup = ({ title, rows, onOpen }: { title: string; rows: EnrichedRow[]; onOpen: (r: EnrichedRow) => void }) => (
  <section>
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">{title} · {rows.length} técnicos</p>
    <div className="border border-black/[0.06] rounded-2xl bg-white overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.06] sticky top-0 bg-white">
          <HeaderCells />
        </thead>
        <tbody className="divide-y divide-black/[0.04]">
          {rows.map((r) => <RowCells key={r.tecnico} r={r} onOpen={onOpen} />)}
          {rows.length === 0 && (
            <tr><td colSpan={13} className="text-center px-4 py-8 text-ink/40 text-sm">Sin técnicos en el período con los filtros actuales.</td></tr>
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

const FichaDrawer = ({ tecnico, onClose }: { tecnico: EnrichedRow; onClose: () => void }) => {
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
            <h2 className="font-display text-2xl tracking-tight text-ink mt-1 flex items-center gap-2">
              {tecnico.tecnico}
              <GamaChip gama={tecnico.gama_principal} />
            </h2>
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
