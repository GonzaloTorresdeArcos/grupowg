import { useMemo, useState } from "react";
import {
  MARCAS_BY_GAMA,
  SAT_RELACIONES,
  marcaCode,
  type MarcaDetalle,
  type SatRelacion,
} from "@/lib/marcas-taxonomy";
import { Check, Search, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarcasSelectorProps {
  /** Códigos de gamas activas (derivados de las familias seleccionadas). */
  gamasActivas: string[];
  value: MarcaDetalle[];
  onChange: (next: MarcaDetalle[]) => void;
  otrasMarcas: string;
  onOtrasChange: (s: string) => void;
}

const RELACION_STYLES: Record<SatRelacion, string> = {
  oficial: "bg-emerald-100 text-emerald-900 border-emerald-300",
  autorizado: "bg-sky-100 text-sky-900 border-sky-300",
  multimarca: "bg-muted text-ink border-border",
};

export function MarcasSelector({
  gamasActivas,
  value,
  onChange,
  otrasMarcas,
  onOtrasChange,
}: MarcasSelectorProps) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const gamasVisibles = useMemo(() => {
    if (showAll || gamasActivas.length === 0) return MARCAS_BY_GAMA;
    return MARCAS_BY_GAMA.filter((g) => gamasActivas.includes(g.gama));
  }, [gamasActivas, showAll]);

  const [activeGama, setActiveGama] = useState<string>(
    () => gamasVisibles[0]?.gama ?? MARCAS_BY_GAMA[0].gama,
  );

  // Mantener tab activo válido
  const effectiveActive = gamasVisibles.find((g) => g.gama === activeGama)
    ? activeGama
    : gamasVisibles[0]?.gama ?? MARCAS_BY_GAMA[0].gama;

  const currentGama = MARCAS_BY_GAMA.find((g) => g.gama === effectiveActive)!;

  const codeMap = useMemo(() => {
    const m = new Map<string, MarcaDetalle>();
    value.forEach((d) => m.set(d.code, d));
    return m;
  }, [value]);

  const isSelected = (gama: string, label: string) =>
    codeMap.has(marcaCode(gama, label));

  const toggleMarca = (gama: string, label: string) => {
    const code = marcaCode(gama, label);
    if (codeMap.has(code)) {
      onChange(value.filter((d) => d.code !== code));
      return;
    }
    onChange([...value, { code, gama, label, relacion: "autorizado" }]);
  };

  const setRelacion = (code: string, relacion: SatRelacion) => {
    onChange(value.map((d) => (d.code === code ? { ...d, relacion } : d)));
  };

  const filteredMarcas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return currentGama.marcas;
    return currentGama.marcas.filter((m) => m.toLowerCase().includes(q));
  }, [currentGama, query]);

  // Contador por gama
  const countByGama = useMemo(() => {
    const m = new Map<string, number>();
    value.forEach((d) => m.set(d.gama, (m.get(d.gama) ?? 0) + 1));
    return m;
  }, [value]);

  // Agrupar selección para resumen
  const groupedSelection = useMemo(() => {
    const groups = new Map<string, MarcaDetalle[]>();
    value.forEach((d) => {
      if (!groups.has(d.gama)) groups.set(d.gama, []);
      groups.get(d.gama)!.push(d);
    });
    return groups;
  }, [value]);

  return (
    <div className="space-y-4">
      {gamasActivas.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            Mostrando marcas de las gamas que has seleccionado en familias.
          </p>
          <button
            type="button"
            className="text-xs underline text-teal-deep hover:text-teal-900"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Ver solo mis gamas" : "Ver todas las gamas"}
          </button>
        </div>
      )}

      {/* Tabs por gama */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {gamasVisibles.map((g) => {
          const n = countByGama.get(g.gama) ?? 0;
          const active = g.gama === effectiveActive;
          return (
            <button
              key={g.gama}
              type="button"
              onClick={() => setActiveGama(g.gama)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm border transition flex items-center gap-1.5",
                active
                  ? "bg-teal-deep text-white border-teal-deep"
                  : "bg-card text-ink border-border hover:border-teal-deep/50",
              )}
            >
              <span>{g.label}</span>
              {n > 0 && (
                <span
                  className={cn(
                    "text-xs rounded-full px-1.5 py-0.5",
                    active ? "bg-white/20" : "bg-teal-deep/10 text-teal-deep",
                  )}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className="input-base pl-10 w-full"
          placeholder={`Buscar marca en ${currentGama.label}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Grid de marcas de la gama activa */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filteredMarcas.map((label) => {
          const sel = isSelected(currentGama.gama, label);
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggleMarca(currentGama.gama, label)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition",
                sel
                  ? "border-teal-deep bg-teal-deep text-white"
                  : "border-border bg-card hover:border-teal-deep/50",
              )}
            >
              <span className="font-medium">{label}</span>
              {sel && <Check className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
        {filteredMarcas.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">
            Sin resultados en esta gama.
          </p>
        )}
      </div>

      {/* Resumen + relación SAT */}
      {value.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="font-display text-lg text-ink flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-deep" />
            Relación SAT por marca ({value.length})
          </h4>

          {Array.from(groupedSelection.entries()).map(([gamaCode, items]) => {
            const gama = MARCAS_BY_GAMA.find((g) => g.gama === gamaCode);
            return (
              <div key={gamaCode} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <p className="text-sm font-medium text-ink">
                  {gama?.label ?? gamaCode}
                </p>
                <div className="space-y-2">
                  {items.map((d) => (
                    <div
                      key={d.code}
                      className="flex items-center justify-between flex-wrap gap-2 border-t border-border pt-2 first:border-t-0 first:pt-0"
                    >
                      <span className="font-medium text-ink">{d.label}</span>
                      <div className="flex items-center gap-1.5">
                        {SAT_RELACIONES.map((r) => (
                          <button
                            key={r.code}
                            type="button"
                            onClick={() => setRelacion(d.code, r.code)}
                            title={r.hint}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-full border transition",
                              d.relacion === r.code
                                ? RELACION_STYLES[r.code] +
                                    " ring-2 ring-offset-1 ring-teal-deep/40"
                                : "border-border bg-background text-muted-foreground hover:border-teal-deep/40",
                            )}
                          >
                            {r.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => onChange(value.filter((x) => x.code !== d.code))}
                          className="text-muted-foreground hover:text-red-600 p-1"
                          aria-label={`Quitar ${d.label}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Otras marcas libres */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1">
          Otras marcas (no listadas)
        </label>
        <textarea
          className="input-base min-h-20 w-full"
          placeholder="Marcas locales, OEM o trabajos puntuales separados por coma"
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
