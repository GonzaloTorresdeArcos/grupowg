import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, MapPin, Search, X } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { PROVINCIAS, type Provincia } from "@/lib/spain-provinces";
import { LOCALIDADES_BY_PROVINCE, getGroupedLocalidades, localidadKey } from "@/lib/spain-localidades";
import { cn } from "@/lib/utils";

interface Props {
  selected: string[]; // provincias seleccionadas (códigos)
  onChange: (codes: string[]) => void;
  excluded?: string[]; // localidades excluidas, formato "provCode::Nombre"
  onExcludedChange?: (keys: string[]) => void;
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
      map.fitBounds(points as [number, number][], { padding: [40, 40], maxZoom: 7 });
    }
  }, [codes, map]);
  return null;
};

export const CoverageMap = ({ selected, onChange, excluded = [], onExcludedChange }: Props) => {
  const [search, setSearch] = useState("");
  const [openCcaa, setOpenCcaa] = useState<Set<string>>(new Set());
  const [openProv, setOpenProv] = useState<Set<string>>(new Set());
  // Subgrupos abiertos por provincia. Clave: `${provCode}::${groupKey}` o `${provCode}::${groupKey}::${subKey}`
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
    const k = localidadKey(provCode, name);
    onExcludedChange(excluded.includes(k) ? excluded.filter((x) => x !== k) : [...excluded, k]);
  };

  /** Excluye o incluye en bloque un conjunto de localidades de una provincia. */
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

  const toggleCcaaOpen = (ccaa: string) => {
    setOpenCcaa((prev) => {
      const n = new Set(prev);
      n.has(ccaa) ? n.delete(ccaa) : n.add(ccaa);
      return n;
    });
  };
  const toggleProvOpen = (code: string) => {
    setOpenProv((prev) => {
      const n = new Set(prev);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });
    // Auto-seleccionar la provincia al expandirla para habilitar la exclusión
    if (!openProv.has(code) && !selected.includes(code)) {
      onChange([...selected, code]);
    }
  };

  // Agrupar por CCAA con filtro
  const groupedByCcaa = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, Provincia[]>();
    for (const p of PROVINCIAS) {
      // si hay búsqueda, filtrar por nombre prov, ccaa o localidad
      if (q) {
        const matchesProv = p.name.toLowerCase().includes(q) || p.ccaa.toLowerCase().includes(q);
        const matchesLoc = (LOCALIDADES_BY_PROVINCE[p.code] ?? []).some(
          (l) => l.name.toLowerCase().includes(q) || l.cp.startsWith(q),
        );
        if (!matchesProv && !matchesLoc) continue;
      }
      const arr = map.get(p.ccaa) || [];
      arr.push(p);
      map.set(p.ccaa, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [search]);

  // Selección masiva CCAA
  const ccaaState = (ccaa: string, provs: Provincia[]) => {
    const codes = provs.map((p) => p.code);
    const sel = codes.filter((c) => selected.includes(c)).length;
    if (sel === 0) return "none" as const;
    if (sel === codes.length) return "all" as const;
    return "some" as const;
  };
  const toggleCcaa = (provs: Provincia[]) => {
    const codes = provs.map((p) => p.code);
    const allSelected = codes.every((c) => selected.includes(c));
    if (allSelected) {
      onChange(selected.filter((c) => !codes.includes(c)));
    } else {
      const merged = new Set([...selected, ...codes]);
      onChange(Array.from(merged));
    }
  };

  // Auto-expandir CCAA al buscar
  useEffect(() => {
    if (!search.trim()) return;
    setOpenCcaa(new Set(groupedByCcaa.map(([c]) => c)));
  }, [search, groupedByCcaa]);

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4">
      {/* MAPA */}
      <div className="rounded-2xl overflow-hidden border border-border h-[480px] bg-secondary relative">
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
                eventHandlers={{ click: () => toggleProv(p.code) }}
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
            ? "1) Despliega una CCAA  ·  2) Marca provincias  ·  3) Expande para excluir localidades"
            : `${selected.length} provincia${selected.length > 1 ? "s" : ""}${
                excluded.length ? ` · ${excluded.length} localidad${excluded.length > 1 ? "es" : ""} excluida${excluded.length > 1 ? "s" : ""}` : ""
              }`}
        </div>
      </div>

      {/* PANEL JERÁRQUICO */}
      <div className="rounded-2xl border border-border bg-card flex flex-col h-[480px]">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="input-base pl-9 text-sm"
              placeholder="Buscar CCAA, provincia, localidad o CP"
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
          {groupedByCcaa.map(([ccaa, provs]) => {
            const state = ccaaState(ccaa, provs);
            const isOpen = openCcaa.has(ccaa);
            return (
              <div key={ccaa} className="mb-1">
                {/* CCAA HEADER */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleCcaaOpen(ccaa)}
                    className="p-1 text-muted-foreground hover:text-ink"
                    aria-label={isOpen ? "Colapsar" : "Expandir"}
                  >
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCcaa(provs)}
                    className={cn(
                      "flex-1 flex items-center justify-between text-xs uppercase tracking-wider px-2 py-1.5 rounded-md font-semibold transition",
                      state === "all"
                        ? "bg-ink text-bone"
                        : state === "some"
                          ? "bg-teal/15 text-teal-deep"
                          : "text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    <span>{ccaa}</span>
                    <span className="text-[10px] font-normal opacity-80">
                      {provs.filter((p) => selected.includes(p.code)).length}/{provs.length}
                    </span>
                  </button>
                </div>

                {/* PROVINCIAS */}
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {provs.map((p) => {
                      const provSelected = selected.includes(p.code);
                      const localidades = LOCALIDADES_BY_PROVINCE[p.code] ?? [];
                      const provOpen = openProv.has(p.code);
                      const exclCount = excluded.filter((k) => k.startsWith(`${p.code}::`)).length;
                      return (
                        <div key={p.code}>
                          <div className="flex items-center gap-1">
                            {localidades.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => toggleProvOpen(p.code)}
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
                              onClick={() => toggleProv(p.code)}
                              className={cn(
                                "flex-1 flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md border text-left transition",
                                provSelected
                                  ? "bg-ink text-bone border-ink"
                                  : "bg-card border-border hover:border-ink/40 text-ink",
                              )}
                            >
                              <span className="flex items-center gap-2">
                                {p.name}
                                {localidades.length > 0 && (
                                  <span
                                    className={cn(
                                      "text-[10px] px-1.5 py-0.5 rounded",
                                      provSelected ? "bg-bone/20 text-bone/90" : "bg-secondary text-muted-foreground",
                                    )}
                                  >
                                    {localidades.length} loc.
                                  </span>
                                )}
                                {exclCount > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
                                    -{exclCount}
                                  </span>
                                )}
                              </span>
                              {provSelected && <Check className="h-3.5 w-3.5" />}
                            </button>
                          </div>

                          {/* LOCALIDADES AGRUPADAS (excluibles por nivel) */}
                          {provOpen && localidades.length > 0 && (() => {
                            const groups = getGroupedLocalidades(p.code);
                            // Si solo hay un grupo plano sin subgrupos, render directo (mismo comportamiento previo)
                            const flat =
                              groups.length === 1 && !groups[0].hasSubgroups;
                            return (
                              <div className="ml-6 mt-1 mb-2 pl-2 border-l border-border space-y-1">
                                <p className="text-[10px] uppercase text-muted-foreground py-1">
                                  Marca las zonas o localidades que <strong>NO</strong> quieres atender
                                </p>
                                {groups.map((g) => {
                                  const groupKey = `${p.code}::${g.key}`;
                                  const groupOpen = flat || openSubs.has(groupKey);
                                  const groupExclCount = g.localidades.filter((l) =>
                                    excluded.includes(localidadKey(p.code, l.name)),
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
                                                p.code,
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
                                            // Si no hay subgrupo (level2=null), renderiza localidades directo
                                            if (!sg.level2) {
                                              return sg.localidades.map((l) => {
                                                const k = localidadKey(p.code, l.name);
                                                const isExcl = excluded.includes(k);
                                                const cleanName = l.name.includes(" · ")
                                                  ? l.name.split(" · ").slice(1).join(" · ")
                                                  : l.name;
                                                return (
                                                  <button
                                                    key={k}
                                                    type="button"
                                                    onClick={() => toggleExcl(p.code, l.name)}
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

                                            // Subgrupo nivel 2
                                            const subKey = `${groupKey}::${sg.level2}`;
                                            const subOpen = openSubs.has(subKey);
                                            const subExclCount = sg.localidades.filter((l) =>
                                              excluded.includes(localidadKey(p.code, l.name)),
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
                                                        p.code,
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
                                                      const k = localidadKey(p.code, l.name);
                                                      const isExcl = excluded.includes(k);
                                                      const cleanName = l.name.includes(" · ")
                                                        ? l.name.split(" · ").slice(1).join(" · ")
                                                        : l.name;
                                                      return (
                                                        <button
                                                          key={k}
                                                          type="button"
                                                          onClick={() => toggleExcl(p.code, l.name)}
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
