import { useMemo, useState } from "react";
import { ChevronDown, Check, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GAMAS,
  familiaCodesOfGama,
  type GamaDef,
  type FamiliaItem,
} from "@/lib/gamas-taxonomy";

interface GamasSelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export const GamasSelector = ({ value, onChange }: GamasSelectorProps) => {
  const [openGama, setOpenGama] = useState<string | null>(GAMAS[0]?.code ?? null);
  const valueSet = useMemo(() => new Set(value), [value]);

  const toggleFamilia = (code: string) => {
    const next = new Set(valueSet);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(Array.from(next));
  };

  const countSelectedInGama = (g: GamaDef) => {
    const codes = familiaCodesOfGama(g.code);
    return codes.filter((c) => valueSet.has(c)).length;
  };

  const totalInGama = (g: GamaDef) => familiaCodesOfGama(g.code).length;

  const toggleAllGama = (g: GamaDef) => {
    const codes = familiaCodesOfGama(g.code);
    const allSelected = codes.every((c) => valueSet.has(c));
    const next = new Set(valueSet);
    if (allSelected) {
      codes.forEach((c) => next.delete(c));
    } else {
      codes.forEach((c) => next.add(c));
    }
    onChange(Array.from(next));
  };

  const totalSelected = value.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          {totalSelected === 0
            ? "Selecciona las familias que atiendes en cada gama"
            : `${totalSelected} ${totalSelected === 1 ? "familia seleccionada" : "familias seleccionadas"}`}
        </span>
        {totalSelected > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs underline-offset-2 hover:underline text-ink-soft"
          >
            Limpiar todo
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {GAMAS.map((g) => {
          const open = openGama === g.code;
          const selected = countSelectedInGama(g);
          const total = totalInGama(g);
          const allSelected = selected === total && total > 0;

          return (
            <div key={g.code}>
              {/* Header gama */}
              <button
                type="button"
                onClick={() => setOpenGama(open ? null : g.code)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  open ? "bg-secondary/60" : "hover:bg-secondary/40",
                )}
                aria-expanded={open}
              >
                <span className="font-display text-base text-ink flex-1">
                  {g.label}
                </span>
                {selected > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      allSelected
                        ? "bg-ink text-bone"
                        : "bg-teal/15 text-teal-deep",
                    )}
                  >
                    {selected}/{total}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-ink-soft transition-transform shrink-0",
                    open && "rotate-180",
                  )}
                />
              </button>

              {/* Contenido */}
              {open && (
                <div className="px-4 pt-2 pb-4 space-y-4 bg-background/40 animate-fade-up">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => toggleAllGama(g)}
                      className="text-xs text-teal-deep hover:underline underline-offset-2"
                    >
                      {allSelected ? "Deseleccionar toda la gama" : "Seleccionar toda la gama"}
                    </button>
                  </div>

                  {g.items && (
                    <FamiliasGrid
                      items={g.items}
                      valueSet={valueSet}
                      onToggle={toggleFamilia}
                    />
                  )}

                  {g.subgrupos?.map((s) => (
                    <div key={s.label} className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                        {s.label}
                      </p>
                      <FamiliasGrid
                        items={s.items}
                        valueSet={valueSet}
                        onToggle={toggleFamilia}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FamiliasGrid = ({
  items,
  valueSet,
  onToggle,
}: {
  items: FamiliaItem[];
  valueSet: Set<string>;
  onToggle: (code: string) => void;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {items.map((it) => {
      const on = valueSet.has(it.code);
      return (
        <button
          key={it.code}
          type="button"
          onClick={() => onToggle(it.code)}
          className={cn(
            "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm text-left transition-all",
            on
              ? "border-ink bg-ink text-bone"
              : "border-border bg-card text-ink hover:border-ink/40",
          )}
          aria-pressed={on}
        >
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded border shrink-0 transition-colors",
              on ? "bg-bone border-bone" : "border-ink/30 bg-transparent",
            )}
          >
            {on && <Check className="h-3 w-3 text-ink" strokeWidth={3} />}
          </span>
          <span className="leading-tight">{it.label}</span>
        </button>
      );
    })}
  </div>
);
