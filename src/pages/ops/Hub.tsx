import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DataAsOf } from "@/components/ops/DataAsOf";
import { supabase } from "@/integrations/supabase/client";
import { useOpsFilters, fmtNum, fmtPct } from "@/lib/ops-filters";
import { labelPeriodo } from "@/lib/ops-performance";
import { gamaLabel } from "@/lib/ops-gamas";
import { EquiposComparativa } from "@/components/ops/EquiposComparativa";
import { Loader2, CheckCircle2, CircleDashed, Circle, Info } from "lucide-react";
import Tecnicos from "@/pages/ops/Tecnicos";
import { etiquetaVentana } from "@/lib/ops-modelo";

export const HUB_DELEGACION = "Central San Agustin";

type Ficha = {
  tecnicos: Array<{ tecnico: string; cerradas: number; bajas: number; pct_bajas: number; pct_sla20: number }>;
  por_gama: Array<{ gama: string; cerradas: number; bajas: number; pct_bajas: number; pct_sla20: number }>;
  por_marca: Array<{ marca: string; cerradas: number; bajas: number; pct_bajas: number }>;
  por_cliente: Array<{ cliente: string; cerradas: number; bajas: number; pct_bajas: number }>;
  por_provincia: Array<{ provincia: string; cerradas: number }>;
  abiertas_prov: Array<{ provincia: string; abiertas: number; abiertas_30: number }>;
  evolucion: Array<{ mes: string; cerradas: number; pct_bajas: number; pct_sla20: number }>;
};

