import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDataQuality } from "@/hooks/useDataQuality";
import {
  AVISO_NO_CUMPLIMIENTO,
  DOMINIOS_CONTRACTUALES,
  GLIFO_DOMINIO,
  LABEL_ESTADO_DOMINIO,
  frescura,
  readinessRegla,
  resumenReadiness,
  universosPorCliente,

  type DominioDato,
  type EstadoDominio,
} from "@/lib/ops-data-quality";
import { LABEL_CONSECUENCIA, consecuenciaDeclarada, type ReglaSla } from "@/lib/ops-contractual";
import { resumenAliases, type ClienteAlias } from "@/lib/ops-cliente-alias";
import { LABEL_FRESCURA_DOMINIO, fmtFechaEs } from "@/lib/ops-as-of";
import { useDataFreshness } from "@/hooks/useDataFreshness";
import { FIXTURES_REGISTRY, AVISO_FIXTURES } from "@/lib/ops-contractual-fixtures";

import { Loader2, AlertTriangle, Lock, Info } from "lucide-react";
import { PLANTILLAS, TABLE_LABEL, type OpsTable } from "@/lib/ops-csv";

const pct = (v: number | null | undefined) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
const num = (v: number) => v.toLocaleString("es-ES");

const ORDEN_ESTADO: Record<EstadoDominio, number> = { pendiente: 0, parcial: 1, disponible: 2 };

const EstadoPill = ({ estado }: { estado: EstadoDominio }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-black/[0.08] px-2 py-0.5 text-[11px] text-ink/60">
    <span aria-hidden>{GLIFO_DOMINIO[estado]}</span>
    {LABEL_ESTADO_DOMINIO[estado]}
  </span>
);

const Barra = ({ v }: { v: number }) => (
  <div className="h-1.5 w-24 rounded-full bg-black/[0.06]" aria-hidden>
    <div className="h-full rounded-full bg-ink/40" style={{ width: `${Math.max(2, Math.min(100, v * 100))}%` }} />
  </div>
);

