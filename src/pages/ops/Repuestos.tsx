import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOpsFilters, fmtNum, fmtDec, fmtPct } from "@/lib/ops-filters";
import { labelPeriodo } from "@/lib/ops-performance";
import { gamaDisplayMap } from "@/lib/ops-gamas";
import { useDataQuality } from "@/hooks/useDataQuality";
import { ETIQUETA_REFERENCIA_OPERATIVA } from "@/lib/ops-panorama";
import { PLANTILLAS, cabeceraPlantilla } from "@/lib/ops-csv";
import { resumenAliases, type ClienteAlias } from "@/lib/ops-cliente-alias";
import { FIXTURES_REGISTRY } from "@/lib/ops-contractual-fixtures";
import type { ReglaSla } from "@/lib/ops-contractual";
import {
  BUCKETS_ANTIGUEDAD,
  DESC_EXPOSICION,
  GLIFO_FUENTE,
  LABEL_EXPOSICION,
  LABEL_FUENTE,
  compararConSinPieza,
  exposicionContractualPieza,
  hallazgosImpactoPieza,
  lineaEjecutivaRepuestos,
  normalizarSupply,
  pctTrazabilidad,
  readinessCadena,
  type EntidadDemanda,
  type EntidadPte,
  type SupplyPayload,
} from "@/lib/ops-supply";
import { AlertTriangle, Info, Loader2, RefreshCw } from "lucide-react";

type Vista = "cliente" | "gama" | "delegacion" | "sat" | "provincia";
const VISTAS: { key: Vista; label: string }[] = [
  { key: "cliente", label: "Cliente" },
  { key: "gama", label: "Gama" },
  { key: "delegacion", label: "Delegación" },
  { key: "sat", label: "SAT" },
  { key: "provincia", label: "Provincia" },
];

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{children}</p>
);

const Card = ({ label, value, hint, def }: { label: string; value: string; hint?: string; def?: string }) => (
  <div className="rounded-xl border border-black/[0.06] bg-white p-4" title={def}>
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
    <p className="mt-2 heading-display text-3xl text-ink">{value}</p>
    {hint && <p className="mt-1 text-[11px] text-ink/50 leading-snug">{hint}</p>}
  </div>
);

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-black/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ink/60 whitespace-nowrap">
    {children}
  </span>
);

const fmtPp = (d: number | null) => (d == null ? "—" : `${d >= 0 ? "+" : ""}${(d * 100).toFixed(1)} pp`);

