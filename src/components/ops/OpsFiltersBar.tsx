import { useOpsFilters } from "@/lib/ops-filters";
import { Info, X } from "lucide-react";

const Sel = ({ label, value, options, onChange, displayMap }: {
  label: string; value: string | null; options: string[]; onChange: (v: string | null) => void;
  displayMap?: Record<string, string>;
}) => (
  <label className="flex flex-col gap-1 min-w-[130px]">
    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</span>
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-8 px-2 rounded-md border border-black/[0.08] bg-white text-[13px] text-ink focus:outline-none focus:border-ink/40"
    >
      <option value="">Todos</option>
      {options.map((o) => (
        <option key={o} value={o}>{displayMap?.[o] ?? o}</option>
      ))}
    </select>
  </label>
);


export const OpsFiltersBar = () => {
  const { filters, setFilters, reset, options } = useOpsFilters();
  const canalWarning = filters.canal === "Taller" || filters.canal === "Domicilio";
  return (
    <div className="border-b border-black/[0.06] bg-white/85 backdrop-blur-xl sticky top-0 lg:top-14 z-10">
      <div className="max-w-6xl mx-auto px-4 md:px-10 py-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Desde</span>
          <input type="date" value={filters.from} onChange={(e) => setFilters({ from: e.target.value })}
            className="h-8 px-2 rounded-md border border-black/[0.08] bg-white text-[13px]" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Hasta</span>
          <input type="date" value={filters.to} onChange={(e) => setFilters({ to: e.target.value })}
            className="h-8 px-2 rounded-md border border-black/[0.08] bg-white text-[13px]" />
        </label>
        <Sel label="Delegación" value={filters.delegacion} options={options.delegaciones}
          onChange={(v) => setFilters({ delegacion: v })} />
        <Sel label="Cliente" value={filters.cliente} options={options.clientes}
          onChange={(v) => setFilters({ cliente: v })} />
        <Sel label="Gama" value={filters.gama} options={options.gamas}
          onChange={(v) => setFilters({ gama: v })} />
        <Sel label="Familia" value={filters.familia} options={options.familias}
          onChange={(v) => setFilters({ familia: v })} />
        <Sel label="Provincia" value={filters.provincia} options={options.provincias}
          onChange={(v) => setFilters({ provincia: v })} />
        <Sel label="SAT" value={filters.sat} options={options.sats}
          onChange={(v) => setFilters({ sat: v })} />
        <Sel label="Técnico" value={filters.tecnico} options={options.tecnicos}
          onChange={(v) => setFilters({ tecnico: v })} />
        <Sel label="Canal" value={filters.canal} options={options.canales}
          onChange={(v) => setFilters({ canal: v })} />
        <button onClick={reset}
          className="h-8 px-3 rounded-md border border-black/[0.08] text-[12px] text-ink/70 hover:text-ink hover:border-ink/40 flex items-center gap-1">
          <X className="h-3 w-3" /> Limpiar
        </button>
        {canalWarning && (
          <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
            <Info className="h-3.5 w-3.5 text-amber-600" />
            Canal medido o inferido por tipo de producto — cubre el 79% de las OTs (reglas validadas, ≥95% de acierto)
          </span>
        )}
      </div>
    </div>
  );
};
