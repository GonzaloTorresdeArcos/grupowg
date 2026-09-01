import { useEffect, useMemo, useRef, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { useOpsFilters, type OpsFilters } from "@/lib/ops-filters";
import { OPS_QUERY_ROOT } from "@/lib/ops-query";
import { gamaDisplayMap } from "@/lib/ops-gamas";
import { estadoCobertura, fechaLarga, TOOLTIP_SIN_COMPARABLE } from "@/lib/ops-periodo";
import { labelComparativa } from "@/lib/ops-performance";
import { AlertTriangle, Info, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { OpsPeriodPicker } from "./OpsPeriodPicker";

/** Único scope donde el parámetro `programa` es consumido por la RPC. */
export const RUTAS_CON_FILTRO_PROGRAMA = ["/operaciones/performance-real"];

/** Filtros secundarios: viven detrás de «Más filtros». */
const SECUNDARIOS: (keyof OpsFilters)[] = [
  "gama", "familia", "marca", "provincia", "sat", "tecnico", "canal",
];

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
    modo, setModo, preset, aplicarPreset, prevRange, sinComparable, cobertura, programas,
  } = useOpsFilters();
  // A3 · Indicador no bloqueante: la UI sigue mostrando la última foto válida
  // mientras se resuelve la nueva tanda de RPC.
  const fetching = useIsFetching({ queryKey: [OPS_QUERY_ROOT] });
  // Rutas cuyas RPC aceptan y aplican de verdad el parámetro `programa`.
  const pathname = typeof window === "undefined" ? "" : window.location.pathname;
  const programaEnScope = RUTAS_CON_FILTRO_PROGRAMA.some((r) => pathname.startsWith(r));
  const canalWarning = filters.canal === "Taller" || filters.canal === "Domicilio";
  const cob = estadoCobertura({ from: filters.from, to: filters.to }, cobertura);
  const ytdForzado = preset === "ytd";

  const [masOpen, setMasOpen] = useState(false);
  // UX1 · Auto-collapse al scroll: la barra pasa a context bar de una línea.
  const [scrolled, setScrolled] = useState(false);
  const [forzarEdicion, setForzarEdicion] = useState(false);
  const barraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 96);
      if (y <= 96) setForzarEdicion(false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nSecundarios = useMemo(
    () => SECUNDARIOS.filter((k) => filters[k]).length,
    [filters],
  );

  const programaLabel = useMemo(
    () => (Array.isArray(programas) ? programas : []).find((p) => p.id === filters.programa)?.label ?? null,
    [programas, filters.programa],
  );

  const compacto = scrolled && !forzarEdicion;

  const abrirEdicion = () => {
    setForzarEdicion(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      ref={barraRef}
      data-testid="ops-filters-bar"
      data-modo={compacto ? "compacto" : "expandido"}
      className="border-b border-black/[0.06] bg-white/85 backdrop-blur-xl sticky top-0 lg:top-12 z-10"
    >
      {compacto ? (
        <div className="max-w-6xl mx-auto px-4 md:px-10 h-11 flex items-center gap-3 text-[12px] text-ink/70 overflow-hidden">
          <span className="truncate">
            <strong className="text-ink font-medium">{labelComparativa(filters.from, filters.to, modo)}</strong>
          </span>
          {(programaLabel || filters.cliente) && (
            <span className="hidden sm:inline text-ink/30">|</span>
          )}
          {(programaLabel || filters.cliente) && (
            <span className="hidden sm:inline truncate max-w-[280px]">{programaLabel ?? filters.cliente}</span>
          )}
          {nSecundarios > 0 && (
            <>
              <span className="text-ink/30">|</span>
              <span className="whitespace-nowrap">+{nSecundarios} filtros</span>
            </>
          )}
          <button
            type="button"
            onClick={abrirEdicion}
            className="ml-auto h-7 px-3 rounded-full border border-black/[0.08] text-[12px] text-ink/70 hover:text-ink hover:border-ink/40 whitespace-nowrap"
          >
            Cambiar filtros
          </button>
        </div>
      ) : (
      <div className="max-w-6xl mx-auto px-4 md:px-10 py-2.5 flex flex-wrap items-end gap-x-3 gap-y-2">
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
            aria-label="Modo de comparación"
            data-testid="ops-modo-comparacion"
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

        {/* PRV-A1 · el filtro de Programa SOLO se ofrece donde la RPC lo
            consume realmente. Fuera de ese scope no se muestra, para no
            simular un filtrado que el backend ignora. */}
        {programaEnScope && (
          programaLabel ? (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Programa</span>
              <div className="h-8 inline-flex items-center gap-2 pl-3 pr-1.5 rounded-full bg-ink/[0.05] border border-black/[0.06]">
                <span className="text-[12.5px] text-ink truncate max-w-[220px]">{programaLabel}</span>
                <button
                  type="button"
                  aria-label="Quitar filtro de programa"
                  onClick={() => setFilters({ programa: null })}
                  className="h-5 w-5 rounded-full flex items-center justify-center text-ink/50 hover:text-ink hover:bg-black/[0.06]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col gap-1 min-w-[190px]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Programa</span>
              <select
                aria-label="Programa contractual"
                value={filters.programa ?? ""}
                onChange={(e) => setFilters({ programa: e.target.value || null })}
                className="h-8 px-2 rounded-md border border-black/[0.08] bg-white text-[13px] text-ink focus:outline-none focus:border-ink/40"
              >
                <option value="">Todos</option>
                {(Array.isArray(programas) ? programas : []).map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>
          )
        )}

        <button
          type="button"
          onClick={() => setMasOpen((o) => !o)}
          aria-expanded={masOpen}
          aria-controls="ops-mas-filtros"
          className={cn(
            "h-8 px-3 rounded-md border text-[12px] flex items-center gap-1.5 transition-colors",
            nSecundarios > 0
              ? "border-ink/30 text-ink"
              : "border-black/[0.08] text-ink/70 hover:text-ink hover:border-ink/40",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Más filtros{nSecundarios > 0 ? ` (${nSecundarios})` : ""}
        </button>

        {fetching > 0 && (
          <span
            role="status"
            data-testid="ops-actualizando"
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-ink/[0.04] border border-black/[0.06] text-[11px] text-ink/60"
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink/40 animate-pulse" />
            Actualizando…
          </span>
        )}
        <button onClick={reset}
          className="h-8 px-3 rounded-md border border-black/[0.08] text-[12px] text-ink/70 hover:text-ink hover:border-ink/40 flex items-center gap-1">
          <X className="h-3 w-3" /> Limpiar
        </button>

        <span className="w-full text-[11px] text-ink/50 leading-tight">
          Comparando: <strong className="text-ink/70">{labelComparativa(filters.from, filters.to, modo)}</strong>
          {ytdForzado && " · YTD homogéneo: mismo intervalo exacto del año anterior"}
          {sinComparable && (
            <span className="ml-2 text-amber-700" title={TOOLTIP_SIN_COMPARABLE}>
              — {TOOLTIP_SIN_COMPARABLE} ({prevRange.from} → {prevRange.to})
            </span>
          )}
        </span>

        {masOpen && (
          <div
            id="ops-mas-filtros"
            data-testid="ops-mas-filtros"
            className="w-full mt-1 pt-3 border-t border-black/[0.06] flex flex-wrap items-end gap-3"
          >
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
          </div>
        )}

        {canalWarning && (
          <span className="w-full inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
            <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />
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
      )}
    </div>
  );
};
