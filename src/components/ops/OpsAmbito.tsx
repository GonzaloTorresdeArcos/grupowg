/**
 * Indicadores discretos de ámbito conceptual (F1):
 *  - AmbitoChip: distingue dimensión de Producto (gama/familia/marca) de la
 *    dimensión de Organización (unidad/base/equipo/persona).
 *  - BreadcrumbConceptual: WG → Unidad → Base → Equipo → Persona en las fichas
 *    y drill-downs organizativos.
 *
 * Deliberadamente sobrios: texto pequeño, sin color, sin iconografía extra.
 */
import { DESC_AMBITO, JERARQUIA_ORGANIZACION, LABEL_AMBITO, type Ambito, type NivelOrganizacion } from "@/lib/ops-modelo";

export const AmbitoChip = ({ ambito, className = "" }: { ambito: Ambito; className?: string }) => (
  <span
    title={DESC_AMBITO[ambito]}
    className={`inline-flex items-center rounded-full border border-black/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ink/45 whitespace-nowrap ${className}`}
  >
    {LABEL_AMBITO[ambito]}
  </span>
);

export type PasoConceptual = { nivel: NivelOrganizacion; valor: string | null };

/**
 * Recibe los valores conocidos de cada nivel. Los niveles sin valor se muestran
 * atenuados para que el usuario sepa siempre en qué punto de la jerarquía está.
 */
export const BreadcrumbConceptual = ({ pasos }: { pasos: readonly PasoConceptual[] }) => {
  const mapa = new Map(pasos.map((p) => [p.nivel, p.valor]));
  return (
    <nav aria-label="Jerarquía organizativa" className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink/40">
      {JERARQUIA_ORGANIZACION.map((nivel, i) => {
        const valor = mapa.get(nivel) ?? null;
        return (
          <span key={nivel} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>›</span>}
            <span className={valor ? "text-ink/70" : "text-ink/25"} title={nivel}>
              {valor ?? nivel}
            </span>
          </span>
        );
      })}
    </nav>
  );
};
