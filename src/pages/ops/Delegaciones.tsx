import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOpsFilters, fmtNum, fmtPct, fmtDec } from "@/lib/ops-filters";
import { Loader2 } from "lucide-react";
import { EquiposComparativa } from "@/components/ops/EquiposComparativa";

type KpiRow = {
  delegacion: string; cerradas: number; pct_sla20: number; dias_medio: number;
  pct_bajas: number; pct_nff: number; tecnicos: number; abiertas: number; abiertas_30: number;
};
type EvoRow = { delegacion: string; mes: string; cerradas: number };
type TecRow = { delegacion: string; tecnico: string; cerradas: number; pct_sla20: number };
type Data = { kpis: KpiRow[]; evo: EvoRow[]; tecnicos: TecRow[] };

const Delegaciones = () => {
  const { rpcParams } = useOpsFilters();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data } = await supabase.rpc("ops_delegaciones" as never, {
        p_from: rpcParams.p_from, p_to: rpcParams.p_to,
        p_cliente: rpcParams.p_cliente, p_gama: rpcParams.p_gama, p_familia: rpcParams.p_familia,
      } as never);
      setData((data ?? null) as Data | null);
      setLoading(false);
    })();
  }, [rpcParams]);

  if (loading || !data) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;

  const evoMeses = Array.from(new Set(data.evo.map((e) => e.mes))).sort();
  const maxEvo = Math.max(1, ...data.evo.map((e) => e.cerradas));

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Red HIPERSERVICE</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">Delegaciones</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Central San Agustín (taller) · Barcelona · Valencia · Las Palmas.
          Tenerife cerrada en julio 2026.
        </p>
      </header>

      <EquiposComparativa />

      <div className="grid gap-4">
        {data.kpis.sort((a, b) => b.cerradas - a.cerradas).map((d) => {
          const tecs = data.tecnicos.filter((t) => t.delegacion === d.delegacion).slice(0, 8);
          const evo = evoMeses.map((m) => {
            const r = data.evo.find((e) => e.delegacion === d.delegacion && e.mes === m);
            return { mes: m, cerradas: r?.cerradas ?? 0 };
          });
          return (
            <div key={d.delegacion} className="border border-black/[0.06] rounded-2xl bg-white p-6">
              <div className="flex items-start justify-between gap-6 flex-wrap mb-5">
                <div>
                  <p className="font-display text-lg tracking-tight text-ink">{d.delegacion}</p>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {d.tecnicos} técnicos · {fmtNum(d.abiertas)} abiertas · {fmtNum(d.abiertas_30)} +30d
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-right">
                  <Mini label="Cerradas" value={fmtNum(d.cerradas)} />
                  <Mini label="SLA 20d" value={fmtPct(d.pct_sla20)} />
                  <Mini label="Días medio" value={fmtDec(d.dias_medio, 1)} />
                  <Mini label="% Bajas" value={fmtPct(d.pct_bajas)} />
                  <Mini label="% NFF" value={fmtPct(d.pct_nff)} />
                </div>
              </div>
              <div className="flex items-end gap-1 h-16 border-t border-black/[0.04] pt-3">
                {evo.map((e) => (
                  <div key={e.mes} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-ink/70 rounded-t-sm" style={{ height: `${(e.cerradas / maxEvo) * 100}%`, minHeight: 1 }} title={`${e.mes}: ${e.cerradas}`} />
                  </div>
                ))}
              </div>
              {tecs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-black/[0.04]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Top técnicos</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {tecs.map((t) => (
                      <div key={t.tecnico} className="flex justify-between border border-black/[0.05] rounded-md px-2 py-1.5">
                        <span className="text-ink truncate">{t.tecnico}</span>
                        <span className="tabular-nums text-ink/60">{fmtNum(t.cerradas)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">{label}</p>
    <p className="font-display text-xl tabular-nums text-ink">{value}</p>
  </div>
);

export default Delegaciones;
