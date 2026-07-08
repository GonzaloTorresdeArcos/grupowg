import { useEffect, useMemo, useState } from "react";
import { MapPin, Copy, CheckCircle2, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";

type Coords = { munis: string[]; cps: Record<string, [number, number, number]> };

export const CoverageRadius = ({
  cp,
  radioKm,
  onRadioChange,
  onCoverageChange,
}: {
  cp: string;
  radioKm: number;
  onRadioChange: (km: number) => void;
  onCoverageChange: (cps: string[], munis: string[]) => void;
}) => {
  const pais: "ES" | "PT" = /^\d{5}$/.test(cp) ? "ES" : "PT";
  const cpValid = pais === "ES" ? /^\d{5}$/.test(cp) : /^\d{4}(-\d{3})?$/.test(cp);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [copied, setCopied] = useState(false);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCoords(null);
    fetch(`/cp-coords-${pais.toLowerCase()}.json`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setCoords(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pais]);

  const cobertura = useMemo(() => {
    if (!coords || !cpValid) return null;
    const key = pais === "ES" ? cp : cp.slice(0, 4);
    const center = coords.cps[key];
    if (!center) return null;
    const R = Math.PI / 180;
    const dkm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
      const la = ((aLat + bLat) / 2) * R;
      return 6371 * Math.hypot((bLng - aLng) * R * Math.cos(la), (bLat - aLat) * R);
    };
    const covered: string[] = [];
    const munis = new Set<number>();
    for (const k in coords.cps) {
      const v = coords.cps[k];
      if (dkm(center[0], center[1], v[0], v[1]) <= radioKm) { covered.push(k); munis.add(v[2]); }
    }
    const muniNames = [...munis].map((i) => coords.munis[i]).filter(Boolean).sort((a, b) => a.localeCompare(b));
    return { covered: covered.sort(), muniNames };
  }, [coords, cpValid, cp, pais, radioKm]);

  useEffect(() => {
    if (cobertura) onCoverageChange(cobertura.covered, cobertura.muniNames);
    else onCoverageChange([], []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cobertura]);

  if (!cpValid) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground flex items-center gap-2">
        <MapPin className="h-4 w-4 text-teal-deep shrink-0" />
        Introduce tu código postal en el paso anterior para calcular tu zona de cobertura.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm text-ink">
        <MapPin className="h-4 w-4 text-teal-deep" /> Centro: <span className="font-semibold">{cp}</span>
      </div>
      <div>
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground">Radio de acción</span>
          <span className="font-display text-base text-ink">{radioKm} km</span>
        </div>
        <Slider className="mt-2" min={5} max={50} step={1} value={[radioKm]} onValueChange={([v]) => onRadioChange(v)} />
      </div>

      {!coords && <p className="text-xs text-muted-foreground">Calculando cobertura…</p>}

      {cobertura && (
        <div className="rounded-xl border border-teal/30 bg-teal/5 p-4">
          <p className="text-sm text-ink">
            Cubres <span className="font-semibold">{cobertura.covered.length} códigos postales</span> en{" "}
            <span className="font-semibold">{cobertura.muniNames.length} municipios</span> a {radioKm} km.
          </p>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <button type="button"
              onClick={() => { navigator.clipboard?.writeText(cobertura.covered.join(", ")); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-deep hover:underline">
              {copied ? <><CheckCircle2 className="h-3.5 w-3.5" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar lista de CP</>}
            </button>
            <button type="button" onClick={() => setShowList((v) => !v)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink">
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showList ? "rotate-180" : ""}`} /> {showList ? "Ocultar" : "Ver"} lista
            </button>
          </div>
          {showList && (
            <>
              <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">Códigos postales incluidos</p>
              <p className="mt-1 text-xs font-mono text-ink-soft leading-relaxed max-h-40 overflow-y-auto">{cobertura.covered.join(" · ")}</p>
              <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">Municipios</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-h-32 overflow-y-auto">{cobertura.muniNames.join(" · ")}</p>
            </>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">Esta relación de códigos postales quedará adjunta a tu solicitud y al acuerdo.</p>
        </div>
      )}
      {coords && cpValid && !cobertura && (
        <p className="text-xs text-muted-foreground">No encontramos ese código postal. Revísalo en el paso 1.</p>
      )}
    </div>
  );
};
