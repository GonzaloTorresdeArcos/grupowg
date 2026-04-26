import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const HORAS = Array.from({ length: 25 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

type SabadoModo = "no" | "manana" | "manana_tarde";
type UrgenciaModo = "no" | "menos_24h" | "mismo_dia";

interface Estado {
  lvDesde: string;
  lvHasta: string;
  sabadoModo: SabadoModo;
  sabMananaDesde: string;
  sabMananaHasta: string;
  sabTardeDesde: string;
  sabTardeHasta: string;
  urgencia: UrgenciaModo;
}

const DEFAULT: Estado = {
  lvDesde: "09:00",
  lvHasta: "18:00",
  sabadoModo: "no",
  sabMananaDesde: "09:00",
  sabMananaHasta: "14:00",
  sabTardeDesde: "16:00",
  sabTardeHasta: "20:00",
  urgencia: "no",
};

export function buildHorariosString(s: Estado): string {
  const parts: string[] = [];
  if (s.lvDesde && s.lvHasta) parts.push(`L-V ${s.lvDesde}-${s.lvHasta}`);
  if (s.sabadoModo === "manana") parts.push(`Sáb ${s.sabMananaDesde}-${s.sabMananaHasta}`);
  if (s.sabadoModo === "manana_tarde") {
    parts.push(`Sáb ${s.sabMananaDesde}-${s.sabMananaHasta} y ${s.sabTardeDesde}-${s.sabTardeHasta}`);
  }
  const urg =
    s.urgencia === "menos_24h" ? "Urgencias <24h" :
    s.urgencia === "mismo_dia" ? "Urgencias mismo día" : "";
  if (urg) parts.push(urg);
  return parts.join(" | ");
}

function parse(v: string): Estado {
  if (!v) return DEFAULT;
  const out: Estado = { ...DEFAULT };
  const lv = v.match(/L-V\s+(\d{2}:\d{2})-(\d{2}:\d{2})/);
  if (lv) { out.lvDesde = lv[1]; out.lvHasta = lv[2]; }
  const sabMT = v.match(/Sáb\s+(\d{2}:\d{2})-(\d{2}:\d{2})\s+y\s+(\d{2}:\d{2})-(\d{2}:\d{2})/);
  const sabM = !sabMT && v.match(/Sáb\s+(\d{2}:\d{2})-(\d{2}:\d{2})/);
  if (sabMT) {
    out.sabadoModo = "manana_tarde";
    out.sabMananaDesde = sabMT[1]; out.sabMananaHasta = sabMT[2];
    out.sabTardeDesde = sabMT[3]; out.sabTardeHasta = sabMT[4];
  } else if (sabM) {
    out.sabadoModo = "manana";
    out.sabMananaDesde = sabM[1]; out.sabMananaHasta = sabM[2];
  }
  if (/Urgencias\s+<24h/.test(v)) out.urgencia = "menos_24h";
  else if (/Urgencias\s+mismo d[íi]a/.test(v)) out.urgencia = "mismo_dia";
  return out;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
}

function HoraSelect({ value, onChange, min }: { value: string; onChange: (v: string) => void; min?: string }) {
  const opts = min ? HORAS.filter((h) => h > min) : HORAS;
  return (
    <select className="input-base" value={value} onChange={(e) => onChange(e.target.value)}>
      {opts.map((h) => <option key={h} value={h}>{h}</option>)}
    </select>
  );
}

function RadioGroup<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "px-3 py-1.5 rounded-full border text-sm font-medium transition",
            value === o.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border hover:bg-secondary"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function HorariosSelector({ value, onChange }: Props) {
  const initial = useMemo(() => parse(value), []);
  const [s, setS] = useState<Estado>(initial);

  useEffect(() => {
    onChange(buildHorariosString(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  const upd = <K extends keyof Estado>(k: K, v: Estado[K]) => setS((p) => ({ ...p, [k]: v }));
  const resumen = buildHorariosString(s);

  return (
    <div className="space-y-5">
      {/* L-V */}
      <div>
        <div className="text-sm font-medium text-ink mb-2">Lunes a Viernes</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Inicio</div>
            <HoraSelect value={s.lvDesde} onChange={(v) => upd("lvDesde", v)} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Fin</div>
            <HoraSelect value={s.lvHasta} onChange={(v) => upd("lvHasta", v)} min={s.lvDesde} />
          </div>
        </div>
      </div>

      {/* Sábados */}
      <div>
        <div className="text-sm font-medium text-ink mb-2">Sábados</div>
        <RadioGroup
          value={s.sabadoModo}
          onChange={(v) => upd("sabadoModo", v)}
          options={[
            { id: "no", label: "No" },
            { id: "manana", label: "Mañana" },
            { id: "manana_tarde", label: "Mañana y tarde" },
          ]}
        />
        {s.sabadoModo !== "no" && (
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Mañana — Inicio / Fin</div>
              <div className="grid grid-cols-2 gap-3">
                <HoraSelect value={s.sabMananaDesde} onChange={(v) => upd("sabMananaDesde", v)} />
                <HoraSelect value={s.sabMananaHasta} onChange={(v) => upd("sabMananaHasta", v)} min={s.sabMananaDesde} />
              </div>
            </div>
            {s.sabadoModo === "manana_tarde" && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Tarde — Inicio / Fin</div>
                <div className="grid grid-cols-2 gap-3">
                  <HoraSelect value={s.sabTardeDesde} onChange={(v) => upd("sabTardeDesde", v)} min={s.sabMananaHasta} />
                  <HoraSelect value={s.sabTardeHasta} onChange={(v) => upd("sabTardeHasta", v)} min={s.sabTardeDesde} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Urgencias */}
      <div>
        <div className="text-sm font-medium text-ink mb-2">Servicio urgente</div>
        <RadioGroup
          value={s.urgencia}
          onChange={(v) => upd("urgencia", v)}
          options={[
            { id: "no", label: "No" },
            { id: "menos_24h", label: "<24h" },
            { id: "mismo_dia", label: "Mismo día" },
          ]}
        />
      </div>

      {resumen && (
        <div className="text-xs text-muted-foreground rounded-lg bg-secondary px-3 py-2">
          Resumen: <span className="font-medium text-ink">{resumen}</span>
        </div>
      )}
    </div>
  );
}