const TABS = [
  { key: "general", label: "Vista General" },
  { key: "equipos", label: "Equipos" },
  { key: "tecnicos", label: "Técnicos" },
  { key: "rutas", label: "Rutas & Planificación" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const isTab = (v: string | null): v is TabKey => TABS.some((t) => t.key === v);

const Metric = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="border border-black/[0.06] rounded-xl bg-white p-3">
    <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40 font-semibold">{label}</p>
    <p className="font-display text-xl tabular-nums text-ink mt-1">{value}</p>
    {sub && <p className="text-[11px] text-ink/50">{sub}</p>}
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{title}</p>
    <div className="border border-black/[0.06] rounded-xl bg-white p-4">{children}</div>
  </section>
);

// -----------------------------------------------------------------------------
// (a) Vista General — ficha del HUB reutilizando ops_delegacion_ficha
// -----------------------------------------------------------------------------
const VistaGeneral = () => {
  const { filters, rpcParams } = useOpsFilters();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc("ops_delegacion_ficha" as never, {
        p_delegacion: HUB_DELEGACION, p_from: rpcParams.p_from, p_to: rpcParams.p_to,
      } as never);
      if (!alive) return;
      if (error) console.error("[ops_delegacion_ficha·hub]", error);
      setFicha((data ?? null) as Ficha | null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [rpcParams.p_from, rpcParams.p_to]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
  }
  if (!ficha) {
    return <div className="border border-black/[0.06] rounded-2xl bg-white p-6 text-sm text-ink/50">Sin datos del HUB para el período seleccionado.</div>;
  }

  const tecnicos = ficha.tecnicos ?? [];
  const cerradas = tecnicos.reduce((a, t) => a + t.cerradas, 0);
  const bajas = tecnicos.reduce((a, t) => a + t.bajas, 0);
  const slaW = tecnicos.reduce((a, t) => a + t.pct_sla20 * t.cerradas, 0);
  const sla = cerradas > 0 ? slaW / cerradas : 0;
  const abiertas = (ficha.abiertas_prov ?? []).reduce((a, p) => a + p.abiertas, 0);
  const abiertas30 = (ficha.abiertas_prov ?? []).reduce((a, p) => a + p.abiertas_30, 0);
  const evo = ficha.evolucion ?? [];
  const maxEvo = Math.max(1, ...evo.map((e) => e.cerradas));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric label="Cerradas" value={fmtNum(cerradas)} sub={labelPeriodo(filters.from, filters.to)} />
        <Metric label="Bajas / Cerradas" value={fmtPct(cerradas > 0 ? bajas / cerradas : 0)} sub={`${fmtNum(bajas)} bajas`} />
        <Metric label="SLA ≤20d" value={fmtPct(sla)} sub="Ponderado por cierres" />
        <Metric label="Abiertas +30d" value={`${fmtNum(abiertas30)} / ${fmtNum(abiertas)}`} sub={abiertas > 0 ? `${((abiertas30 / abiertas) * 100).toFixed(1)}% del backlog` : "—"} />
      </div>

      <Section title={`Evolución mensual del HUB — ${etiquetaVentana("hub_evolucion")}`}>
        {evo.length === 0 ? (
          <p className="text-sm text-ink/50">Sin evolución disponible.</p>
        ) : (
          <div className="flex items-end gap-1.5 h-28">
            {evo.map((e) => (
              <div key={e.mes} className="flex-1 flex flex-col items-center gap-1" title={`${e.mes}: ${e.cerradas} cierres`}>
                <div className="w-full bg-ink/70 rounded-t" style={{ height: `${(e.cerradas / maxEvo) * 100}%` }} />
                <span className="text-[9px] text-ink/40 tabular-nums">{String(e.mes).slice(2, 7)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Producción por gama atendida">
        {(ficha.por_gama ?? []).length === 0 ? (
          <p className="text-sm text-ink/50">Sin desglose por gama.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.05]">
                <th className="py-2">Gama</th>
                <th className="py-2 text-right">Cerradas</th>
                <th className="py-2 text-right">% Bajas</th>
                <th className="py-2 text-right">SLA 20d</th>
              </tr>
            </thead>
            <tbody>
              {ficha.por_gama.map((g) => (
                <tr key={g.gama} className="border-b border-black/[0.04]">
                  <td className="py-2 text-ink">{gamaLabel(g.gama)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtNum(g.cerradas)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtPct(g.pct_bajas)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtPct(g.pct_sla20)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Equipo del HUB">
        <p className="text-[12px] text-ink/60 mb-2">{tecnicos.length} técnicos con cierres en el período.</p>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.05]">
              <th className="py-2">Técnico</th>
              <th className="py-2 text-right">Cerradas</th>
              <th className="py-2 text-right">% Bajas</th>
              <th className="py-2 text-right">SLA 20d</th>
            </tr>
          </thead>
          <tbody>
            {tecnicos.slice(0, 15).map((t) => (
              <tr key={t.tecnico} className="border-b border-black/[0.04]">
                <td className="py-2 text-ink">{t.tecnico}</td>
                <td className="py-2 text-right tabular-nums">{fmtNum(t.cerradas)}</td>
                <td className="py-2 text-right tabular-nums">{fmtPct(t.pct_bajas)}</td>
                <td className="py-2 text-right tabular-nums">{fmtPct(t.pct_sla20)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
};

// -----------------------------------------------------------------------------
// (c) Técnicos — scorecard existente con delegación fijada a Central por defecto
// -----------------------------------------------------------------------------
const TecnicosHub = () => {
  const { filters, setFilters } = useOpsFilters();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (!filters.delegacion) setFilters({ delegacion: HUB_DELEGACION });
    // Solo al entrar: después el usuario puede quitar el filtro libremente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <p className="inline-flex items-start gap-2 text-[12px] text-ink/60 border border-black/[0.06] rounded-lg bg-white px-3 py-2">
        <Info className="h-3.5 w-3.5 text-ink/40 mt-0.5 shrink-0" />
        Scorecard filtrado a {HUB_DELEGACION} por defecto. Puedes quitar el filtro de delegación
        en la barra superior para ver toda la plantilla propia.
      </p>
      <Tecnicos />
    </div>
  );
};

// -----------------------------------------------------------------------------
// (d) Rutas & Planificación — data readiness, sin datos inventados
// -----------------------------------------------------------------------------
const SUBVISTAS = ["Vista General", "Paso a Paso", "Mapa", "Optimización", "Programación"];

type Estado = "disponible" | "parcial" | "pendiente";
const REQUISITOS: Array<{ estado: Estado; texto: string }> = [
  { estado: "disponible", texto: "Conjunto de avisos por técnico y día (fecha_primera_visita) — 98% de las OTs de plantilla propia." },
  { estado: "disponible", texto: "Ubicación aproximada por código postal — 65% geocodificable con ops_cp_geo." },
  { estado: "disponible", texto: "Bases operativas con coordenadas (ops_bases)." },
  { estado: "disponible", texto: "Prioridad y antigüedad del aviso, y compromiso de SLA." },
  { estado: "parcial", texto: "Km por técnico y mes: estructura creada en ops_coste_mensual, dato aún sin cargar." },
  { estado: "pendiente", texto: "Horas por visita y secuencia real del día." },
  { estado: "pendiente", texto: "Duración de intervención por tipo de trabajo." },
  { estado: "pendiente", texto: "Jornada y ubicación operativa de inicio/fin de ruta." },
  { estado: "pendiente", texto: "Ventanas horarias comprometidas con el cliente." },
  { estado: "pendiente", texto: "Motivo de desviación respecto a la ruta prevista." },
  { estado: "pendiente", texto: "Km reales por tramo." },
];

const EST_META: Record<Estado, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  disponible: { label: "Disponible hoy", cls: "text-emerald-700", Icon: CheckCircle2 },
  parcial: { label: "Parcial", cls: "text-amber-700", Icon: CircleDashed },
  pendiente: { label: "Pendiente", cls: "text-ink/45", Icon: Circle },
};

const RutasPlanificacion = () => (
  <div className="space-y-6">
    <section className="border border-black/[0.06] rounded-2xl bg-white p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-1">
        Data readiness — Próximamente
      </p>
      <h2 className="font-display text-xl tracking-tight text-ink">Rutas &amp; Planificación</h2>
      <p className="text-[13.5px] text-ink/70 leading-relaxed mt-2 max-w-3xl">
        Capacidad futura para planificar y evaluar el trabajo de campo del HUB: reconstruir el día
        real de cada técnico, comparar la ruta ejecutada con una ruta eficiente, cuantificar el
        tiempo productivo frente al tiempo de desplazamiento y proponer secuencias y ventanas de
        cita coherentes con el SLA. No se publicará ningún mapa ni optimización hasta que los
        datos de visita estén cargados y auditados: no hay estimaciones ni datos simulados.
      </p>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Sub-vistas previstas">
        {SUBVISTAS.map((s) => (
          <span
            key={s}
            aria-disabled="true"
            className="px-3 py-1.5 rounded-full border border-dashed border-black/[0.12] text-[12px] text-ink/40 cursor-not-allowed"
          >
            {s}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-ink/40 mt-2">Sub-vistas previstas — deshabilitadas hasta disponer del dato.</p>
    </section>

    <section className="border border-black/[0.06] rounded-2xl bg-white p-6">
      <h3 className="font-display text-lg tracking-tight text-ink mb-1">Preparación de datos</h3>
      <p className="text-xs text-ink/50 mb-4">Estado real verificado de cada requisito sobre el modelo actual.</p>
      <ul className="space-y-2">
        {REQUISITOS.map((r) => {
          const m = EST_META[r.estado];
          return (
            <li key={r.texto} className="flex items-start gap-2.5 text-[13px]">
              <m.Icon className={`h-4 w-4 mt-0.5 shrink-0 ${m.cls}`} strokeWidth={1.75} />
              <span className="text-ink/75">
                <span className={`font-medium ${m.cls}`}>{m.label}:</span> {r.texto}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-[11.5px] text-ink/50 mt-4 leading-relaxed">
        Nota de privacidad: para el punto de inicio y fin de jornada se usará siempre la
        <strong className="text-ink/70"> ubicación operativa</strong>, nunca el domicilio del
        técnico visible sin un rol expresamente autorizado.
      </p>
    </section>

    <section className="border border-black/[0.06] rounded-2xl bg-white p-6">
      <h3 className="font-display text-lg tracking-tight text-ink mb-1">Modelo futuro: ops_visitas</h3>
      <p className="text-[13px] text-ink/70 leading-relaxed max-w-3xl">
        Granularidad: <strong className="text-ink">1 registro = 1 visita física de un recurso sobre una OT</strong>,
        con <code className="text-[12px] bg-black/[0.04] px-1 py-0.5 rounded">visita_id</code> propio y
        secuencia dentro de la OT. La combinación <code className="text-[12px] bg-black/[0.04] px-1 py-0.5 rounded">num_ot + fecha</code> NUNCA
        es clave única: una misma OT puede tener varias visitas, incluso el mismo día.
      </p>
      <p className="text-[13px] text-ink/70 leading-relaxed mt-3 max-w-3xl">
        Esta tabla servirá simultáneamente a Rutas, FTF (first time fix), reincidencias,
        visitas por OT, duraciones de intervención, productividad real y retrabajo — evitando
        crear una fuente distinta para cada indicador.
      </p>
    </section>
  </div>
);

// -----------------------------------------------------------------------------
const Hub = () => {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: TabKey = isTab(raw) ? raw : "general";

  const setTab = (t: TabKey) => {
    const next = new URLSearchParams(params);
    if (t === "general") next.delete("tab"); else next.set("tab", t);
    setParams(next, { replace: true });
  };

  const content = useMemo(() => {
    switch (tab) {
      case "equipos": return <EquiposComparativa soloCentral />;
      case "tecnicos": return <TecnicosHub />;
      case "rutas": return <RutasPlanificacion />;
      default: return <VistaGeneral />;
    }
  }, [tab]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-1">
          Operación de servicio
        </p>
        <h1 className="font-display text-2xl md:text-3xl tracking-tight text-ink">
          HUB Central San Agustín
        </h1>
        <p className="text-sm text-ink/55 mt-1">
          Unidad operativa de taller y equipos de gama. Las delegaciones territoriales se analizan
          en su propia sección.
        </p>
      </header>
      <DataAsOf />

      <div role="tablist" aria-label="Secciones del HUB" className="flex flex-wrap gap-1.5 border-b border-black/[0.06] pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-[13px] transition-colors ${
              tab === t.key
                ? "bg-ink text-bone"
                : "text-ink/60 hover:text-ink hover:bg-black/[0.04]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {content}
    </div>
  );
};

export default Hub;
