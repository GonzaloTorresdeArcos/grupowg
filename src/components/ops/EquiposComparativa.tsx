import { useEffect, useState } from "react";
import { useOpsRpc } from "@/lib/ops-query";
import { useOpsFilters, fmtNum, fmtPct, fmtDec, fmtEur } from "@/lib/ops-filters";
import { esDelegacionReal } from "@/lib/ops-performance";
import { gamaLabel } from "@/lib/ops-gamas";
import { Loader2 } from "lucide-react";
import { AmbitoChip } from "@/components/ops/OpsAmbito";

type EquipoRow = {
  equipo: string;
  ambito: string;
  tecnicos_activos: number;
  cerradas: number;
  pct_sla20: number;
  pct_bajas: number;
  pct_bajas_esp: number;
  pct_nff: number;
  pct_nff_esp: number;
  dias_medio: number;
  coste_medio: number;
  despl_medio: number;
  abiertas: number;
  abiertas_30: number;
  // Ampliación aditiva de ops_equipos (F1 V2): separación entidad ↔ gama.
  tipo_entidad?: "equipo_central" | "delegacion" | null;
  nombre_display?: string | null;
  gama_atendida?: string | null;
};


const slaTone = (v: number) => {
  const pct = Number(v) * 100;
  if (pct >= 85) return "text-emerald-600";
  if (pct >= 70) return "text-amber-600";
  return "text-red-600";
};

// Rojo solo si supera 1,5× el esperado (contextualizado)
const qualityTone = (v: number, esp: number) => {
  if (!esp || esp <= 0) return "text-ink";
  if (v > 1.5 * esp) return "text-red-600";
  if (v > esp) return "text-amber-600";
  return "text-emerald-600";
};

const Pair = ({ v, esp, tone }: { v: number; esp: number; tone: string }) => (
  <span className="tabular-nums">
    <span className={tone}>{fmtPct(v)}</span>
    <span className="text-ink/40 text-[11px]"> vs {fmtPct(esp)} esp.</span>
  </span>
);

export const EquiposComparativa = ({ soloCentral = false }: { soloCentral?: boolean }) => {
  const { rpcParams } = useOpsFilters();

  const params = useMemo(() => ({
    p_from: rpcParams.p_from,
    p_to: rpcParams.p_to,
    p_cliente: rpcParams.p_cliente,
    p_familia: rpcParams.p_familia,
  }), [rpcParams]);
  const q = useOpsRpc<EquipoRow[]>("ops_equipos", params);
  const rows = (q.data ?? null) as EquipoRow[] | null;
  const loading = q.isPending;

  if (loading) {
    return (
      <div className="border border-black/[0.06] rounded-2xl bg-white p-10 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-ink/40" />
      </div>
    );
  }
  if (!rows || rows.length === 0) {
    return (
      <div className="border border-black/[0.06] rounded-2xl bg-white p-6 text-sm text-ink/50">
        Sin datos de equipos para el periodo seleccionado.
      </div>
    );
  }

  // Ocultar Tenerife si está cerrada (residual)
  let visible = rows.filter(
    (r) => !(/tenerife/i.test(r.equipo) && r.tecnicos_activos === 0 && r.cerradas < 10)
  );

  // Vista HUB: solo equipos organizativos de Central (filtro estructural con
  // fallback por nombre si la RPC aún no aporta tipo_entidad).
  if (soloCentral) {
    visible = visible.filter((r) => !esDelegacionReal(r.equipo, r.tipo_entidad ?? undefined));
  }

  // Central primero, luego delegaciones; dentro, por cerradas desc
  const sorted = [...visible].sort((a, b) => {
    const aC = a.tipo_entidad ? (a.tipo_entidad === "equipo_central" ? 0 : 1) : /central/i.test(a.ambito) ? 0 : 1;
    const bC = b.tipo_entidad ? (b.tipo_entidad === "equipo_central" ? 0 : 1) : /central/i.test(b.ambito) ? 0 : 1;
    if (aC !== bC) return aC - bC;
    return b.cerradas - a.cerradas;
  });

  return (
    <section className="border border-black/[0.06] rounded-2xl bg-white overflow-hidden">
      <div className="px-6 py-5 border-b border-black/[0.05]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-1">
          Plantilla propia
        </p>
        <h2 className="font-display text-xl tracking-tight text-ink">Comparativa de equipos</h2>
        <p className="text-xs text-ink/50 mt-1">
          {soloCentral
            ? "Equipos organizativos del HUB Central San Agustín. La gama atendida se muestra como dimensión de producto, no como unidad organizativa."
            : "Equipos organizativos de Central San Agustín y delegaciones territoriales."}{" "}
          Bajas y NFF se comparan con el esperado según mix familia × cliente.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.05]">
              <th className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5">Unidad organizativa <AmbitoChip ambito="organizacion" /></span>
              </th>
              <th className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5">Gama atendida <AmbitoChip ambito="producto" /></span>
              </th>
              <th className="px-4 py-3">Ámbito</th>
              <th className="px-4 py-3 text-right">Técnicos</th>
              <th className="px-4 py-3 text-right">Cerradas</th>
              <th className="px-4 py-3 text-right">SLA 20d</th>
              <th className="px-4 py-3 text-right">% Bajas</th>
              <th className="px-4 py-3 text-right">% NFF</th>
              <th className="px-4 py-3 text-right">Días medio</th>
              <th className="px-4 py-3 text-right">Despl. €/OT</th>
              <th className="px-4 py-3 text-right">Abiertas +30d</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.equipo} className="border-b border-black/[0.04] hover:bg-ink/[0.015]">
                <td className="px-4 py-3 font-medium text-ink">{r.nombre_display || r.equipo}</td>
                <td className="px-4 py-3">
                  {r.gama_atendida ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-black/[0.04] text-[11px] text-ink/70">
                      {gamaLabel(r.gama_atendida)}
                    </span>
                  ) : (
                    <span className="text-ink/30 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink/60 text-xs">{r.ambito}</td>

                <td className="px-4 py-3 text-right tabular-nums text-ink">{fmtNum(r.tecnicos_activos)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink">{fmtNum(r.cerradas)}</td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium ${slaTone(r.pct_sla20)}`}>
                  {fmtPct(r.pct_sla20)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Pair v={r.pct_bajas} esp={r.pct_bajas_esp} tone={qualityTone(r.pct_bajas, r.pct_bajas_esp)} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Pair v={r.pct_nff} esp={r.pct_nff_esp} tone={qualityTone(r.pct_nff, r.pct_nff_esp)} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink">{fmtDec(r.dias_medio, 1)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink">{fmtEur(r.despl_medio)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink">{fmtNum(r.abiertas_30)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
