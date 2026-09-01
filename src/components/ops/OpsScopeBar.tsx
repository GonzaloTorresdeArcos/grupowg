import { X } from "lucide-react";
import { useMemo } from "react";
import { useOpsFilters } from "@/lib/ops-filters";
import { useDataFreshness } from "@/hooks/useDataFreshness";
import { fechaLarga } from "@/lib/ops-periodo";
import type { PerfilFiltros } from "@/lib/ops-filter-scope";

/**
 * PRV-UAT-FS1 · Barra de contexto honesta para rutas que NO consumen los
 * filtros operativos globales. No representa período, comparación ni
 * dimensiones: solo lo que gobierna de verdad las RPC de la página.
 */
export const OpsScopeBar = ({
  perfil,
  titulo,
}: {
  perfil: Exclude<PerfilFiltros, "operativa">;
  titulo: string;
}) => {
  const { filters, setFilters, programas } = useOpsFilters();
  const { asOf } = useDataFreshness();

  const prog = useMemo(
    () => (Array.isArray(programas) ? programas : []).find((p) => p.id === filters.programa) ?? null,
    [programas, filters.programa],
  );

  const contexto = perfil === "programa" && prog
    ? [prog.vertical, prog.cliente, prog.programa].filter(Boolean).join(" › ")
    : null;

  return (
    <div
      data-testid="ops-scope-bar"
      data-perfil={perfil}
      className="border-b border-black/[0.06] bg-white/85 backdrop-blur-xl sticky top-0 lg:top-12 z-10"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-10 h-11 flex items-center gap-3 text-[12px] text-ink/70 overflow-hidden">
        <strong className="text-ink font-medium whitespace-nowrap">{titulo}</strong>
        <span className="text-ink/30">·</span>
        {contexto ? (
          <>
            <span className="truncate">{contexto}</span>
            <button
              type="button"
              aria-label="Cambiar programa"
              onClick={() => setFilters({ programa: null })}
              className="ml-auto h-7 pl-3 pr-2 rounded-full border border-black/[0.08] inline-flex items-center gap-1.5 text-[12px] text-ink/70 hover:text-ink hover:border-ink/40 whitespace-nowrap"
            >
              Cambiar programa
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <span className="truncate">
            Snapshot operativo{asOf ? ` a ${fechaLarga(asOf)}` : " · fecha efectiva no disponible"}
          </span>
        )}
      </div>
    </div>
  );
};

export default OpsScopeBar;
