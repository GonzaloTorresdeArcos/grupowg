import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type Pais = "ES" | "PT";
type CoordData = { munis: string[]; cps: Record<string, [number, number, number]> };

const cache: Partial<Record<Pais, CoordData>> = {};
const R2 = Math.PI / 180;
function distKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const la = ((aLat + bLat) / 2) * R2;
  const x = (bLng - aLng) * R2 * Math.cos(la);
  const y = (bLat - aLat) * R2;
  return 6371 * Math.hypot(x, y);
}

export const CoberturaRadio = () => {
  const [pais, setPais] = useState<Pais>("ES");
  const [cp, setCp] = useState("");
  const [radio, setRadio] = useState(25);
  const [data, setData] = useState<CoordData | null>(cache.ES ?? null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (cache[pais]) { setData(cache[pais]!); return; }
    setLoading(true);
    fetch(`/cp-coords-${pais.toLowerCase()}.json`)
      .then((r) => r.json())
      .then((d: CoordData) => { if (!cancelled) { cache[pais] = d; setData(d); } })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pais]);

  const cpKey = pais === "ES" ? cp : cp.slice(0, 4);
  const cpValid = pais === "ES" ? /^\d{5}$/.test(cp) : /^\d{4}/.test(cp);
  const center = data && cpValid ? data.cps[cpKey] : undefined;

  const result = useMemo(() => {
    if (!data || !center) return null;
    const [clat, clng] = center;
    const covered: { cp: string; lat: number; lng: number; mi: number; d: number }[] = [];
    for (const key in data.cps) {
      const [lat, lng, mi] = data.cps[key];
      const d = distKm(clat, clng, lat, lng);
      if (d <= radio) covered.push({ cp: key, lat, lng, mi, d });
    }
    covered.sort((a, b) => a.d - b.d);
    const byMuni = new Map<number, { cp: string; d: number }[]>();
    for (const c of covered) {
      if (!byMuni.has(c.mi)) byMuni.set(c.mi, []);
      byMuni.get(c.mi)!.push({ cp: c.cp, d: c.d });
    }
    const munis = [...byMuni.entries()]
      .map(([mi, cps]) => ({ name: data.munis[mi] || "—", cps, minD: Math.min(...cps.map((x) => x.d)) }))
      .sort((a, b) => a.minD - b.minD);
    return { covered, munis, clat, clng };
  }, [data, center, radio]);

  const copyList = () => {
    if (!result) return;
    navigator.clipboard?.writeText(result.covered.map((c) => c.cp).join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const VB = 320, C = VB / 2, RPX = 132;
  const scale = RPX / radio;
  const project = (lat: number, lng: number, clat: number, clng: number): [number, number] => {
    const dx = (lng - clng) * 111 * Math.cos(clat * R2);
    const dy = (lat - clat) * 111;
    return [C + dx * scale, C - dy * scale];
  };

  return (
    <section id="cobertura" className="scroll-mt-24 py-20 md:py-28 bg-card">
      <div className="container-tight">
        <div className="max-w-3xl mb-10">
          <p className="eyebrow mb-3">Cobertura</p>
          <h2 className="heading-display text-ink text-4xl md:text-5xl text-balance">
            Define tu radio de acción
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Pon tu código postal y hasta cuántos kilómetros te mueves. Calculamos al momento todos los
            códigos postales y municipios que cubres — esta es la lista que irá en tu contrato.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 rounded-3xl bg-background border border-border p-6 md:p-8 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              {(["ES", "PT"] as Pais[]).map((p) => (
                <button key={p} type="button" onClick={() => { setPais(p); setCp(""); }}
                  className={cn("rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                    pais === p ? "bg-ink text-background border-ink" : "bg-background text-ink border-border hover:border-ink")}>
                  {p === "ES" ? "🇪🇸 España" : "🇵🇹 Portugal"}
                </button>
              ))}
            </div>
            <label className="mt-6 block text-sm font-medium text-ink">Tu código postal</label>
            <input type="text" inputMode="numeric" maxLength={pais === "ES" ? 5 : 8} value={cp}
              onChange={(e) => setCp(pais === "ES" ? e.target.value.replace(/\D/g, "") : e.target.value.replace(/[^\d-]/g, ""))}
              placeholder={pais === "ES" ? "28009" : "1000-001"}
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal" />
            <div className="mt-6 flex justify-between items-baseline">
              <label className="text-sm font-medium text-ink">Radio de acción</label>
              <span className="font-display text-lg text-ink">{radio} km</span>
            </div>
            <Slider className="mt-3" min={5} max={50} step={1} value={[radio]} onValueChange={([v]) => setRadio(v)} />
            <p className="mt-1 text-xs text-muted-foreground">En línea recta desde tu CP, en todas las direcciones.</p>

            {loading && (
              <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando mapa de códigos postales…
              </p>
            )}
            {!loading && cpValid && !center && (
              <p className="mt-6 text-sm text-muted-foreground">No encontramos ese código postal. Revisa el número.</p>
            )}
            {result && (
              <div className="mt-6 rounded-2xl bg-ink text-background p-5">
                <p className="text-sm text-teal-soft">Cubres</p>
                <p className="font-display text-4xl mt-1">{result.covered.length} <span className="text-lg text-background/60">CP</span></p>
                <p className="text-sm text-background/70 mt-1">en {result.munis.length} municipios · radio {radio} km</p>
                <button type="button" onClick={copyList}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal px-4 py-2 text-sm font-medium text-ink hover:gap-3 transition-all">
                  {copied ? <><Check className="h-4 w-4" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar lista de CP</>}
                </button>
                <p className="mt-3 text-xs text-background/50">El nº de avisos se calculará sobre la demanda real de WG en estos CP.</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 rounded-3xl bg-background border border-border p-6 md:p-8">
            {!result ? (
              <div className="h-full min-h-[320px] flex items-center justify-center text-center text-muted-foreground">
                <p className="max-w-xs">Introduce tu código postal y ajusta el radio para ver tu zona de cobertura.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full rounded-2xl bg-muted/40">
                    <circle cx={C} cy={C} r={RPX} fill="hsl(var(--teal) / 0.08)" stroke="hsl(var(--teal) / 0.5)" strokeDasharray="4 4" />
                    {result.covered.map((c) => {
                      const [x, y] = project(c.lat, c.lng, result.clat, result.clng);
                      return <circle key={c.cp} cx={x} cy={y} r={1.7} fill="hsl(var(--teal))" opacity={0.7} />;
                    })}
                    <circle cx={C} cy={C} r={5} fill="hsl(var(--ink))" />
                    <circle cx={C} cy={C} r={5} fill="none" stroke="white" strokeWidth={1.5} />
                  </svg>
                  <p className="mt-2 text-center text-xs text-muted-foreground">Radio {radio} km (línea recta) · cada punto es un CP cubierto</p>
                </div>
                <div className="max-h-[360px] overflow-y-auto pr-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                    {result.munis.length} municipios cubiertos
                  </p>
                  <ul className="space-y-1">
                    {result.munis.map((m) => (
                      <li key={m.name} className="flex items-center justify-between gap-2 text-sm border-b border-border/60 py-1.5">
                        <span className="text-ink truncate">{m.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{m.cps.length} CP</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
