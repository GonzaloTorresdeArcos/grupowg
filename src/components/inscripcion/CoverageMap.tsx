import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, MapPin, Search, X } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { PROVINCIAS, type Provincia } from "@/lib/spain-provinces";
import { DISTRITOS_PT, type Distrito } from "@/lib/portugal-distritos";
import { getZonasES, getZonasPT, type ZonaExpandida } from "@/lib/zona-resolver";
import { cn } from "@/lib/utils";

interface Props {
  selected: string[];
  onChange: (codes: string[]) => void;
  excluded?: string[]; // zonas excluidas, formato "code::cabecera"
  onExcludedChange?: (keys: string[]) => void;
}

type Country = "ES" | "PT";

interface Region {
  code: string;
  name: string;
  group: string;
  lat: number;
  lng: number;
  country: Country;
}

const provinciaToRegion = (p: Provincia): Region => ({ code: p.code, name: p.name, group: p.ccaa, lat: p.lat, lng: p.lng, country: "ES" });
const distritoToRegion = (d: Distrito): Region => ({ code: d.code, name: d.name, group: d.region, lat: d.lat, lng: d.lng, country: "PT" });

const ALL_REGIONS: Region[] = [...PROVINCIAS.map(provinciaToRegion), ...DISTRITOS_PT.map(distritoToRegion)];
const regionByCode = (code: string): Region | undefined => ALL_REGIONS.find((r) => r.code === code);

const zonasFor = (code: string): ZonaExpandida[] => {
  const r = regionByCode(code);
  if (!r) return [];
  return r.country === "ES" ? getZonasES(code) : getZonasPT(code);
};

const L1_ORDER: Record<string, number> = { Capital: 0, "Área metropolitana": 1 };

interface ZGroup { level1: string; zonas: ZonaExpandida[]; }
const groupZonas = (zs: ZonaExpandida[]): ZGroup[] => {
  const m = new Map<string, ZonaExpandida[]>();
  for (const z of zs) {
    const arr = m.get(z.level1) ?? [];
    arr.push(z);
    m.set(z.level1, arr);
  }
  return Array.from(m.entries())
    .sort(([a], [b]) => (L1_ORDER[a] ?? 2) - (L1_ORDER[b] ?? 2) || a.localeCompare(b))
    .map(([level1, zonas]) => ({ level1, zonas }));
};

const zonaKey = (code: string, cabecera: string) => `${code}::${cabecera}`;

const FitBounds = ({ codes, country }: { codes: string[]; country: Country }) => {
  const map = useMap();
  useEffect(() => {
    if (codes.length === 0) {
      map.setView(country === "PT" ? [39.5, -8.0] : [40.0, -3.7], country === "PT" ? 6 : 5);
      return;
    }
    const points = ALL_REGIONS.filter((r) => codes.includes(r.code)).map((r) => [r.lat, r.lng] as [number, number]);
    if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 7 });
  }, [codes, map, country]);
  return null;
};

