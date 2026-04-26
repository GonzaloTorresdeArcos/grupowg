import { useMemo, useState } from "react";
import {
  MARCAS,
  marcasForFamilias,
  matchingFamilias,
  SAT_RELACIONES,
  type MarcaDef,
  type MarcaDetalle,
  type SatRelacion,
} from "@/lib/marcas-taxonomy";
import { familiaLabelByCode } from "@/lib/gamas-taxonomy";
import { Check, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarcasSelectorProps {
  /** Códigos de familias seleccionados (gamas-taxonomy). */
  familias: string[];
  /** Detalles por marca (relación SAT + familias atendidas). */
  value: MarcaDetalle[];
  onChange: (next: MarcaDetalle[]) => void;
  /** Marcas libres añadidas a mano (texto). */
  otrasMarcas: string;
  onOtrasChange: (s: string) => void;
}

const RELACION_STYLES: Record<SatRelacion, string> = {
  oficial: "bg-emerald-100 text-emerald-900 border-emerald-300",
  autorizado: "bg-sky-100 text-sky-900 border-sky-300",
  multimarca: "bg-muted text-ink border-border",
};

export function MarcasSelector({
  familias,
  value,
  onChange,
  otrasMarcas,
  onOtrasChange,
}: MarcasSelectorProps) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filteredByFamilia = useMemo(() => marcasForFamilias(familias), [familias]);
  const baseList = showAll || familias.length === 0 ? MARCAS : filteredByFamilia;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseList;
    return baseList.filter((m) => m.label.toLowerCase().includes(q));
  }, [baseList, query]);

  const byCode = useMemo(() => {
    const map = new Map<string, MarcaDetalle>();
    value.forEach((d) => map.set(d.code, d));
    return map;
  }, [value]);

  const isSelected = (code: string) => byCode.has(code);

  const toggleMarca = (m: MarcaDef) => {
    if (isSelected(m.code)) {
      onChange(value.filter((d) => d.code !== m.code));
      return;
    }
    const familiasAtendidas = matchingFamilias(m, familias);
    onChange([
      ...value,
      {
        code: m.code,
        relacion: "autorizado",
        familias: familiasAtendidas.length ? familiasAtendidas : m.familias,
      },
    ]);
  };

  const setRelacion = (code: string, relacion: SatRelacion) => {
    onChange(value.map((d) => (d.code === code ? { ...d, relacion } : d)));
  };

  const toggleFamilia = (code: string, famCode: string) => {
    onChange(
      value.map((d) => {
        if (d.code !== code) return d;
        const has = d.familias.includes(famCode);
        return {
          ...d,
          familias: has
            ? d.familias.filter((f) => f !== famCode)
            : [...d.familias, famCode],
        };
      }),
    );
  };

  const filteredCount = filteredByFamilia.length;

  return (
    <div className="space-y-4">
      {/* Hint contexto */}
      {familias.length > 0 && (
        <div className="rounded-xl border border-border bg-secondary/50 p-3 text-sm text-ink flex items-start gap-2">
          <Sparkles className="h-4 w-4 mt-0.5 text-teal-deep shrink-0" />
          <span>
            Mostrando <strong>{filteredCount}</strong> marcas compatibles con las
            familias que has seleccionado.{" "}
            <button
              type="button"
              className="underline text-teal-deep hover:text-teal-900"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Ver solo compatibles" : "Ver catálogo completo"}
            </button>
          </span>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className="input-base pl-10 w-full"
          placeholder="Buscar marca…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Lista */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {list.map((m) => {
          const sel = isSelected(m.code);
          return (
            <button
              key={m.code}
              type="button"
              onClick={() => toggleMarca(m)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition",
                sel
                  ? "border-teal-deep bg-teal-deep text-white"
                  : "border-border bg-card hover:border-teal-deep/50",
              )}
            >
              <span className="font-medium">{m.label}</span>
              {sel && <Check className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
        {list.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">
            Sin resultados. Prueba con otra búsqueda o añade la marca abajo.
          </p>
        )}
      </div>

      {/* Detalle de marcas seleccionadas */}
      {value.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-display text-lg text-ink flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-deep" />
            Relación con cada marca ({value.length})
          </h4>

          <div className="space-y-3">
            {value.map((d) => {
              const m = MARCAS.find((x) => x.code === d.code);
              if (!m) return null;
              const familiasMarca = familias.length
                ? matchingFamilias(m, familias)
                : m.familias;

              return (
                <div
                  key={d.code}
                  className="rounded-xl border border-border bg-card p-3 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base text-ink">{m.label}</span>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full border",
                          RELACION_STYLES[d.relacion],
                        )}
                      >
                        {SAT_RELACIONES.find((r) => r.code === d.relacion)?.label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onChange(value.filter((x) => x.code !== d.code))}
                      className="text-muted-foreground hover:text-red-600 p-1"
                      aria-label={`Quitar ${m.label}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Selector de relación SAT */}
                  <div className="flex flex-wrap gap-2">
                    {SAT_RELACIONES.map((r) => (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => setRelacion(d.code, r.code)}
                        title={r.hint}
                        className={cn(
                          "text-xs px-3 py-1 rounded-full border transition",
                          d.relacion === r.code
                            ? RELACION_STYLES[r.code] + " ring-2 ring-offset-1 ring-teal-deep/40"
                            : "border-border bg-background text-muted-foreground hover:border-teal-deep/40",
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  {/* Familias atendidas para esta marca */}
                  {familiasMarca.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Familias que atiendes para esta marca:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {familiasMarca.map((fc) => {
                          const on = d.familias.includes(fc);
                          return (
                            <button
                              key={fc}
                              type="button"
                              onClick={() => toggleFamilia(d.code, fc)}
                              className={cn(
                                "text-xs px-2 py-1 rounded-md border transition",
                                on
                                  ? "border-teal-deep bg-teal-deep text-white"
                                  : "border-border bg-background hover:border-teal-deep/40",
                              )}
                            >
                              {familiaLabelByCode(fc)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Otras marcas libres */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1">
          Otras marcas (no listadas)
        </label>
        <textarea
          className="input-base min-h-20 w-full"
          placeholder="Ej. marcas locales, OEM o trabajos puntuales separados por coma"
          value={otrasMarcas}
          onChange={(e) => onOtrasChange(e.target.value)}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Texto libre — no cuenta como marca oficial para el matching.
        </p>
      </div>
    </div>
  );
}