export default function OpsRepuestos() {
  const { filters, rpcParams, prevRange, sinComparable } = useOpsFilters();
  const { dominio } = useDataQuality();
  const [data, setData] = useState<SupplyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [vistaA, setVistaA] = useState<Vista>("cliente");
  const [vistaB, setVistaB] = useState<Vista>("cliente");
  const [reglas, setReglas] = useState<ReglaSla[]>([...FIXTURES_REGISTRY]);
  const [aliases, setAliases] = useState<ClienteAlias[]>([]);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const id = ++reqIdRef.current;
    setLoading(true);
    setErrorMsg(null);
    void (async () => {
      const { data: d, error } = await supabase.rpc("ops_supply" as never, {
        ...rpcParams,
        p_prev_from: prevRange.from,
        p_prev_to: prevRange.to,
      } as never);
      if (id !== reqIdRef.current) return;
      if (error) {
        console.error("[ops_supply]", error);
        setErrorMsg(error.message);
        setData(null);
      } else {
        setData(normalizarSupply(d));
      }
      setLoading(false);
    })();
  }, [rpcParams, prevRange.from, prevRange.to, reloadKey]);

  useEffect(() => {
    let vivo = true;
    void supabase
      .from("ops_sla_registry" as never)
      .select("*")
      .then(({ data: d, error }) => {
        if (!vivo || error || !d) return;
        setReglas(d as unknown as ReglaSla[]);
      });
    void supabase
      .from("ops_cliente_contrato_alias" as never)
      .select("*")
      .then(({ data: d, error }) => {
        if (!vivo || error || !d) return;
        setAliases(d as unknown as ClienteAlias[]);
      });
    return () => { vivo = false; };
  }, []);

  const etiqueta = labelPeriodo(filters.from, filters.to);
  const hayComparable = !sinComparable;

  const linea = useMemo(
    () => (data ? lineaEjecutivaRepuestos(data, etiqueta, hayComparable) : null),
    [data, etiqueta, hayComparable],
  );
  const cadena = useMemo(() => (data ? readinessCadena(data.cadena) : []), [data]);
  const cmp = useMemo(() => (data ? compararConSinPieza(data.conversion) : null), [data]);
  const hallazgos = useMemo(() => (cmp ? hallazgosImpactoPieza(cmp) : []), [cmp]);
  const exposicion = useMemo(
    () => (data ? exposicionContractualPieza(data.exposicion_pieza, aliases, reglas) : []),
    [data, aliases, reglas],
  );
  const gamaLabel = useMemo(
    () => gamaDisplayMap(data?.pieza_demanda.por_gama.map((g) => g.entidad) ?? []),
    [data],
  );

  const etiquetaEntidad = (v: Vista, e: string) => (v === "gama" ? gamaLabel.get(e) ?? e : e);
  const listaDemanda = (v: Vista): EntidadDemanda[] => {
    const d = data?.pieza_demanda;
    if (!d) return [];
    return { cliente: d.por_cliente, gama: d.por_gama, delegacion: d.por_delegacion, sat: d.por_sat, provincia: d.por_provincia }[v];
  };
  const listaPte = (v: Vista): EntidadPte[] => {
    const p = data?.pte_piezas_actual;
    if (!p) return [];
    return { cliente: p.por_cliente, gama: p.por_gama, delegacion: p.por_delegacion, sat: p.por_sat, provincia: p.por_provincia }[v];
  };

  const domStock = dominio("stock");
  const domSolicitudes = dominio("repuestos_solicitudes");

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-ink/40 py-20 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando cadena de suministro…
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-2xl p-6 space-y-3">
        <p className="text-sm text-amber-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> No se ha podido cargar el módulo de repuestos.
        </p>
        {errorMsg && <p className="text-xs text-amber-800 font-mono break-all">{errorMsg}</p>}
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-2 text-xs rounded-full border border-amber-300 px-3 py-1.5 text-amber-900 hover:bg-amber-100"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reintentar
        </button>
      </div>
    );
  }

  const dem = data.pieza_demanda;
  const pte = data.pte_piezas_actual;
  const traz = pctTrazabilidad(data.cadena);
  const deltaPct =
    hayComparable && dem.pct != null && data.pieza_demanda_prev.pct != null
      ? dem.pct - data.pieza_demanda_prev.pct
      : null;

  return (
    <div className="space-y-10">
      <header>
        <Eyebrow>Supply &amp; Fulfilment</Eyebrow>
        <h1 className="heading-display text-3xl md:text-4xl text-ink mt-1">Repuestos &amp; Stock</h1>
        <p className="mt-3 text-[13px] text-ink/70 max-w-4xl leading-relaxed">{linea}</p>
      </header>

      {/* A — DEMANDA DE PIEZA */}
      <section>
        <Eyebrow>A · Demanda de pieza</Eyebrow>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="OTs creadas" value={fmtNum(dem.ots)} hint="Período y filtros activos, sin OTs anuladas." />
          <Card label="OTs con pieza" value={fmtNum(dem.con_pieza)} hint="Flag tiene_piezas en la OT." />
          <Card label="% con pieza" value={fmtPct(dem.pct)} hint={hayComparable ? `vs período anterior: ${fmtPp(deltaPct)}` : "Sin período comparable."} />
          <Card
            label="Trazabilidad de la cadena"
            value={traz == null ? "—" : fmtPct(traz)}
            hint={traz == null ? "Pendiente: ops_pieza_solicitud está vacía." : "OTs con pieza que tienen solicitud registrada."}
          />
        </div>

        <div className="mt-4 rounded-xl border border-black/[0.06] bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-black/[0.06] flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-ink flex-1">Demanda por entidad</p>
            {VISTAS.map((v) => (
              <button
                key={v.key}
                onClick={() => setVistaA(v.key)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  vistaA === v.key ? "bg-ink text-bone border-ink" : "border-black/[0.12] text-ink/60 hover:border-ink/40"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-black/[0.02]">
                <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-ink/40">
                  <th className="px-4 py-2 font-semibold">{VISTAS.find((v) => v.key === vistaA)?.label}</th>
                  <th className="px-4 py-2 font-semibold text-right">OTs</th>
                  <th className="px-4 py-2 font-semibold text-right">Con pieza</th>
                  <th className="px-4 py-2 font-semibold text-right">% con pieza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {listaDemanda(vistaA).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-ink/40">Sin datos con los filtros activos.</td></tr>
                )}
                {listaDemanda(vistaA).slice(0, 25).map((e) => (
                  <tr key={e.entidad}>
                    <td className="px-4 py-2">{etiquetaEntidad(vistaA, e.entidad)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(e.ots)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(e.con_pieza)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink/60">{fmtPct(e.pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* B — ESPERANDO PIEZA AHORA */}
      <section id="esperando-pieza">
        <Eyebrow>B · Esperando pieza ahora</Eyebrow>
        <p className="mt-2 text-[12px] text-ink/50 max-w-3xl">
          OTs abiertas cuya <strong className="text-ink/70">etapa actual</strong> es «PTE. PIEZAS». La antigüedad es la
          de la OT desde su creación, <strong className="text-ink/70">no el tiempo que lleva en esta etapa</strong>:
          sin historial de estados ese dato no existe.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="OTs en PTE. PIEZAS" value={fmtNum(pte.n)} hint={`${fmtPct(pte.abiertas_total ? pte.n / pte.abiertas_total : null)} del backlog abierto.`} />
          <Card label="Antigüedad media" value={pte.edad_media == null ? "—" : `${fmtDec(pte.edad_media, 1)} d`} hint="Desde fecha de creación de la OT." />
          <Card label="Más de 30 días" value={fmtNum(pte.n30)} hint="Tramo con riesgo de envejecimiento crítico." />
          <Card
            label="Foto del período anterior"
            value={hayComparable ? fmtNum(pte.n_prev) : "—"}
            hint={hayComparable ? `Backlog en PTE. PIEZAS a ${prevRange.to} (la cifra principal es la foto de hoy).` : "Sin período comparable."}
          />
        </div>

        <div className="mt-4 rounded-xl border border-black/[0.06] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Buckets de antigüedad</p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {BUCKETS_ANTIGUEDAD.map((b) => (
              <div key={b} className="rounded-lg border border-black/[0.06] px-3 py-2">
                <p className="text-[10px] text-ink/40">{b} d</p>
                <p className="tabular-nums text-lg text-ink">{fmtNum(pte.buckets[b] ?? 0)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-black/[0.06] bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-black/[0.06] flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-ink flex-1">Espera de pieza por entidad</p>
            {VISTAS.map((v) => (
              <button
                key={v.key}
                onClick={() => setVistaB(v.key)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  vistaB === v.key ? "bg-ink text-bone border-ink" : "border-black/[0.12] text-ink/60 hover:border-ink/40"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-black/[0.02]">
                <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-ink/40">
                  <th className="px-4 py-2 font-semibold">{VISTAS.find((v) => v.key === vistaB)?.label}</th>
                  <th className="px-4 py-2 font-semibold text-right">OTs</th>
                  <th className="px-4 py-2 font-semibold text-right">Antigüedad media</th>
                  <th className="px-4 py-2 font-semibold text-right">&gt;30 d</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {listaPte(vistaB).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-ink/40">Ninguna OT en PTE. PIEZAS con los filtros activos.</td></tr>
                )}
                {listaPte(vistaB).slice(0, 25).map((e) => (
                  <tr key={e.entidad}>
                    <td className="px-4 py-2">{etiquetaEntidad(vistaB, e.entidad)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(e.n)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink/60">{e.edad_media == null ? "—" : `${fmtDec(e.edad_media, 1)} d`}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink/60">{fmtNum(e.n30)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-black/[0.06]">
            <Link to="/operaciones/sla" className="text-[12px] text-ink underline underline-offset-2 hover:text-ink/70">
              Ver el envejecimiento completo en SLA &amp; Flujo →
            </Link>
          </div>
        </div>
      </section>

      {/* C — IMPACTO EN RESOLUCIÓN */}
      <section>
        <Eyebrow>C · Impacto en la resolución</Eyebrow>
        <p className="mt-2 text-[12px] text-ink/50 max-w-3xl">
          OTs cerradas en el período, con pieza frente a sin pieza. El indicador ≤20 días es{" "}
          <strong className="text-ink/70">{ETIQUETA_REFERENCIA_OPERATIVA}</strong>.
        </p>
        <div className="mt-3 rounded-xl border border-black/[0.06] bg-white overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-black/[0.02]">
              <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-ink/40">
                <th className="px-4 py-2 font-semibold">Grupo</th>
                <th className="px-4 py-2 font-semibold text-right">OTs cerradas</th>
                <th className="px-4 py-2 font-semibold text-right">Días medio</th>
                <th className="px-4 py-2 font-semibold text-right">Días mediana</th>
                <th className="px-4 py-2 font-semibold text-right">≤20 d (ref. operativa)</th>
                <th className="px-4 py-2 font-semibold text-right">% bajas</th>
                <th className="px-4 py-2 font-semibold text-right">% NFF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {(["con_pieza", "sin_pieza"] as const).map((k) => {
                const g = data.conversion[k];
                return (
                  <tr key={k}>
                    <td className="px-4 py-2">{k === "con_pieza" ? "Con pieza" : "Sin pieza"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{g ? fmtNum(g.n) : "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{g?.dias_medio == null ? "—" : fmtDec(g.dias_medio, 1)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{g?.dias_mediana == null ? "—" : fmtDec(g.dias_mediana, 1)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtPct(g?.pct_20d ?? null)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtPct(g?.pct_bajas ?? null)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtPct(g?.pct_nff ?? null)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {cmp && !cmp.suficiente && (
          <p className="mt-3 text-[12px] text-amber-800 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {cmp.motivo}
          </p>
        )}
        <div className="mt-4 space-y-3">
          {hallazgos.map((h) => (
            <article key={h.id} className="rounded-xl border border-black/[0.06] bg-white p-4">
              <div className="flex flex-wrap gap-2 mb-2">
                <Chip>Confianza: {h.confianza}</Chip>
              </div>
              <dl className="space-y-1 text-[13px]">
                <div><dt className="inline text-[10px] uppercase tracking-[0.12em] text-ink/40 mr-2">Hecho</dt><dd className="inline text-ink/80">{h.hecho}</dd></div>
                <div><dt className="inline text-[10px] uppercase tracking-[0.12em] text-ink/40 mr-2">Hipótesis</dt><dd className="inline text-ink/70">{h.hipotesis}</dd></div>
                <div><dt className="inline text-[10px] uppercase tracking-[0.12em] text-ink/40 mr-2">Acción</dt><dd className="inline text-ink/70">{h.accion}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {/* D — EXPOSICIÓN CONTRACTUAL */}
      <section>
        <Eyebrow>D · Exposición contractual por falta de repuesto</Eyebrow>
        <p className="mt-2 text-[12px] text-ink/50 max-w-3xl">
          Cruce del backlog en PTE. PIEZAS con lo que el Registry declara sobre pausas o exclusiones por falta de
          repuesto. Las reglas están <strong className="text-ink/70">en borrador</strong>: esto identifica dónde mirar,
          no cuantifica cumplimiento. Sin importes y sin porcentaje de cumplimiento.
        </p>
        <div className="mt-3 rounded-xl border border-black/[0.06] bg-white overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-black/[0.02]">
              <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-ink/40">
                <th className="px-4 py-2 font-semibold">Cliente contractual</th>
                <th className="px-4 py-2 font-semibold">Valor(es) ERP</th>
                <th className="px-4 py-2 font-semibold text-right">OTs en PTE. PIEZAS</th>
                <th className="px-4 py-2 font-semibold text-right">&gt;30 d</th>
                <th className="px-4 py-2 font-semibold">Estado de la regla</th>
                <th className="px-4 py-2 font-semibold">Impacto / Confianza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {exposicion.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-ink/40">Sin backlog en PTE. PIEZAS con los filtros activos.</td></tr>
              )}
              {exposicion.slice(0, 20).map((f) => (
                <tr key={f.clienteContractual ?? f.clienteWg.join("|")}>
                  <td className="px-4 py-2">{f.clienteContractual ?? <span className="text-ink/40">Sin resolver</span>}</td>
                  <td className="px-4 py-2 text-ink/50 text-[12px]">{f.clienteWg.join(" · ")}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtNum(f.n)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-ink/60">{fmtNum(f.n30)}</td>
                  <td className="px-4 py-2" title={DESC_EXPOSICION[f.estado]}>
                    {LABEL_EXPOSICION[f.estado]}
                    {f.clavesDeclaradas.length > 0 && (
                      <span className="text-ink/40 text-[11px]"> · {f.clavesDeclaradas.join(", ")}</span>
                    )}
                  </td>
                  <td className="px-4 py-2"><Chip>{f.impacto}</Chip> <Chip>{f.confianza}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* E — CADENA DE SUMINISTRO */}
      <section>
        <Eyebrow>E · Cadena de suministro</Eyebrow>
        <p className="mt-2 text-[12px] text-ink/50 max-w-3xl">
          Estado de la fuente de dato en cada etapa. Donde no hay fuente no se muestra ninguna cifra.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {cadena.map((e, i) => {
            const siguiente = cadena[i + 1];
            return (
              <div key={e.etapa} className="rounded-xl border border-black/[0.06] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-ink">{i + 1}. {e.label}</p>
                  <Chip>{GLIFO_FUENTE[e.estado]} {LABEL_FUENTE[e.estado]}</Chip>
                </div>
                <p className="mt-1 text-[11px] text-ink/40 font-mono break-all">{e.fuente}</p>
                <p className="mt-2 text-[11px] text-ink/55 leading-snug">{e.medida}</p>
                {siguiente && (
                  <p className="mt-2 text-[11px] text-ink/50">
                    → {siguiente.label}:{" "}
                    {e.leadTime
                      ? `${fmtDec(e.leadTime.medio, 1)} d de media · mediana ${fmtDec(e.leadTime.mediana, 1)} d (n=${fmtNum(e.leadTime.n)})`
                      : "lead time no calculable sin fuente"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* F — STOCK */}
      <section>
        <Eyebrow>F · Stock</Eyebrow>
        <div className="mt-3 rounded-xl border border-black/[0.06] bg-white p-6">
          {data.cadena.stock_filas === 0 ? (
            <>
              <p className="text-sm text-ink flex items-center gap-2">
                <Chip>{GLIFO_FUENTE.pendiente} Pendiente</Chip> Sin foto de stock cargada.
              </p>
              <p className="mt-3 text-[13px] text-ink/60 max-w-3xl leading-relaxed">
                {domStock?.medida ?? "ops_stock_snapshot está creada pero vacía."} Al cargarla se activan: última foto
                por almacén, referencias con cantidad 0 y reserva &gt; 0, y cruce con las referencias solicitadas
                pendientes de servir.
              </p>
              <p className="mt-3 text-[12px] text-ink/50">
                Cabeceras exactas de la plantilla:{" "}
                <code className="font-mono text-[11px] text-ink/70 break-all">{cabeceraPlantilla("ops_stock_snapshot")}</code>
              </p>
              <Link to="/operaciones/importar" className="mt-3 inline-block text-[12px] text-ink underline underline-offset-2 hover:text-ink/70">
                Ir al importador →
              </Link>
            </>
          ) : (
            <p className="text-sm text-ink/70">
              {fmtNum(data.cadena.stock_filas)} filas de stock cargadas. {domStock?.medida}
            </p>
          )}
        </div>
      </section>

      {/* DEFINICIONES */}
      <section className="rounded-2xl border border-black/[0.06] bg-white p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70 flex items-center gap-2">
          <Info className="h-3.5 w-3.5" /> Definiciones y limitaciones
        </p>
        <ul className="mt-3 space-y-2 text-[12px] text-ink/60 leading-relaxed list-disc pl-5">
          <li><strong className="text-ink/80">Etapa actual ≠ tiempo en etapa.</strong> Sin historial de estados solo se conoce dónde está la OT hoy, no cuánto lleva ahí.</li>
          <li><strong className="text-ink/80">tiene_piezas es un flag</strong>, no una cantidad ni una referencia: no permite calcular consumo ni coste de repuesto.</li>
          <li><strong className="text-ink/80">Coste de repuesto: no disponible.</strong> ops_fact_ot solo trae mano de obra y desplazamiento.</li>
          <li><strong className="text-ink/80">≤20 días</strong> es {ETIQUETA_REFERENCIA_OPERATIVA.toLowerCase()}, nunca un SLA contractual.</li>
          <li><strong className="text-ink/80">Lead times:</strong> solo cuentan los pares con las dos fechas informadas. Una fecha ausente se excluye, nunca cuenta como cero.</li>
          <li>
            <strong className="text-ink/80">Fuente de las solicitudes:</strong>{" "}
            {domSolicitudes?.medida ?? "ops_pieza_solicitud, vía importador."} Plantilla de{" "}
            {PLANTILLAS.ops_pieza_solicitud.length} columnas.
          </li>
        </ul>
      </section>
    </div>
  );
}