export const CoverageMap = ({ selected, onChange, excluded = [], onExcludedChange }: Props) => {
  const [country, setCountry] = useState<Country>("ES");
  const [search, setSearch] = useState("");
  const [openGroup, setOpenGroup] = useState<Set<string>>(new Set());
  const [openProv, setOpenProv] = useState<Set<string>>(new Set());
  const [openSubs, setOpenSubs] = useState<Set<string>>(new Set());

  const toggleSub = (k: string) =>
    setOpenSubs((prev) => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const toggleProv = (code: string) => {
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
  };

  const toggleExcl = (code: string, cabecera: string) => {
    if (!onExcludedChange) return;
    const k = zonaKey(code, cabecera);
    onExcludedChange(excluded.includes(k) ? excluded.filter((x) => x !== k) : [...excluded, k]);
  };

  const toggleExclBulk = (code: string, cabeceras: string[]) => {
    if (!onExcludedChange) return;
    const keys = cabeceras.map((c) => zonaKey(code, c));
    const allExcluded = keys.every((k) => excluded.includes(k));
    onExcludedChange(allExcluded ? excluded.filter((k) => !keys.includes(k)) : Array.from(new Set([...excluded, ...keys])));
  };

  const toggleGroupOpen = (group: string) =>
    setOpenGroup((prev) => {
      const n = new Set(prev);
      n.has(group) ? n.delete(group) : n.add(group);
      return n;
    });

  const toggleProvOpen = (code: string) => {
    setOpenProv((prev) => {
      const n = new Set(prev);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });
    if (!openProv.has(code) && !selected.includes(code)) onChange([...selected, code]);
  };

  const regionsForCountry = useMemo(() => ALL_REGIONS.filter((r) => r.country === country), [country]);

  const groupedByGroup = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, Region[]>();
    for (const r of regionsForCountry) {
      if (q) {
        const matchesProv = r.name.toLowerCase().includes(q) || r.group.toLowerCase().includes(q);
        const matchesZona = zonasFor(r.code).some(
          (z) => z.cabecera.toLowerCase().includes(q) || z.cps.some((cp) => cp.startsWith(q)),
        );
        if (!matchesProv && !matchesZona) continue;
      }
      const arr = map.get(r.group) || [];
      arr.push(r);
      map.set(r.group, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [search, regionsForCountry]);

  const groupState = (regions: Region[]) => {
    const codes = regions.map((r) => r.code);
    const sel = codes.filter((c) => selected.includes(c)).length;
    if (sel === 0) return "none" as const;
    if (sel === codes.length) return "all" as const;
    return "some" as const;
  };

  const toggleGroup = (regions: Region[]) => {
    const codes = regions.map((r) => r.code);
    const allSelected = codes.every((c) => selected.includes(c));
    onChange(allSelected ? selected.filter((c) => !codes.includes(c)) : Array.from(new Set([...selected, ...codes])));
  };

  useEffect(() => {
    if (!search.trim()) return;
    setOpenGroup(new Set(groupedByGroup.map(([g]) => g)));
  }, [search, groupedByGroup]);

  useEffect(() => {
    setSearch("");
  }, [country]);

  const selectAllCountry = () => {
    const codesCountry = regionsForCountry.map((r) => r.code);
    const otherCountry = selected.filter((c) => !codesCountry.includes(c));
    onChange([...otherCountry, ...codesCountry]);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4">
      <div className="rounded-2xl overflow-hidden border border-border h-[480px] bg-secondary relative">
        <MapContainer center={[40.0, -5.5]} zoom={5} minZoom={4} maxZoom={9} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {regionsForCountry.map((r) => {
            const isSelected = selected.includes(r.code);
            return (
              <CircleMarker
                key={r.code}
                center={[r.lat, r.lng]}
                radius={isSelected ? 10 : 6}
                pathOptions={{
                  color: isSelected ? "hsl(174 60% 35%)" : "hsl(0 0% 30%)",
                  fillColor: isSelected ? "hsl(160 70% 55%)" : "hsl(0 0% 80%)",
                  fillOpacity: isSelected ? 0.9 : 0.55,
                  weight: isSelected ? 2 : 1,
                }}
                eventHandlers={{ click: () => toggleProv(r.code) }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent={isSelected}>
                  <span className="text-xs font-medium">{r.name}</span>
                </Tooltip>
              </CircleMarker>
            );
          })}
          <FitBounds codes={selected.filter((c) => regionsForCountry.some((r) => r.code === c))} country={country} />
        </MapContainer>
        <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur rounded-lg border border-border px-3 py-1.5 text-xs text-ink-soft flex items-center gap-1.5 pointer-events-none">
          <MapPin className="h-3 w-3 text-teal-deep" />
          {selected.length === 0
            ? "1) Elige país  ·  2) Despliega región  ·  3) Marca provincias/distritos"
            : `${selected.length} ${selected.length > 1 ? "regiones" : "región"}${
                excluded.length ? ` · ${excluded.length} zona${excluded.length > 1 ? "s" : ""} excluida${excluded.length > 1 ? "s" : ""}` : ""
              }`}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card flex flex-col h-[480px]">
        <div className="p-2 border-b border-border flex gap-1">
          <button type="button" onClick={() => setCountry("ES")} className={cn("flex-1 text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-md transition", country === "ES" ? "bg-ink text-bone" : "bg-secondary text-muted-foreground hover:text-ink")}>🇪🇸 España</button>
          <button type="button" onClick={() => setCountry("PT")} className={cn("flex-1 text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-md transition", country === "PT" ? "bg-ink text-bone" : "bg-secondary text-muted-foreground hover:text-ink")}>🇵🇹 Portugal</button>
        </div>

        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className="input-base pl-9 text-sm" placeholder={country === "ES" ? "Buscar CCAA, provincia, zona o CP" : "Buscar región, distrito, zona o CP"} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <button type="button" onClick={selectAllCountry} className="text-teal-deep hover:underline">{country === "ES" ? "Toda España" : "Todo Portugal"}</button>
            <button type="button" onClick={() => { onChange([]); onExcludedChange?.([]); }} className="text-muted-foreground hover:text-ink">Limpiar todo</button>
          </div>
        </div>

        <div className="overflow-y-auto p-2 flex-1">
          {groupedByGroup.map(([groupName, regions]) => {
            const state = groupState(regions);
            const isOpen = openGroup.has(groupName);
            return (
              <div key={`${country}-${groupName}`} className="mb-1">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => toggleGroupOpen(groupName)} className="p-1 text-muted-foreground hover:text-ink" aria-label={isOpen ? "Colapsar" : "Expandir"}>
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={() => toggleGroup(regions)} className={cn("flex-1 flex items-center justify-between text-xs uppercase tracking-wider px-2 py-1.5 rounded-md font-semibold transition", state === "all" ? "bg-ink text-bone" : state === "some" ? "bg-teal/15 text-teal-deep" : "text-muted-foreground hover:bg-secondary")}>
                    <span>{groupName}</span>
                    <span className="text-[10px] font-normal opacity-80">
                      {regions.filter((r) => selected.includes(r.code)).length}/{regions.length}
                    </span>
                  </button>
                </div>

                {isOpen && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {regions.map((r) => {
                      const provSelected = selected.includes(r.code);
                      const zonas = zonasFor(r.code);
                      const provOpen = openProv.has(r.code);
                      const exclCount = excluded.filter((k) => k.startsWith(`${r.code}::`)).length;
                      const activeZonas = zonas.length - exclCount;
                      return (
                        <div key={r.code}>
                          <div className="flex items-center gap-1">
                            {zonas.length > 0 ? (
                              <button type="button" onClick={() => toggleProvOpen(r.code)} className="p-1 text-teal-deep hover:text-ink" aria-label={provOpen ? "Colapsar zonas" : "Ver zonas"} title={provOpen ? "Ocultar zonas" : `Ver ${zonas.length} zonas`}>
                                {provOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </button>
                            ) : (
                              <span className="w-5" />
                            )}
                            <button type="button" onClick={() => toggleProv(r.code)} className={cn("flex-1 flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md border text-left transition", provSelected ? "bg-ink text-bone border-ink" : "bg-card border-border hover:border-ink/40 text-ink")}>
                              <span className="flex items-center gap-2">
                                {r.name}
                                {zonas.length > 0 && (
                                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded", provSelected ? "bg-bone/20 text-bone/90" : "bg-secondary text-muted-foreground")}>
                                    {activeZonas}/{zonas.length} zonas
                                  </span>
                                )}
                                {exclCount > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">-{exclCount}</span>
                                )}
                              </span>
                              {provSelected && <Check className="h-3.5 w-3.5" />}
                            </button>
                          </div>

                          {provOpen && zonas.length > 0 && (
                            <div className="ml-6 mt-1 mb-2 pl-2 border-l border-border space-y-1">
                              <p className="text-[10px] uppercase text-muted-foreground py-1">
                                Marca las zonas que <strong>NO</strong> quieres atender
                              </p>
                              {groupZonas(zonas).map((g) => {
                                const groupKey = `${r.code}::grp::${g.level1}`;
                                const cabeceras = g.zonas.map((z) => z.cabecera);
                                const groupExclCount = cabeceras.filter((c) => excluded.includes(zonaKey(r.code, c))).length;
                                const groupAllExcl = groupExclCount === g.zonas.length && g.zonas.length > 0;
                                const isCollapsed = openSubs.has(`${groupKey}::closed`);
                                return (
                                  <div key={groupKey}>
                                    <div className="flex items-center gap-1">
                                      <button type="button" onClick={() => toggleSub(`${groupKey}::closed`)} className="p-0.5 text-muted-foreground hover:text-ink" aria-label={isCollapsed ? "Expandir" : "Colapsar"}>
                                        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                      </button>
                                      <button type="button" onClick={() => toggleExclBulk(r.code, cabeceras)} className={cn("flex-1 flex items-center justify-between text-[11px] uppercase tracking-wider px-2 py-1 rounded font-semibold transition", groupAllExcl ? "bg-destructive/15 text-destructive" : groupExclCount > 0 ? "bg-destructive/10 text-destructive/80" : "text-ink-soft hover:bg-secondary")}>
                                        <span>{g.level1}</span>
                                        <span className="text-[10px] font-normal opacity-80">
                                          {groupExclCount > 0 ? `-${groupExclCount}/${g.zonas.length}` : `${g.zonas.length}`}
                                        </span>
                                      </button>
                                    </div>
                                    {!isCollapsed && (
                                      <div className="ml-4 mt-0.5 space-y-0.5">
                                        {g.zonas.map((z) => {
                                          const k = zonaKey(r.code, z.cabecera);
                                          const isExcl = excluded.includes(k);
                                          return (
                                            <button key={k} type="button" onClick={() => toggleExcl(r.code, z.cabecera)} className={cn("w-full flex items-center justify-between text-xs px-2 py-1 rounded transition", isExcl ? "bg-destructive/10 text-destructive line-through" : "text-ink-soft hover:bg-secondary")}>
                                              <span className="flex items-center gap-2">
                                                {isExcl ? <X className="h-3 w-3" /> : <span className="w-3" />}
                                                {z.cabecera}
                                                <span className="text-[9px] text-muted-foreground">{z.card}</span>
                                              </span>
                                              <span className="font-mono text-[10px] text-muted-foreground">{z.cps.length} CP</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
