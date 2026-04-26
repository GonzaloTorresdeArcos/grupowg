import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Sede = {
  name: string;
  lat: number;
  lng: number;
  role: "central" | "operativa";
};

const SEDES: Sede[] = [
  { name: "Madrid · Sede central", lat: 40.4168, lng: -3.7038, role: "central" },
  { name: "Barcelona", lat: 41.3874, lng: 2.1686, role: "operativa" },
  { name: "Valencia", lat: 39.4699, lng: -0.3763, role: "operativa" },
  { name: "Canarias · Las Palmas", lat: 28.1235, lng: -15.4363, role: "operativa" },
];

// Polígonos aproximados (envolventes simples) para señalar la cobertura
// Península Ibérica (España + Portugal continental) y Canarias.
const PENINSULA_COVERAGE: [number, number][] = [
  [43.8, -9.6],
  [43.9, -1.3],
  [42.6, 3.4],
  [40.0, 0.9],
  [36.6, -2.0],
  [36.0, -5.7],
  [37.0, -9.6],
  [41.9, -9.6],
  [43.8, -9.6],
];

const CANARIAS_COVERAGE: [number, number][] = [
  [29.5, -18.3],
  [29.5, -13.3],
  [27.5, -13.3],
  [27.5, -18.3],
];

export const PresenceMap = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <MapContainer
      center={isMobile ? [39.5, -4.5] : [39.5, -5.5]}
      zoom={isMobile ? 4 : 5}
      minZoom={isMobile ? 4 : 4}
      maxZoom={9}
      scrollWheelZoom={false}
      dragging={!isMobile}
      doubleClickZoom={!isMobile}
      touchZoom={!isMobile}
      tap={false}
      zoomControl={!isMobile}
      className="h-full w-full"
      aria-label="Mapa de presencia de Grupo WG en España y Portugal"
    >
      <TileLayer
        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Cobertura */}
      <Polygon
        positions={PENINSULA_COVERAGE}
        pathOptions={{
          color: "hsl(174 60% 35%)",
          weight: 1.5,
          fillColor: "hsl(160 70% 55%)",
          fillOpacity: 0.12,
        }}
      />
      <Polygon
        positions={CANARIAS_COVERAGE}
        pathOptions={{
          color: "hsl(174 60% 35%)",
          weight: 1.5,
          fillColor: "hsl(160 70% 55%)",
          fillOpacity: 0.12,
        }}
      />

      {/* Sedes */}
      {SEDES.map((s) => {
        const isCentral = s.role === "central";
        return (
          <CircleMarker
            key={s.name}
            center={[s.lat, s.lng]}
            radius={isCentral ? 11 : 8}
            pathOptions={{
              color: isCentral ? "hsl(174 60% 30%)" : "hsl(174 60% 35%)",
              fillColor: isCentral ? "hsl(160 70% 45%)" : "hsl(160 70% 60%)",
              fillOpacity: 0.95,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent>
              <span className="text-xs font-medium">{s.name}</span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
};
