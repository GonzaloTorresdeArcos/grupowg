import { useEffect, useMemo, useState } from "react";
import { fetchOperationsData, type OtRow } from "@/lib/ops-queries";
import { Loader2 } from "lucide-react";

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtNum = (n: number) => new Intl.NumberFormat("es-ES").format(Math.round(n));

const Delegaciones = () => {
  const [rows, setRows] = useState<OtRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOperationsData().then((r) => { setRows(r); setLoading(false); });
  }, []);

  const agg = useMemo(() => {
    const map = new Map<string, OtRow[]>();
    for (const r of rows) {
      const key = r.delegacion ?? "Sin asignar";
      const arr = map.get(key) ?? [];
      arr.push(r); map.set(key, arr);
    }
    return Array.from(map.entries()).map(([delegacion, list]) => {
      const cerradas = list.filter((r) => r.situacion === "Cerrado");
      const sla20 = cerradas.length ? cerradas.filter((r) => r.kpi_20d).length / cerradas.length : 0;
      const dias = cerradas.map((r) => r.dias_cierre ?? 0).filter((x) => x > 0);
      const diasMedio = dias.length ? dias.reduce((a, b) => a + b, 0) / dias.length : 0;
      const bajas = list.filter((r) => r.es_baja).length;
      const nff = list.filter((r) => r.es_nff).length;
      const abiertas = list.filter((r) => r.situacion === "Abierto").length;
      const tecnicosUnicos = new Set(list.map((r) => r.tecnico).filter(Boolean)).size;
      return { delegacion, ots: list.length, abiertas, cerradas: cerradas.length, sla20, diasMedio, bajas, nff, tecnicosUnicos };
    }).sort((a, b) => b.ots - a.ots);
  }, [rows]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Red HIPERSERVICE</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">Delegaciones</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Central San Agustín (taller) · Barcelona · Valencia · Las Palmas.
          Tenerife cerrada en julio 2026.
        </p>
      </header>

      {agg.length === 0 ? (
        <p className="text-sm text-ink/50 py-10 text-center">Sin datos.</p>
      ) : (
        <div className="grid gap-3">
          {agg.map((d) => (
            <div key={d.delegacion} className="border border-black/[0.06] rounded-2xl bg-white p-6">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div>
                  <p className="font-display text-lg tracking-tight text-ink">{d.delegacion}</p>
                  <p className="text-xs text-ink/50 mt-0.5">{d.tecnicosUnicos} técnicos activos · {fmtNum(d.abiertas)} abiertas</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-right">
                  <div><p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">OTs</p><p className="font-display text-xl tabular-nums text-ink">{fmtNum(d.ots)}</p></div>
                  <div><p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">SLA 20d</p><p className="font-display text-xl tabular-nums text-ink">{fmtPct(d.sla20)}</p></div>
                  <div><p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">Días medio</p><p className="font-display text-xl tabular-nums text-ink">{d.diasMedio.toFixed(1)}</p></div>
                  <div><p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">Bajas</p><p className="font-display text-xl tabular-nums text-ink">{fmtNum(d.bajas)}</p></div>
                  <div><p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">NFF</p><p className="font-display text-xl tabular-nums text-ink">{fmtNum(d.nff)}</p></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Delegaciones;
