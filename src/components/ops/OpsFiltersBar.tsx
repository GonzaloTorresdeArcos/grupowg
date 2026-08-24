import { useOpsFilters } from "@/lib/ops-filters";
import { gamaDisplayMap } from "@/lib/ops-gamas";
import { estadoCobertura, fechaLarga, TOOLTIP_SIN_COMPARABLE } from "@/lib/ops-periodo";
import { labelComparativa } from "@/lib/ops-performance";
import { AlertTriangle, Info, X } from "lucide-react";
import { OpsPeriodPicker } from "./OpsPeriodPicker";



const Sel = ({ label, value, options, onChange, displayMap }: {
  label: string; value: string | null; options: string[]; onChange: (v: string | null) => void;
  displayMap?: Record<string, string>;
}) => {
  // Blindaje: si por cualquier camino llega algo que no es array (payload
  // malformado, respuesta parcial), degradamos a lista vacía en vez de romper.
  const list = Array.isArray(options) ? options : [];
  return (
    <label className="flex flex-col gap-1 min-w-[130px]">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-8 px-2 rounded-md border border-black/[0.08] bg-white text-[13px] text-ink focus:outline-none focus:border-ink/40"
      >
        <option value="">Todos</option>
        {list.map((o) => (
          <option key={o} value={o}>{displayMap?.[o] ?? o}</option>
        ))}
      </select>
    </label>
  );
};


export const OpsFiltersBar = () => {
  const {
    filters, setFilters, reset, options, optionsError, reloadOptions,
    modo, modoSeleccionado, setModo, preset, aplicarPreset, prevRange, sinComparable, cobertura,
  } = useOpsFilters();
  const canalWarning = filters.canal === "Taller" || filters.canal === "Domicilio";
  const cob = estadoCobertura({ from: filters.from, to: filters.to }, cobertura);
  const ytdForzado = preset === "ytd";
  return (
    <div className="border-b border-black/[0.06] bg-white/85 backdrop-blur-xl sticky top-0 lg:top-14 z-10">
      <div className="max-w-6xl mx-auto px-4 md:px-10 py-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Período</span>
          <OpsPeriodPicker
            value={{ from: filters.from, to: filters.to }}
            onChange={(v) => setFilters({ from: v.from, to: v.to })}
            cobertura={cobertura}
            preset={preset}
            onPreset={(k) => aplicarPreset(k)}
          />
        </div>
        <label className="flex flex-col gap-1 min-w-[190px]">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Comparar con</span>
          <select
            value={modo}
            disabled={ytdForzado}
            title={ytdForzado
              ? "En YTD la comparación es siempre interanual homogénea (mismo intervalo exacto del año anterior)"
              : undefined}
            onChange={(e) => setModo(e.target.value === "interanual" ? "interanual" : "anterior")}
            className="h-8 px-2 rounded-md border border-black/[0.08] bg-white text-[13px] text-ink focus:outline-none focus:border-ink/40 disabled:opacity-60"
          >
            <option value="anterior">Período anterior equivalente</option>
            <option value="interanual">Mismo período del año anterior</option>
          </select>
        </label>

        <Sel label="Delegación" value={filters.delegacion} options={options.delegaciones}
          onChange={(v) => setFilters({ delegacion: v })} />
        <Sel label="Cliente" value={filters.cliente} options={options.clientes}
          onChange={(v) => setFilters({ cliente: v })} />
        <Sel label="Gama" value={filters.gama} options={options.gamas}
          displayMap={gamaDisplayMap(Array.isArray(options.gamas) ? options.gamas : [])}
          onChange={(v) => setFilters({ gama: v })} />

        <Sel label="Familia" value={filters.familia} options={options.familias}
          onChange={(v) => setFilters({ familia: v })} />
        <Sel label="Marca" value={filters.marca} options={options.marcas}
          onChange={(v) => setFilters({ marca: v })} />
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
        {optionsError && (
          <span role="alert" className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-red-50 border border-red-200 text-[11px] text-red-800">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            No se han podido cargar las opciones de filtro
            <button
              type="button"
              onClick={reloadOptions}
              className="ml-1 font-semibold underline underline-offset-2 hover:text-red-900"
            >
              Reintentar
            </button>
          </span>
        )}
        <span className="w-full text-[11px] text-ink/50">
          Comparando: <strong className="text-ink/70">{labelComparativa(filters.from, filters.to, modo)}</strong>
          {ytdForzado && " · YTD homogéneo: mismo intervalo exacto del año anterior"}
          {sinComparable && (
            <span className="ml-2 text-amber-700" title={TOOLTIP_SIN_COMPARABLE}>
              — {TOOLTIP_SIN_COMPARABLE} ({prevRange.from} → {prevRange.to})
            </span>
          )}
        </span>
        {(cob === "parcial" || cob === "fuera") && (
          <span role="status" className="w-full inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
            <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            {cob === "fuera"
              ? "El período seleccionado está fuera de los datos cargados — no se muestran cifras, no se rellenan con ceros."
              : "Parte del período seleccionado no tiene datos cargados; esos tramos aparecen como “sin datos”, nunca como cero."}
            {" "}Datos disponibles desde {fechaLarga(cobertura.min)} hasta {fechaLarga(cobertura.max)}.
          </span>
        )}
      </div>
    </div>

  );
};
