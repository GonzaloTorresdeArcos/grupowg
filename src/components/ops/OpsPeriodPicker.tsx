import { useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OpsPeriod = { from: string; to: string };

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MESES_LARGO = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const pad = (n: number) => String(n).padStart(2, "0");
const firstOfMonth = (y: number, m: number) => `${y}-${pad(m + 1)}-01`;
const lastOfMonth = (y: number, m: number) => {
  const d = new Date(Date.UTC(y, m + 1, 0));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
const parseYM = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return { y, m: m - 1 };
};
const monthsBetween = (from: string, to: string) => {
  const a = parseYM(from), b = parseYM(to);
  return (b.y - a.y) * 12 + (b.m - a.m) + 1;
};
const shiftMonth = (y: number, m: number, delta: number) => {
  const d = new Date(Date.UTC(y, m + delta, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const now = () => {
  const d = new Date();
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
};

const HIST_START = { y: 2025, m: 0 };

const isFullMonth = (from: string, to: string) => {
  const a = parseYM(from), b = parseYM(to);
  return a.y === b.y && a.m === b.m && from === firstOfMonth(a.y, a.m) && to === lastOfMonth(b.y, b.m);
};
const isFullQuarter = (from: string, to: string) => {
  const a = parseYM(from), b = parseYM(to);
  return a.y === b.y && a.m % 3 === 0 && b.m === a.m + 2 && from === firstOfMonth(a.y, a.m) && to === lastOfMonth(b.y, b.m);
};
const isFullYear = (from: string, to: string) => {
  const a = parseYM(from), b = parseYM(to);
  return a.y === b.y && a.m === 0 && b.m === 11 && from === firstOfMonth(a.y, 0) && to === lastOfMonth(a.y, 11);
};

const labelFor = (from: string, to: string): string => {
  if (isFullMonth(from, to)) {
    const { y, m } = parseYM(from);
    return `${MESES_LARGO[m]} ${y}`;
  }
  if (isFullQuarter(from, to)) {
    const { y, m } = parseYM(from);
    return `T${Math.floor(m / 3) + 1} ${y}`;
  }
  if (isFullYear(from, to)) return `${parseYM(from).y}`;
  const a = parseYM(from), b = parseYM(to);
  if (a.y === b.y) {
    if (a.m === 0) return `YTD ${a.y} · ene–${MESES[b.m].toLowerCase()}`;
    return `${MESES[a.m]} – ${MESES[b.m]} ${a.y}`;
  }
  if (monthsBetween(from, to) === 12) return `Últimos 12 meses`;
  return `${MESES[a.m]} ${a.y} – ${MESES[b.m]} ${b.y}`;
};

const isFutureMonth = (y: number, m: number) => {
  const n = now();
  return y > n.y || (y === n.y && m > n.m);
};

type PresetItem = { key: PresetKey; label: string; hint?: string; disabled?: boolean };
const PRESET_ITEMS: PresetItem[] = [
  { key: "mes", label: "Mes", hint: "Mes natural" },
  { key: "trimestre", label: "Trimestre", hint: "Trimestre natural" },
  { key: "ytd", label: "YTD", hint: "1-ene → último día con datos" },
  { key: "doce_meses", label: "12 meses", hint: "Últimos 12 meses completos" },
  { key: "historico", label: "Histórico", hint: "Toda la cobertura de datos" },
  { key: "rango", label: "Rango personalizado", hint: "Elige meses a la derecha" },
];

type Props = {
  value: OpsPeriod;
  onChange: (v: OpsPeriod) => void;
  className?: string;
  /** Cobertura real de datos, para YTD e Histórico. */
  cobertura?: Cobertura;
  /** Preset activo detectado (resaltado). */
  preset?: PresetKey;
  /** Aplica un preset global (no toca el resto de filtros). */
  onPreset?: (key: PresetKey) => void;
};


export const OpsPeriodPicker = ({ value, onChange, className }: Props) => {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState<number>(() => parseYM(value.from).y);
  const [pendingStart, setPendingStart] = useState<{ y: number; m: number } | null>(null);
  const [pendingEnd, setPendingEnd] = useState<{ y: number; m: number } | null>(null);

  const label = useMemo(() => labelFor(value.from, value.to), [value]);
  const length = useMemo(() => monthsBetween(value.from, value.to), [value]);

  const nextDisabled = useMemo(() => {
    const b = parseYM(value.to);
    const nextStart = shiftMonth(b.y, b.m, 1);
    return isFutureMonth(nextStart.y, nextStart.m);
  }, [value]);

  const shiftBy = (delta: number) => {
    const a = parseYM(value.from), b = parseYM(value.to);
    const newA = shiftMonth(a.y, a.m, delta * length);
    const newB = shiftMonth(b.y, b.m, delta * length);
    onChange({ from: firstOfMonth(newA.y, newA.m), to: lastOfMonth(newB.y, newB.m) });
  };

  const openPopover = (o: boolean) => {
    setOpen(o);
    if (o) {
      setYear(parseYM(value.from).y);
      setPendingStart(null);
      setPendingEnd(null);
    }
  };

  const applyPreset = (p: Preset) => {
    onChange(p.get());
    setOpen(false);
  };

  const clickMonth = (m: number) => {
    if (isFutureMonth(year, m)) return;
    const cell = { y: year, m };
    if (!pendingStart || (pendingStart && pendingEnd)) {
      setPendingStart(cell);
      setPendingEnd(null);
      return;
    }
    // second click
    let a = pendingStart, b = cell;
    if (b.y < a.y || (b.y === a.y && b.m < a.m)) [a, b] = [b, a];
    setPendingStart(a);
    setPendingEnd(b);
  };

  const inPending = (m: number) => {
    if (!pendingStart) return false;
    const cell = { y: year, m };
    const a = pendingStart;
    const b = pendingEnd ?? pendingStart;
    const cellIdx = cell.y * 12 + cell.m;
    const aIdx = a.y * 12 + a.m;
    const bIdx = b.y * 12 + b.m;
    return cellIdx >= Math.min(aIdx, bIdx) && cellIdx <= Math.max(aIdx, bIdx);
  };

  const applyCustom = () => {
    if (!pendingStart) return;
    const a = pendingStart;
    const b = pendingEnd ?? pendingStart;
    onChange({ from: firstOfMonth(a.y, a.m), to: lastOfMonth(b.y, b.m) });
    setOpen(false);
  };

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={() => shiftBy(-1)}
        className="h-8 w-8 flex items-center justify-center rounded-md border border-black/[0.08] bg-white text-ink/60 hover:text-ink hover:border-ink/40"
        aria-label="Período anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <Popover open={open} onOpenChange={openPopover}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-8 px-3 min-w-[170px] rounded-md border border-black/[0.08] bg-white text-[13px] text-ink flex items-center gap-2 hover:border-ink/40"
          >
            <Calendar className="h-3.5 w-3.5 text-ink/50" />
            <span className="font-medium">{cap(label)}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0 w-[520px]">
          <div className="grid grid-cols-[180px_1fr] divide-x divide-black/[0.06]">
            <div className="p-2 flex flex-col gap-0.5">
              {presets().map((p) => {
                const cur = p.get();
                const active = cur.from === value.from && cur.to === value.to;
                return (
                  <button
                    key={p.key}
                    onClick={() => applyPreset(p)}
                    className={cn(
                      "text-left px-2.5 py-1.5 text-[13px] rounded-md hover:bg-ink/[0.04]",
                      active && "bg-ink/[0.06] text-ink font-medium",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setYear((y) => y - 1)}
                  className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-ink/[0.05] text-ink/60"
                  aria-label="Año anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium text-ink tabular-nums">{year}</span>
                <button
                  type="button"
                  onClick={() => setYear((y) => y + 1)}
                  disabled={year >= now().y}
                  className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-ink/[0.05] text-ink/60 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Año siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MESES.map((m, idx) => {
                  const disabled = isFutureMonth(year, idx);
                  const selected = inPending(idx);
                  const isEdge =
                    pendingStart &&
                    ((pendingStart.y === year && pendingStart.m === idx) ||
                      (pendingEnd && pendingEnd.y === year && pendingEnd.m === idx));
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={disabled}
                      onClick={() => clickMonth(idx)}
                      className={cn(
                        "h-9 rounded-md text-[13px] border transition",
                        disabled && "opacity-30 cursor-not-allowed border-transparent",
                        !disabled && !selected && "border-black/[0.06] hover:border-ink/40",
                        selected && !isEdge && "bg-ink/10 border-ink/10 text-ink",
                        isEdge && "bg-ink text-white border-ink",
                      )}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/[0.05]">
                <span className="text-[11px] text-ink/50">
                  {pendingStart
                    ? pendingEnd
                      ? `${MESES[pendingStart.m]} ${pendingStart.y} – ${MESES[pendingEnd.m]} ${pendingEnd.y}`
                      : `Desde ${MESES[pendingStart.m]} ${pendingStart.y} · elige fin`
                    : "Selecciona el mes de inicio"}
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button size="sm" onClick={applyCustom} disabled={!pendingStart}>Aplicar</Button>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={() => shiftBy(1)}
        disabled={nextDisabled}
        className="h-8 w-8 flex items-center justify-center rounded-md border border-black/[0.08] bg-white text-ink/60 hover:text-ink hover:border-ink/40 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-black/[0.08]"
        aria-label="Período siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};
