import { useEffect, useMemo, useState } from "react";
import { Check, MapPin, Search } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { PROVINCIAS } from "@/lib/spain-provinces";
import { cn } from "@/lib/utils";

interface Props {
  selected: string[];
  onChange: (codes: string[]) => void;
}

const FitBounds = ({ codes }: { codes: string[] }) => {
  const map = useMap();
  useEffect(() => {
    if (codes.length === 0) {
      map.setView([40.0, -3.7], 5);
      return;
    }
    const points = PROVINCIAS.filter((p) => codes.includes(p.code)).map((p) => [p.lat, p.lng]) as [number, number][];
    if (points.length) {
      // @ts-expect-error - leaflet bounds typing
      map.fitBounds(points, { padding: [40, 40], maxZoom: 7 });
    }
  }, [codes, map]);
  return null;
};

export const CoverageMap = ({ selected, onChange }: Props) => {
  const [search, setSearch] = useState("");

  const toggle = (code: string) => {
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PROVINCIAS;
    return PROVINCIAS.filter((p) => p.name.toLowerCase().includes(q) || p.ccaa.toLowerCase().includes(q));
  }, [search]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof PROVINCIAS>();
    for (const p of filtered) {
      const arr = map.get(p.ccaa) || [];
      arr.push(p);
      map.set(p.ccaa, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      {/* MAPA */}
      <div className="rounded-2xl overflow-hidden border border-border h-[420px] bg-secondary relative">
        <MapContainer
          center={[40.0, -3.7]}
          zoom={5}
          minZoom={4}
          maxZoom={9}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {PROVINCIAS.map((p) => {
            const isSelected = selected.includes(p.code);
            return (
              <CircleMarker
                key={p.code}
                center={[p.lat, p.lng]}
                radius={isSelected ? 10 : 6}
                pathOptions={{
                  color: isSelected ? "hsl(174 60% 35%)" : "hsl(0 0% 30%)",
                  fillColor: isSelected ? "hsl(160 70% 55%)" : "hsl(0 0% 80%)",
                  fillOpacity: isSelected ? 0.9 : 0.55,
                  weight: isSelected ? 2 : 1,
                }}
                eventHandlers={{ click: () => toggle(p.code) }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent={isSelected}>
                  <span className="text-xs font-medium">{p.name}</span>
                </Tooltip>
              </CircleMarker>
            );
          })}
          <FitBounds codes={selected} />
        </MapContainer>
        <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur rounded-lg border border-border px-3 py-1.5 text-xs text-ink-soft flex items-center gap-1.5 pointer-events-none">
          <MapPin className="h-3 w-3 text-teal-deep" />
          {selected.length === 0
            ? "Haz clic en las provincias o usa el buscador"
            : `${selected.length} provincia${selected.length > 1 ? "s" : ""} seleccionada${selected.length > 1 ? "s" : ""}`}
        </div>
      </div>

      {/* PANEL SELECTOR */}
      <div className="rounded-2xl border border-border bg-card flex flex-col h-[420px]">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="input-base pl-9 text-sm"
              placeholder="Buscar provincia o CCAA"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => onChange(PROVINCIAS.map((p) => p.code))}
              className="text-teal-deep hover:underline"
            >
              Toda España
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-muted-foreground hover:text-ink"
            >
              Limpiar
            </button>
          </div>
        </div>
        <div className="overflow-y-auto p-3 space-y-3 flex-1">
          {grouped.map(([ccaa, items]) => (
            <div key={ccaa}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{ccaa}</p>
              <div className="space-y-1">
                {items.map((p) => {
                  const on = selected.includes(p.code);
                  return (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => toggle(p.code)}
                      className={cn(
                        "w-full flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md border text-left transition",
                        on
                          ? "bg-ink text-bone border-ink"
                          : "bg-card border-border hover:border-ink/40 text-ink",
                      )}
                    >
                      <span>{p.name}</span>
                      {on && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
