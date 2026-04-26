import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const DIAS = [
  { id: "L", label: "Lun" },
  { id: "M", label: "Mar" },
  { id: "X", label: "Mié" },
  { id: "J", label: "Jue" },
  { id: "V", label: "Vie" },
  { id: "S", label: "Sáb" },
  { id: "D", label: "Dom" },
];

const HORAS = Array.from({ length: 25 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

const PRESETS = [
  { id: "lv", label: "L-V 9:00-18:00", dias: ["L", "M", "X", "J", "V"], desde: "09:00", hasta: "18:00", urgencias: false },
  { id: "lvs", label: "L-S 9:00-14:00", dias: ["L", "M", "X", "J", "V", "S"], desde: "09:00", hasta: "14:00", urgencias: false },
  { id: "247", label: "24/7 urgencias", dias: ["L", "M", "X", "J", "V", "S", "D"], desde: "00:00", hasta: "24:00", urgencias: true },
];

export type HorariosValue = string; // string codificado

export function buildHorariosString(dias: string[], desde: string, hasta: string, urgencias: boolean): string {
  if (dias.length === 0 || !desde || !hasta) return "";
  const orden = ["L", "M", "X", "J", "V", "S", "D"];
  const ds = [...dias].sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
  const diasStr = ds.join("");
  const base = `${diasStr} ${desde}-${hasta}`;
  return urgencias ? `${base} | 24/7 urgencias` : base;
}

function parseHorariosString(v: string): { dias: string[]; desde: string; hasta: string; urgencias: boolean } {
  const def = { dias: [] as string[], desde: "09:00", hasta: "18:00", urgencias: false };
  if (!v) return def;
  const urgencias = /24\/7\s*urgencias/i.test(v);
  const main = v.split("|")[0].trim();
  const m = main.match(/^([LMXJVSD]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (!m) return { ...def, urgencias };
  return { dias: m[1].split(""), desde: m[2], hasta: m[3], urgencias };
}

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function HorariosSelector({ value, onChange }: Props) {
  const initial = useMemo(() => parseHorariosString(value), []);
  const [dias, setDias] = useState<string[]>(initial.dias);
  const [desde, setDesde] = useState(initial.desde);
  const [hasta, setHasta] = useState(initial.hasta);
  const [urgencias, setUrgencias] = useState(initial.urgencias);

  useEffect(() => {
    onChange(buildHorariosString(dias, desde, hasta, urgencias));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias, desde, hasta, urgencias]);

  const toggleDia = (id: string) => {
    setDias((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const applyPreset = (p: typeof PRESETS[number]) => {
    setDias(p.dias);
    setDesde(p.desde);
    setHasta(p.hasta);
    setUrgencias(p.urgencias);
  };

  const horasHasta = HORAS.filter((h) => h > desde);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p)}
            className="px-3 py-1.5 rounded-full border border-border bg-card text-sm hover:bg-secondary transition"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-2">Días laborables</div>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((d) => {
            const active = dias.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDia(d.id)}
                className={cn(
                  "w-12 h-10 rounded-lg border text-sm font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:bg-secondary"
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Desde</div>
          <select className="input-base" value={desde} onChange={(e) => setDesde(e.target.value)}>
            {HORAS.slice(0, -1).map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Hasta</div>
          <select className="input-base" value={hasta} onChange={(e) => setHasta(e.target.value)}>
            {horasHasta.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={urgencias}
          onChange={(e) => setUrgencias(e.target.checked)}
          className="h-4 w-4"
        />
        Disponibilidad 24/7 para urgencias
      </label>

      {value && (
        <div className="text-xs text-muted-foreground rounded-lg bg-secondary px-3 py-2">
          Resumen: <span className="font-medium text-ink">{value}</span>
        </div>
      )}
    </div>
  );
}
