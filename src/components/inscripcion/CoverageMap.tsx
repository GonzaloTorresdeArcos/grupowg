import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, MapPin, Search, X } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { PROVINCIAS, type Provincia } from "@/lib/spain-provinces";
import {
  LOCALIDADES_BY_PROVINCE,
  getGroupedLocalidades,
  localidadKey,
} from "@/lib/spain-localidades";
import { DISTRITOS_PT, type Distrito } from "@/lib/portugal-distritos";
import {
  LOCALIDADES_BY_DISTRITO_PT,
  getGroupedLocalidadesPT,
  localidadKeyPT,
} from "@/lib/portugal-localidades";
import { cn } from "@/lib/utils";

interface Props {
  selected: string[]; // provincias/distritos seleccionados (códigos)
  onChange: (codes: string[]) => void;
  excluded?: string[]; // localidades excluidas, formato "code::Nombre"
  onExcludedChange?: (keys: string[]) => void;
}

type Country = "ES" | "PT";

/** Región territorial (provincia ES o distrito PT) tratada de forma uniforme. */
interface Region {
  code: string;
  name: string;
  group: string; // CCAA (ES) o región (PT)
  lat: number;
  lng: number;
  country: Country;
}

const provinciaToRegion = (p: Provincia): Region => ({
  code: p.code,
  name: p.name,
  group: p.ccaa,
  lat: p.lat,
  lng: p.lng,
  country: "ES",
});

const distritoToRegion = (d: Distrito): Region => ({
  code: d.code,
  name: d.name,
  group: d.region,
  lat: d.lat,
  lng: d.lng,
  country: "PT",
});

const ALL_REGIONS: Region[] = [
  ...PROVINCIAS.map(provinciaToRegion),
  ...DISTRITOS_PT.map(distritoToRegion),
];

const regionByCode = (code: string): Region | undefined =>
  ALL_REGIONS.find((r) => r.code === code);

const localidadesFor = (code: string) => {
  const r = regionByCode(code);
  if (!r) return [];
  return r.country === "ES"
    ? LOCALIDADES_BY_PROVINCE[code] ?? []
    : LOCALIDADES_BY_DISTRITO_PT[code] ?? [];
};

const groupedLocalidadesFor = (code: string) => {
  const r = regionByCode(code);
  if (!r) return [];
  return r.country === "ES"
    ? getGroupedLocalidades(code)
    : getGroupedLocalidadesPT(code);
};