const Seccion = ({ id, titulo, sub, children }: { id: string; titulo: string; sub?: string; children: React.ReactNode }) => (
  <section id={id} className="border border-black/[0.06] rounded-2xl p-6">
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70">{titulo}</h2>
    {sub && <p className="mt-1 text-[13px] text-ink/50 max-w-3xl">{sub}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

const CalidadDatos = () => {
  const { loading, medidas, dominios } = useDataQuality();
  const { todos: frescuras } = useDataFreshness();
  const [reglas, setReglas] = useState<ReglaSla[] | null>(null);
  const [aliases, setAliases] = useState<ClienteAlias[]>([]);

  useEffect(() => {
    let vivo = true;
    supabase
      .from("ops_sla_registry" as never)
      .select("*")
      .then(({ data, error }) => {
        if (!vivo) return;
        setReglas(error || !data ? [...FIXTURES_REGISTRY] : (data as unknown as ReglaSla[]));
      });
    supabase
      .from("ops_cliente_contrato_alias" as never)
      .select("*")
      .then(({ data, error }) => {
        if (!vivo) return;
        setAliases(error || !data ? [] : (data as unknown as ClienteAlias[]));
      });
    return () => {
      vivo = false;
    };
  }, []);

  const reglasEfectivas = reglas ?? [];
  const fresc = medidas ? frescura(medidas) : null;

  const dominiosOrdenados = useMemo(
    () => [...dominios].sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || a.dominio.localeCompare(b.dominio)),
    [dominios],
  );

  const campos = useMemo(() => {
    if (!medidas) return [];
    return Object.entries(medidas.campos_fact_ot).sort((a, b) => a[1] - b[1]);
  }, [medidas]);

  const universos = useMemo(
    () => (medidas && reglasEfectivas.length ? universosPorCliente(medidas, aliases, reglasEfectivas) : null),
    [medidas, aliases, reglasEfectivas],
  );

  const ctxReadiness = useMemo(() => ({ universos }), [universos]);

  const readiness = useMemo(
    () => (medidas && reglasEfectivas.length ? resumenReadiness(reglasEfectivas, medidas, ctxReadiness) : null),
    [medidas, reglasEfectivas, ctxReadiness],
  );


  const resumen = useMemo(() => {
    const valores = medidas?.clientes_erp;
    if (!valores?.length) return null;
    return resumenAliases(
      valores.map((v) => ({ cliente_wg: v.cliente_wg, ots: v.ots })),
      aliases,
      reglasEfectivas.map((r) => ({ cliente: r.cliente, cliente_wg_patron: r.cliente_wg_patron, programa: r.programa })),
    );
  }, [medidas, aliases, reglasEfectivas]);


  const gaps = dominiosOrdenados.filter((d) => d.estado !== "disponible");

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink/40 py-20 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Midiendo la calidad del dato…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <header className="border border-black/[0.06] rounded-2xl p-6">
        <h1 className="heading-display text-2xl">Calidad de datos</h1>
        <p className="mt-2 text-[13px] text-ink/55 max-w-3xl">
          Estado real de cada dominio de dato, medido sobre el origen cargado. Ningún estado está escrito a mano: todos se
          derivan de la cobertura observada en <code className="text-[12px]">ops_fact_ot</code> y de la existencia de las
          fuentes auxiliares.
        </p>
        {medidas && (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-[13px]">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink/40">OTs cargadas</dt>
              <dd className="text-ink tabular-nums">{num(medidas.fact_ot.filas)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink/40">Rango de datos</dt>
              <dd className="text-ink tabular-nums">
                {medidas.fact_ot.min_fecha_creacion} → {medidas.fact_ot.max_fecha_creacion}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink/40">Frescura</dt>
              <dd className="text-ink">{fresc?.dias == null ? "Desconocida" : `Hace ${fresc.dias} día(s)`}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink/40">Reglas en el Registry</dt>
              <dd className="text-ink tabular-nums">{medidas.registry_reglas}</dd>
            </div>
          </dl>
        )}
        {fresc?.estado === "envejecido" && (
          <p className="mt-3 flex items-start gap-2 text-[12px] text-ink/60">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {fresc.texto} Las conclusiones del período más reciente pueden estar incompletas.
          </p>
        )}
        {!medidas && (
          <p className="mt-3 flex items-start gap-2 text-[12px] text-ink/60">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            No se han podido leer las medidas reales: se muestra el estado conservador por defecto, en el que ningún dominio
            se declara disponible.
          </p>
        )}
      </header>

      {/* F4B · Frescura por dominio: fecha efectiva del dato, no fecha de carga */}
      <Seccion
        id="frescura"
        titulo="Frescura por dominio"
        sub="Cada dominio declara su fecha efectiva (hasta cuándo el dato refleja la realidad operativa). Las antigüedades y el backlog se miden contra esa fecha, nunca contra hoy."
      >
        {frescuras.length === 0 ? (
          <p className="text-[13px] text-ink/50">Sin registros de carga: no hay fecha efectiva declarada para ningún dominio.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-ink/40 border-b border-black/[0.06]">
                  <th className="py-2 pr-4 font-medium">Dominio</th>
                  <th className="py-2 pr-4 font-medium">Fecha efectiva</th>
                  <th className="py-2 pr-4 font-medium">Desfase</th>
                  <th className="py-2 pr-4 font-medium">Estado</th>
                  <th className="py-2 pr-4 font-medium text-right">Filas</th>
                  <th className="py-2 font-medium">Fuente</th>
                </tr>
              </thead>
              <tbody>
                {frescuras.map((f) => (
                  <tr key={f.dominio} className="border-b border-black/[0.04]">
                    <td className="py-2.5 pr-4 text-ink">{f.label}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-ink/70">{fmtFechaEs(f.asOf)}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-ink/55">{f.dias == null ? "—" : `${f.dias} d`}</td>
                    <td className="py-2.5 pr-4">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-black/[0.08] px-2 py-0.5 text-[11px] text-ink/60">
                        <span
                          aria-hidden
                          className={`h-1.5 w-1.5 rounded-full ${
                            f.estado === "desactualizado"
                              ? "bg-red-500"
                              : f.estado === "aceptable"
                                ? "bg-amber-500"
                                : f.estado === "sin_dato"
                                  ? "bg-ink/25"
                                  : "bg-emerald-500"
                          }`}
                        />
                        {LABEL_FRESCURA_DOMINIO[f.estado]}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-ink/55 text-right">{num(f.filas)}</td>
                    <td className="py-2.5 text-ink/45">{f.fuente ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[12px] text-ink/45">
          Fresco ≤ 7 días · Aceptable ≤ 31 días · Desactualizado &gt; 31 días. Un dominio sin fecha efectiva no se puede cruzar
          con el resto sin declarar el desfase.
        </p>
      </Seccion>



      {/* Matriz de dominios */}
      <Seccion
        id="dominios"
        titulo="Matriz de dominios de dato"
        sub="Un dominio es disponible solo si su medida alcanza la cobertura exigida. Cada fila declara qué KPIs quedan bloqueados mientras no lo esté."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-ink/40 border-b border-black/[0.06]">
                <th className="py-2 pr-4 font-medium">Dominio</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 font-medium">Fuente</th>
                <th className="py-2 pr-4 font-medium">Cobertura</th>
                <th className="py-2 pr-4 font-medium">Medida observada</th>
                <th className="py-2 font-medium">KPIs bloqueados</th>
              </tr>
            </thead>
            <tbody>
              {dominiosOrdenados.map((d: DominioDato) => (
                <tr key={d.id} className="border-b border-black/[0.04] align-top">
                  <td className="py-2.5 pr-4 text-ink">{d.dominio}</td>
                  <td className="py-2.5 pr-4"><EstadoPill estado={d.estado} /></td>
                  <td className="py-2.5 pr-4 text-ink/50">{d.fuente ?? "—"}</td>
                  <td className="py-2.5 pr-4">
                    {d.cobertura == null ? (
                      <span className="text-ink/40">—</span>
                    ) : (
                      <span className="flex items-center gap-2 tabular-nums text-ink/70">
                        {pct(d.cobertura)} <Barra v={d.cobertura} />
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-ink/55 max-w-md">{d.medida ?? d.detalle}</td>
                  <td className="py-2.5 text-ink/45">{d.kpisBloqueados.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      {/* Cobertura campo a campo */}
      {medidas && (
        <Seccion
          id="campos"
          titulo="Cobertura campo a campo de ops_fact_ot"
          sub={`Porcentaje de OTs con valor informado, sobre ${num(medidas.fact_ot.filas)} filas. Ordenado de peor a mejor.`}
        >
          <div className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {campos.map(([campo, cob]) => (
              <div key={campo} className="flex items-center justify-between gap-3 border-b border-black/[0.04] py-1.5 text-[13px]">
                <span className="text-ink/70 truncate">{campo}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <Barra v={cob} />
                  <span className="tabular-nums text-ink/60 w-14 text-right">{pct(cob)}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-black/[0.06] pt-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-ink/40 mb-2">Campos que no existen en el origen</p>
            <div className="flex flex-wrap gap-1.5">
              {medidas.campos_ausentes_fact_ot.map((c) => (
                <span key={c} className="rounded-full border border-black/[0.06] px-2.5 py-1 text-[12px] text-ink/45">
                  <span aria-hidden className="mr-1">○</span>{c}
                </span>
              ))}
            </div>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3 border-t border-black/[0.06] pt-4 text-[13px]">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink/40">RRHH (ops_rrhh)</dt>
              <dd className="text-ink/70">{num(medidas.rrhh.filas)} filas · {medidas.rrhh.meses} meses · último {medidas.rrhh.ultimo_mes ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink/40">Coste mensual</dt>
              <dd className="text-ink/70">{num(medidas.coste_mensual.filas)} filas · {medidas.coste_mensual.meses} meses · último {medidas.coste_mensual.ultimo_mes ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink/40">Geocodificación</dt>
              <dd className="text-ink/70">
                {num(medidas.geo.ots_domicilio_geocodificables)} de {num(medidas.geo.ots_domicilio)} OTs a domicilio ({pct(medidas.geo.pct_geocodificable)})
              </dd>
            </div>
          </dl>
        </Seccion>
      )}

      {/* Contractual data readiness */}
      <Seccion
        id="readiness"
        titulo="Contractual data readiness"
        sub="Qué reglas del Registry serían medibles hoy con los datos existentes, y qué falta exactamente para cada una."
      >
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-black/[0.08] bg-black/[0.015] p-3 text-[12px] text-ink/60">
          <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {AVISO_NO_CUMPLIMIENTO}
        </p>
        {readiness && (
          <>
            <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5 text-[13px] mb-4">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-ink/40">Reglas modeladas</dt>
                <dd className="text-ink tabular-nums text-lg">{readiness.total}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-ink/40">Medibles hoy</dt>
                <dd className="text-ink tabular-nums text-lg">{readiness.porMedibilidad.medible}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-ink/40">Medibles parciales</dt>
                <dd className="text-ink tabular-nums text-lg">{readiness.porMedibilidad.parcial}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-ink/40">Bloqueadas</dt>
                <dd className="text-ink tabular-nums text-lg">{readiness.porMedibilidad.pendiente}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-ink/40">Extraídas del contrato</dt>
                <dd className="text-ink tabular-nums text-lg">
                  {readiness.porExtraccion.extraida_contrato}
                  <span className="text-[12px] text-ink/45"> / {readiness.total}</span>
                </dd>
              </div>
            </dl>
            <p className="mb-4 text-[12px] text-ink/50">
              Tres estados independientes: <strong className="font-medium text-ink/70">extracción</strong> (el valor está
              sacado del contrato), <strong className="font-medium text-ink/70">validación</strong> (
              {Object.entries(readiness.porValidacion).map(([k, v]) => `${v} ${k}`).join(" · ")}) y{" "}
              <strong className="font-medium text-ink/70">medibilidad técnica</strong>, que se deriva aquí y nunca se
              almacena.
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-ink/40 mb-2">Bloqueos más frecuentes</p>
            <ul className="space-y-1 text-[13px] text-ink/60 mb-5">
              {readiness.bloqueosTop.slice(0, 8).map((b) => (
                <li key={b.clave}>
                  <span className="tabular-nums text-ink/80 mr-2">×{b.n}</span>{b.motivo}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-ink/40 border-b border-black/[0.06]">
                <th className="py-2 pr-4 font-medium">Cliente · programa</th>
                <th className="py-2 pr-4 font-medium">Indicador</th>
                <th className="py-2 pr-4 font-medium">Extracción</th>
                <th className="py-2 pr-4 font-medium">Medibilidad</th>
                <th className="py-2 pr-4 font-medium">Universo cliente (OTs)</th>
                <th className="py-2 pr-4 font-medium">Cobertura evento</th>
                <th className="py-2 font-medium">Qué falta</th>
              </tr>
            </thead>
            <tbody>
              {medidas &&
                reglasEfectivas.map((r, i) => {
                  const rd = readinessRegla(r, medidas, ctxReadiness);
                  return (
                    <tr key={r.id ?? `${r.cliente}-${i}`} className="border-b border-black/[0.04] align-top">
                      <td className="py-2.5 pr-4 text-ink">
                        {r.cliente}
                        <span className="block text-[12px] text-ink/45">{r.programa}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-ink/70">{r.kpi}</td>
                      <td className="py-2.5 pr-4 text-ink/55">
                        {r.estado_extraccion === "extraida_contrato" ? "Extraída" : "Pendiente de extraer"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <EstadoPill
                          estado={
                            rd.medibilidad === "medible" ? "disponible" : rd.medibilidad === "parcial" ? "parcial" : "pendiente"
                          }
                        />
                      </td>
                      <td className="py-2.5 pr-4 text-ink/70 tabular-nums">
                        {rd.universoCliente == null ? "Sin resolver" : num(rd.universoCliente)}
                      </td>
                      <td className="py-2.5 pr-4 text-ink/55 tabular-nums">
                        {rd.coberturaEventos == null ? "—" : `${pct(rd.coberturaEventos)} · ${rd.estadoCobertura}`}
                        <span className="block text-[11px] text-ink/40">
                          {rd.fuenteCobertura === "cliente" ? "universo del cliente" : "cobertura global, no por cliente"}
                        </span>
                      </td>

                      <td className="py-2.5 text-ink/55">
                        <ul className="space-y-0.5">
                          {rd.bloqueos.map((b, j) => <li key={j}>{b.motivo}</li>)}
                        </ul>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Seccion>

      {/* Aliases cliente ERP → contrato */}
      <Seccion
        id="aliases"
        titulo="Clientes ERP → cliente contractual"
        sub="El nombre del cliente en el ERP no es el cliente del contrato. La correspondencia es explícita y auditable: el patrón del Registry solo actúa como fallback provisional."
      >
        {resumen ? (
          <>
            <p className="mb-4 text-[12px] text-ink/55">
              {num(resumen.valoresSinResolver)} valores de <code className="text-[12px]">cliente_wg</code> sin cliente
              contractual asignado ({num(resumen.otsSinResolver)} OTs). Esas OTs quedan fuera de cualquier medición
              contractual: no se reparten ni se estiman.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-ink/40 border-b border-black/[0.06]">
                    <th className="py-2 pr-4 font-medium">Cliente contractual</th>
                    <th className="py-2 pr-4 font-medium">Valores por alias</th>
                    <th className="py-2 pr-4 font-medium">Valores por patrón (provisional)</th>
                    <th className="py-2 font-medium">OTs</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.porCliente.map((c) => (
                    <tr key={c.cliente_contractual} className="border-b border-black/[0.04]">
                      <td className="py-2.5 pr-4 text-ink">{c.cliente_contractual}</td>
                      <td className="py-2.5 pr-4 text-ink/70 tabular-nums">{c.valoresPorAlias}</td>
                      <td className="py-2.5 pr-4 text-ink/70 tabular-nums">{c.valoresPorPatron}</td>
                      <td className="py-2.5 text-ink/70 tabular-nums">{num(c.ots)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-[13px] text-ink/50">Sin medida de clientes ERP disponible.</p>
        )}
      </Seccion>


      {/* Registry */}
      <Seccion
        id="registry"
        titulo="SLA & Contractual Registry"
        sub="Capa de reglas que traduce cada contrato a algo medible. No es gestión documental de contratos."
      >
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 text-[12px] text-ink/70">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {AVISO_FIXTURES}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-ink/40 border-b border-black/[0.06]">
                <th className="py-2 pr-4 font-medium">Cliente</th>
                <th className="py-2 pr-4 font-medium">Programa</th>
                <th className="py-2 pr-4 font-medium">Indicador</th>
                <th className="py-2 pr-4 font-medium">Reloj</th>
                <th className="py-2 pr-4 font-medium">Objetivo</th>
                <th className="py-2 pr-4 font-medium">Medición</th>
                <th className="py-2 pr-4 font-medium">Consecuencia</th>
                <th className="py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reglasEfectivas.map((r, i) => {
                const c = consecuenciaDeclarada(r);
                return (
                  <tr key={r.id ?? `${r.cliente}-reg-${i}`} className="border-b border-black/[0.04] align-top">
                    <td className="py-2.5 pr-4 text-ink">{r.cliente}</td>
                    <td className="py-2.5 pr-4 text-ink/55">{r.programa}</td>
                    <td className="py-2.5 pr-4 text-ink/70">{r.kpi}</td>
                    <td className="py-2.5 pr-4 text-ink/55 whitespace-nowrap">{r.evento_inicio} → {r.evento_fin}</td>
                    <td className="py-2.5 pr-4 text-ink/70 whitespace-nowrap tabular-nums">
                      {r.target == null ? <span className="text-ink/40">Sin SLA cuantificado</span> : `${r.target} ${r.unidad.replace("_", " ")}`}
                      {r.hard_limit != null && <span className="block text-[12px] text-ink/45">límite duro {r.hard_limit}</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-ink/55">
                      {r.regla_medicion} · {r.ventana_medicion}
                      {r.umbral_agregado != null && <span className="block text-[12px] text-ink/45">umbral {pct(r.umbral_agregado)}</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-ink/55">
                      {LABEL_CONSECUENCIA[r.tipo_consecuencia]}
                      <span className="block text-[12px] text-ink/40">{c.cuantificable ? "Cuantificable" : "Pendiente de cuantificar"}</span>
                    </td>
                    <td className="py-2.5 text-ink/45">{r.estado_regla}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Seccion>

      {/* Plantillas de carga */}
      <Seccion
        id="plantillas"
        titulo="Plantillas de carga"
        sub="Cabeceras exactas que acepta el importador. El orden es indiferente, el nombre no. La carga es idempotente: repetir un fichero actualiza, no duplica."
      >
        <div className="space-y-4">
          {(Object.keys(PLANTILLAS) as OpsTable[]).map((t) => (
            <div key={t} className="border-b border-black/[0.04] pb-4 last:border-0">
              <p className="text-[13px] font-medium text-ink">{TABLE_LABEL[t]}</p>
              <p className="mt-1 font-mono text-[11px] text-ink/55 break-all leading-relaxed">
                {PLANTILLAS[t].join(",")}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-ink/45">
          Cargar en <Link to="/operaciones/importar" className="underline underline-offset-2">Importar CSV</Link>.
          Fechas dd/mm/aaaa o aaaa-mm-dd; decimales con coma o punto; separador , o ;.
        </p>
      </Seccion>

      {/* Data gap register */}
      <Seccion
        id="gaps"
        titulo="Data gap register"
        sub="Cada hueco de dato, qué desbloquea y qué decisión permitiría tomar. Sin fechas comprometidas: la prioridad la fija management."
      >
        <ul className="space-y-3 text-[13px]">
          {gaps.map((d) => (
            <li key={d.id} className="border-b border-black/[0.04] pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-ink font-medium">{d.dominio}</span>
                <EstadoPill estado={d.estado} />
                {DOMINIOS_CONTRACTUALES.includes(d.id) && (
                  <span className="rounded-full border border-black/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ink/45">
                    Bloquea cumplimiento contractual
                  </span>
                )}
              </div>
              <p className="mt-1 text-ink/55">{d.medida ?? d.detalle}</p>
              <p className="mt-0.5 text-ink/45">Desbloquea: {d.kpisBloqueados.join(" · ")}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-start gap-2 text-[12px] text-ink/45">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Mientras un dominio no esté disponible, los módulos afectados muestran el hueco de forma explícita en lugar de
          estimar. Ver <Link to="/operaciones" className="underline underline-offset-2">Panorama</Link>.
        </p>
      </Seccion>
    </div>
  );
};

export default CalidadDatos;
