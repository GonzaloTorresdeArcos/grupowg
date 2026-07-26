import { useEffect, useMemo, useState } from "react";
import { fetchOperationsData, type OtRow } from "@/lib/ops-queries";
import { Loader2 } from "lucide-react";

const SLA = () => {
  const [rows, setRows] = useState<OtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"20" | "30">("20");

  useEffect(() => {
    fetchOperationsData().then((r) => { setRows(r); setLoading(false); });
  }, []);

  const abiertas = useMemo(() => {
    const today = new Date();
    const umbral = filtro === "20" ? 20 : 30;
    return rows
      .filter((r) => r.situacion === "Abierto" && r.fecha_creacion)
      .map((r) => {
        const dias = Math.floor((today.getTime() - new Date(r.fecha_creacion!).getTime()) / 86400000);
        return { ...r, dias };
      })
      .filter((r) => r.dias > umbral)
      .sort((a, b) => b.dias - a.dias);
  }, [rows, filtro]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Cartera abierta</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">SLA · Envejecidos</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Órdenes abiertas cuyo tiempo transcurrido desde la creación supera el umbral seleccionado.
        </p>
      </header>

      <div className="flex gap-2">
        {(["20", "30"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFiltro(v)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filtro === v ? "bg-ink text-bone border-ink" : "border-black/[0.12] text-ink/70 hover:border-ink/40"
            }`}
          >
            +{v} días
          </button>
        ))}
      </div>

      {abiertas.length === 0 ? (
        <p className="text-sm text-ink/50 py-10 text-center">Sin OTs envejecidas superando +{filtro} días. 👌</p>
      ) : (
        <div className="overflow-x-auto border border-black/[0.06] rounded-2xl bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.1em] text-ink/40 border-b border-black/[0.06]">
                <th className="text-left font-medium px-4 py-3">OT</th>
                <th className="text-left font-medium px-4 py-3">Cliente WG</th>
                <th className="text-left font-medium px-4 py-3">Técnico / SAT</th>
                <th className="text-left font-medium px-4 py-3">Provincia</th>
                <th className="text-left font-medium px-4 py-3">Familia</th>
                <th className="text-right font-medium px-4 py-3">Días</th>
              </tr>
            </thead>
            <tbody>
              {abiertas.slice(0, 200).map((r) => (
                <tr key={r.id} className="border-b border-black/[0.04] last:border-0 hover:bg-black/[0.02]">
                  <td className="px-4 py-3 text-ink font-medium">{r.num_ot}</td>
                  <td className="px-4 py-3 text-ink/70">{r.cliente_wg ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/70">{r.tecnico ?? r.sat ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/70">{r.provincia ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/70">{r.familia ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">{r.dias}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {abiertas.length > 200 && (
            <div className="px-4 py-3 text-[11px] text-ink/40 border-t border-black/[0.06]">
              Mostrando 200 de {abiertas.length} OTs.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SLA;
