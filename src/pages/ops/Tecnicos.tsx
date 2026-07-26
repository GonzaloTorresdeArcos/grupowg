import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchOperationsData, type OtRow } from "@/lib/ops-queries";
import { Loader2 } from "lucide-react";

type TecMaster = { tecnico: string; delegacion: string | null; activo: boolean };

type Score = {
  tecnico: string;
  delegacion: string | null;
  grupo: "Central" | "Delegaciones";
  ots: number;
  productividad: number;
  sla20: number;
  bajasPct: number;
  nffPct: number;
  envejecidas: number;
  score: number;
};

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

const Tecnicos = () => {
  const [rows, setRows] = useState<OtRow[]>([]);
  const [tecs, setTecs] = useState<TecMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [grupo, setGrupo] = useState<"todos" | "Central" | "Delegaciones">("todos");

  useEffect(() => {
    (async () => {
      const [ots, master] = await Promise.all([
        fetchOperationsData(),
        supabase.from("ops_tecnicos").select("tecnico,delegacion,activo"),
      ]);
      setRows(ots);
      setTecs((master.data ?? []) as TecMaster[]);
      setLoading(false);
    })();
  }, []);

  const scores = useMemo<Score[]>(() => {
    const byTec = new Map<string, OtRow[]>();
    for (const r of rows) {
      if (!r.tecnico) continue;
      const arr = byTec.get(r.tecnico) ?? [];
      arr.push(r);
      byTec.set(r.tecnico, arr);
    }
    const activos = new Set(tecs.filter((t) => t.activo).map((t) => t.tecnico));
    const delMap = new Map(tecs.map((t) => [t.tecnico, t.delegacion]));

    const today = new Date();
    const diffDays = (a: string | null) => (a ? Math.floor((today.getTime() - new Date(a).getTime()) / 86400000) : 0);

    const out: Score[] = [];
    for (const [tec, list] of byTec) {
      if (activos.size > 0 && !activos.has(tec)) continue;
      const delegacion = delMap.get(tec) ?? list[0]?.delegacion ?? null;
      const grp: "Central" | "Delegaciones" =
        (delegacion ?? "").toLowerCase().includes("central") || (delegacion ?? "").toLowerCase().includes("san agust")
          ? "Central" : "Delegaciones";
      const cerradas = list.filter((r) => r.situacion === "Cerrado");
      const sla20 = cerradas.length ? cerradas.filter((r) => r.kpi_20d).length / cerradas.length : 0;
      const bajasPct = list.length ? list.filter((r) => r.es_baja).length / list.length : 0;
      const nffPct = list.length ? list.filter((r) => r.es_nff).length / list.length : 0;
      const abiertas = list.filter((r) => r.situacion === "Abierto");
      const envejecidas = abiertas.filter((r) => diffDays(r.fecha_creacion) > 20).length;

      // Provisional weights: productividad 30, sla20 30, calidad 30, envejecimiento 10
      const productividad = Math.min(1, list.length / 120); // 120 OTs/mes ≈ referencia
      const calidad = 1 - Math.min(1, (bajasPct + nffPct) / 0.5); // penaliza mezcla desfavorable
      const envejPenal = 1 - Math.min(1, envejecidas / 20);
      const score = Math.round((productividad * 30 + sla20 * 30 + calidad * 30 + envejPenal * 10));

      out.push({
        tecnico: tec, delegacion, grupo: grp,
        ots: list.length, productividad, sla20, bajasPct, nffPct, envejecidas, score,
      });
    }
    return out.sort((a, b) => b.score - a.score);
  }, [rows, tecs]);

  const filtered = grupo === "todos" ? scores : scores.filter((s) => s.grupo === grupo);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Scorecard</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">Técnicos propios</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Ranking dentro de grupo comparable (Central taller vs. Delegaciones calle). Score 0-100
          <span className="text-ink/40"> · provisional</span>: pendiente incorporar días trabajados, ausencias,
          satisfacción y reclamaciones. Técnicos inactivos excluidos.
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
                <th className="text-right font-medium px-4 py-3">OTs</th>
                <th className="text-right font-medium px-4 py-3">SLA 20d</th>
                <th className="text-right font-medium px-4 py-3">% Bajas</th>
                <th className="text-right font-medium px-4 py-3">% NFF</th>
                <th className="text-right font-medium px-4 py-3">+20d</th>
                <th className="text-right font-medium px-4 py-3">Score*</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.tecnico} className="border-b border-black/[0.04] last:border-0 hover:bg-black/[0.02]">
                  <td className="px-4 py-3 text-ink">{s.tecnico}<div className="text-[11px] text-ink/40">{s.delegacion ?? "—"}</div></td>
                  <td className="px-4 py-3 text-ink/70">{s.grupo}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.ots}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtPct(s.sla20)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtPct(s.bajasPct)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtPct(s.nffPct)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.envejecidas}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{s.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-ink/40">
        * Score provisional. Pesos actuales: Productividad 30 · SLA-20d 30 · Calidad (bajas+NFF) 30 · Envejecimiento 10.
        Aún no se contrastan bajas/NFF con benchmark por familia×cliente. Nunca sugerir reducción de incentivo sin revisar carga, territorio y ausencias.
      </p>
    </div>
  );
};

export default Tecnicos;