const FitBounds = ({ codes, country }: { codes: string[]; country: Country }) => {
  const map = useMap();
  useEffect(() => {
    if (codes.length === 0) {
      // Vista por defecto según país activo
      if (country === "PT") {
        map.setView([39.5, -8.0], 6);
      } else {
        map.setView([40.0, -3.7], 5);
      }
      return;
    }
    const points = ALL_REGIONS.filter((r) => codes.includes(r.code)).map(
      (r) => [r.lat, r.lng] as [number, number],
    );
    if (points.length) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 7 });
    }
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

  const toggleExcl = (provCode: string, name: string) => {
    if (!onExcludedChange) return;
    const k = localidadKey(provCode, name); // formato es idéntico para PT
    onExcludedChange(excluded.includes(k) ? excluded.filter((x) => x !== k) : [...excluded, k]);
  };

  const toggleExclBulk = (provCode: string, names: string[]) => {
    if (!onExcludedChange) return;
    const keys = names.map((n) => localidadKey(provCode, n));
    const allExcluded = keys.every((k) => excluded.includes(k));
    if (allExcluded) {
      onExcludedChange(excluded.filter((k) => !keys.includes(k)));
    } else {
      onExcludedChange(Array.from(new Set([...excluded, ...keys])));
    }
  };

  const toggleGroupOpen = (group: string) => {
    setOpenGroup((prev) => {
      const n = new Set(prev);
      n.has(group) ? n.delete(group) : n.add(group);
      return n;
    });
  };

  const toggleProvOpen = (code: string) => {
    setOpenProv((prev) => {
      const n = new Set(prev);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });
    if (!openProv.has(code) && !selected.includes(code)) {
      onChange([...selected, code]);
    }
  };

  // Regiones del país activo
  const regionsForCountry = useMemo(
    () => ALL_REGIONS.filter((r) => r.country === country),
    [country],
  );

  // Agrupar por CCAA/región
  const groupedByGroup = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, Region[]>();
    for (const r of regionsForCountry) {
      if (q) {
        const matchesProv = r.name.toLowerCase().includes(q) || r.group.toLowerCase().includes(q);
        const matchesLoc = localidadesFor(r.code).some(
          (l) => l.name.toLowerCase().includes(q) || l.cp.startsWith(q),
        );
        if (!matchesProv && !matchesLoc) continue;
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
    if (allSelected) {
      onChange(selected.filter((c) => !codes.includes(c)));
    } else {
      onChange(Array.from(new Set([...selected, ...codes])));
    }
  };

  // Auto-expandir grupos al buscar
  useEffect(() => {
    if (!search.trim()) return;
    setOpenGroup(new Set(groupedByGroup.map(([g]) => g)));
  }, [search, groupedByGroup]);

  // Reset búsqueda al cambiar de país
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
      {/* MAPA */}
      <div className="rounded-2xl overflow-hidden border border-border h-[480px] bg-secondary relative">
        <MapContainer
          center={[40.0, -5.5]}
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
                excluded.length ? ` · ${excluded.length} localidad${excluded.length > 1 ? "es" : ""} excluida${excluded.length > 1 ? "s" : ""}` : ""
              }`}
        </div>
      </div>

      {/* PANEL JERÁRQUICO */}
      <div className="rounded-2xl border border-border bg-card flex flex-col h-[480px]">
        {/* Selector país */}
        <div className="p-2 border-b border-border flex gap-1">
          <button
            type="button"
            onClick={() => setCountry("ES")}
            className={cn(
              "flex-1 text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-md transition",
              country === "ES"
                ? "bg-ink text-bone"
                : "bg-secondary text-muted-foreground hover:text-ink",
            )}
          >
            🇪🇸 España
          </button>
          <button
            type="button"
            onClick={() => setCountry("PT")}
            className={cn(
              "flex-1 text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-md transition",
              country === "PT"
                ? "bg-ink text-bone"
                : "bg-secondary text-muted-foreground hover:text-ink",
            )}
          >
            🇵🇹 Portugal
          </button>
        </div>

        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="input-base pl-9 text-sm"
              placeholder={
                country === "ES"
                  ? "Buscar CCAA, provincia, localidad o CP"
                  : "Buscar región, distrito, concelho o CP"
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={selectAllCountry}
              className="text-teal-deep hover:underline"
            >
              {country === "ES" ? "Toda España" : "Todo Portugal"}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange([]);
                onExcludedChange?.([]);
              }}
              className="text-muted-foreground hover:text-ink"
            >
              Limpiar todo
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-2 flex-1">
          {groupedByGroup.map(([groupName, regions]) => {
            const state = groupState(regions);
            const isOpen = openGroup.has(groupName);
            return (
              <div key={`${country}-${groupName}`} className="mb-1">
                {/* GROUP HEADER */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleGroupOpen(groupName)}
                    className="p-1 text-muted-foreground hover:text-ink"
                    aria-label={isOpen ? "Colapsar" : "Expandir"}
                  >
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGroup(regions)}
                    className={cn(
                      "flex-1 flex items-center justify-between text-xs uppercase tracking-wider px-2 py-1.5 rounded-md font-semibold transition",
                      state === "all"
                        ? "bg-ink text-bone"
                        : state === "some"
                          ? "bg-teal/15 text-teal-deep"
                          : "text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    <span>{groupName}</span>
                    <span className="text-[10px] font-normal opacity-80">
                      {(() => {
                        let total = 0;
                        let active = 0;
                        for (const r of regions) {
                          const groups = groupedLocalidadesFor(r.code);
                          const provGroupCount =
                            groups.length > 1 || (groups[0]?.hasSubgroups ?? false)
                              ? groups.length
                              : 1;
                          total += provGroupCount;
                          if (selected.includes(r.code)) {
                            if (provGroupCount === 1) {
                              active += 1;
                            } else {
                              const excludedGroups = groups.filter((g) =>
                                g.localidades.every((l) =>
                                  excluded.includes(localidadKey(r.code, l.name)),
                                ),
                              ).length;
                              active += provGroupCount - excludedGroups;
                            }
                          }
                        }
                        return `${active}/${total}`;
                      })()}
                    </span>
                  </button>
                </div>

                {/* PROVINCIAS / DISTRITOS */}
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {regions.map((r) => {
                      const provSelected = selected.includes(r.code);
                      const localidades = localidadesFor(r.code);
                      const provOpen = openProv.has(r.code);
                      const exclCount = excluded.filter((k) => k.startsWith(`${r.code}::`)).length;
                      return (
                        <div key={r.code}>
                          <div className="flex items-center gap-1">
                            {localidades.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => toggleProvOpen(r.code)}
                                className="p-1 text-teal-deep hover:text-ink"
                                aria-label={provOpen ? "Colapsar localidades" : "Ver localidades"}
                                title={provOpen ? "Ocultar localidades" : `Ver ${localidades.length} localidades`}
                              >
                                {provOpen ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                              </button>
                            ) : (
                              <span className="w-5" />
                            )}
                            <button
                              type="button"
                              onClick={() => toggleProv(r.code)}
                              className={cn(
                                "flex-1 flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md border text-left transition",
                                provSelected
                                  ? "bg-ink text-bone border-ink"
                                  : "bg-card border-border hover:border-ink/40 text-ink",
                              )}
                            >
                              <span className="flex items-center gap-2">
                                {r.name}
                                {localidades.length > 0 && (() => {
                                  const groups = groupedLocalidadesFor(r.code);
                                  const hasHierarchy =
                                    groups.length > 1 || (groups[0]?.hasSubgroups ?? false);
                                  if (hasHierarchy) {
                                    const excludedGroups = groups.filter((g) =>
                                      g.localidades.every((l) =>
                                        excluded.includes(localidadKey(r.code, l.name)),
                                      ),
                                    ).length;
                                    const activeGroups = groups.length - excludedGroups;
                                    return (
                                      <span
                                        className={cn(
                                          "text-[10px] px-1.5 py-0.5 rounded",
                                          provSelected ? "bg-bone/20 text-bone/90" : "bg-secondary text-muted-foreground",
                                        )}
                                      >
                                        {activeGroups}/{groups.length} zonas
                                      </span>
                                    );
                                  }
                                  return (
                                    <span
                                      className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded",
                                        provSelected ? "bg-bone/20 text-bone/90" : "bg-secondary text-muted-foreground",
                                      )}
                                    >
                                      {localidades.length} loc.
                                    </span>
                                  );
                                })()}
                                {exclCount > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
                                    -{exclCount}
                                  </span>
                                )}
                              </span>
                              {provSelected && <Check className="h-3.5 w-3.5" />}
                            </button>
                          </div>

                          {/* LOCALIDADES AGRUPADAS */}
                          {provOpen && localidades.length > 0 && (() => {
                            const groups = groupedLocalidadesFor(r.code);
                            const flat = groups.length === 1 && !groups[0].hasSubgroups;
                            return (
                              <div className="ml-6 mt-1 mb-2 pl-2 border-l border-border space-y-1">
                                <p className="text-[10px] uppercase text-muted-foreground py-1">
                                  Marca las zonas o localidades que <strong>NO</strong> quieres atender
                                </p>
                                {groups.map((g) => {
                                  const groupKey = `${r.code}::${g.key}`;
                                  const groupOpen = flat || openSubs.has(groupKey);
                                  const groupExclCount = g.localidades.filter((l) =>
                                    excluded.includes(localidadKey(r.code, l.name)),
                                  ).length;
                                  const groupAllExcl =
                                    groupExclCount === g.localidades.length && g.localidades.length > 0;
                                  return (
                                    <div key={groupKey}>
                                      {!flat && (
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => toggleSub(groupKey)}
                                            className="p-0.5 text-muted-foreground hover:text-ink"
                                            aria-label={groupOpen ? "Colapsar" : "Expandir"}
                                          >
                                            {groupOpen ? (
                                              <ChevronDown className="h-3 w-3" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3" />
                                            )}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              toggleExclBulk(
                                                r.code,
                                                g.localidades.map((l) => l.name),
                                              )
                                            }
                                            className={cn(
                                              "flex-1 flex items-center justify-between text-[11px] uppercase tracking-wider px-2 py-1 rounded font-semibold transition",
                                              groupAllExcl
                                                ? "bg-destructive/15 text-destructive"
                                                : groupExclCount > 0
                                                  ? "bg-destructive/10 text-destructive/80"
                                                  : "text-ink-soft hover:bg-secondary",
                                            )}
                                          >
                                            <span>{g.level1}</span>
                                            <span className="text-[10px] font-normal opacity-80">
                                              {groupExclCount > 0
                                                ? `-${groupExclCount}/${g.localidades.length}`
                                                : `${g.localidades.length}`}
                                            </span>
                                          </button>
                                        </div>
                                      )}

                                      {groupOpen && (
                                        <div className={cn("space-y-0.5", !flat && "ml-4 mt-0.5")}>
                                          {g.subgroups.map((sg) => {
                                            if (!sg.level2) {
                                              return sg.localidades.map((l) => {
                                                const k = localidadKey(r.code, l.name);
                                                const isExcl = excluded.includes(k);
                                                const cleanName = l.name.includes(" · ")
                                                  ? l.name.split(" · ").slice(1).join(" · ")
                                                  : l.name;
                                                return (
                                                  <button
                                                    key={k}
                                                    type="button"
                                                    onClick={() => toggleExcl(r.code, l.name)}
                                                    className={cn(
                                                      "w-full flex items-center justify-between text-xs px-2 py-1 rounded transition",
                                                      isExcl
                                                        ? "bg-destructive/10 text-destructive line-through"
                                                        : "text-ink-soft hover:bg-secondary",
                                                    )}
                                                  >
                                                    <span className="flex items-center gap-2">
                                                      {isExcl ? (
                                                        <X className="h-3 w-3" />
                                                      ) : (
                                                        <span className="w-3" />
                                                      )}
                                                      {cleanName}
                                                    </span>
                                                    <span className="font-mono text-[10px] text-muted-foreground">
                                                      {l.cp}
                                                    </span>
                                                  </button>
                                                );
                                              });
                                            }

                                            const subKey = `${groupKey}::${sg.level2}`;
                                            const subOpen = openSubs.has(subKey);
                                            const subExclCount = sg.localidades.filter((l) =>
                                              excluded.includes(localidadKey(r.code, l.name)),
                                            ).length;
                                            const subAllExcl =
                                              subExclCount === sg.localidades.length && sg.localidades.length > 0;
                                            return (
                                              <div key={subKey}>
                                                <div className="flex items-center gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={() => toggleSub(subKey)}
                                                    className="p-0.5 text-muted-foreground hover:text-ink"
                                                    aria-label={subOpen ? "Colapsar" : "Expandir"}
                                                  >
                                                    {subOpen ? (
                                                      <ChevronDown className="h-3 w-3" />
                                                    ) : (
                                                      <ChevronRight className="h-3 w-3" />
                                                    )}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      toggleExclBulk(
                                                        r.code,
                                                        sg.localidades.map((l) => l.name),
                                                      )
                                                    }
                                                    className={cn(
                                                      "flex-1 flex items-center justify-between text-[11px] px-2 py-1 rounded transition",
                                                      subAllExcl
                                                        ? "bg-destructive/15 text-destructive font-medium"
                                                        : subExclCount > 0
                                                          ? "bg-destructive/10 text-destructive/80"
                                                          : "text-ink-soft hover:bg-secondary",
                                                    )}
                                                  >
                                                    <span>{sg.level2}</span>
                                                    <span className="text-[10px] opacity-80">
                                                      {subExclCount > 0
                                                        ? `-${subExclCount}/${sg.localidades.length}`
                                                        : `${sg.localidades.length}`}
                                                    </span>
                                                  </button>
                                                </div>
                                                {subOpen && (
                                                  <div className="ml-4 mt-0.5 space-y-0.5">
                                                    {sg.localidades.map((l) => {
                                                      const k = localidadKey(r.code, l.name);
                                                      const isExcl = excluded.includes(k);
                                                      const cleanName = l.name.includes(" · ")
                                                        ? l.name.split(" · ").slice(1).join(" · ")
                                                        : l.name;
                                                      return (
                                                        <button
                                                          key={k}
                                                          type="button"
                                                          onClick={() => toggleExcl(r.code, l.name)}
                                                          className={cn(
                                                            "w-full flex items-center justify-between text-xs px-2 py-1 rounded transition",
                                                            isExcl
                                                              ? "bg-destructive/10 text-destructive line-through"
                                                              : "text-ink-soft hover:bg-secondary",
                                                          )}
                                                        >
                                                          <span className="flex items-center gap-2">
                                                            {isExcl ? (
                                                              <X className="h-3 w-3" />
                                                            ) : (
                                                              <span className="w-3" />
                                                            )}
                                                            {cleanName}
                                                          </span>
                                                          <span className="font-mono text-[10px] text-muted-foreground">
                                                            {l.cp}
                                                          </span>
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
                            );
                          })()}
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
