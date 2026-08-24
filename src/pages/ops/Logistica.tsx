import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOpsFilters, fmtNum, fmtDec, fmtPct, fmtEur } from "@/lib/ops-filters";
import { labelPeriodo } from "@/lib/ops-performance";
import { useDataQuality } from "@/hooks/useDataQuality";
import { cabeceraPlantilla } from "@/lib/ops-csv";
import {
  GLIFO_FUENTE,
  LABEL_FUENTE,
  lineaEjecutivaLogistica,
  normalizarSupply,
  pctTrazabilidad,
  type SupplyPayload,
} from "@/lib/ops-supply";
import { AlertTriangle, Info, Loader2, RefreshCw } from "lucide-react";

type LogisticaPayload = {
  total_filas: number;
  periodo: {
    n: number; entregadas: number; incidencias: number;
    otd_n: number; otd_ok: number; lead_n: number; lead_medio: number | null;
    coste_n: number; coste_medio: number | null;
  };
  periodo_prev: { n: number; otd_n: number; otd_ok: number; coste_medio: number | null };
  por_transportista: Array<{ entidad: string; n: number; incidencias: number; coste_medio: number | null }>;
  por_destino: Array<{ entidad: string; n: number; coste_medio: number | null }>;
};

/** Campos reutilizados de la RPC ops_dispersion (bloque C, logística de campo). */
type CampoPayload = {
  kmMedia: number | null;
  kmMediana: number | null;
  cerradas: number | null;
  geocodificadas: number | null;
  costeDesplazamiento: number | null;
};

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{children}</p>
);

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-black/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ink/60 whitespace-nowrap">
    {children}
  </span>
);

const Card = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-xl border border-black/[0.06] bg-white p-4">
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
    <p className="mt-2 heading-display text-3xl text-ink">{value}</p>
    {hint && <p className="mt-1 text-[11px] text-ink/50 leading-snug">{hint}</p>}
  </div>
);

const KPIS_PREVISTOS: { kpi: string; def: string }[] = [
  { kpi: "Expediciones por día", def: "Volumen expedido normalizado por día natural del período." },
  { kpi: "OTD — % de entrega en plazo", def: "Entregas con fecha real ≤ fecha prevista, sobre las que tienen ambas fechas." },
  { kpi: "Lead time expedición → entrega", def: "Días entre expedición y entrega real; solo con ambas fechas." },
  { kpi: "% de incidencias", def: "Expediciones en estado incidencia o con incidencia declarada." },
  { kpi: "Coste medio por envío", def: "Media de coste_envio sobre las expediciones con coste informado." },
  { kpi: "Desglose por transportista y por tipo de destino", def: "Mismas métricas abiertas por transportista y por destino_tipo, nunca mezclados." },
];

const num = (v: unknown): number | null => (v == null || v === "" ? null : Number(v));

export default function OpsLogistica() {
  const { filters, rpcParams, prevRange, sinComparable } = useOpsFilters();
  const { dominio } = useDataQuality();
  const [log, setLog] = useState<LogisticaPayload | null>(null);
  const [supply, setSupply] = useState<SupplyPayload | null>(null);
  const [campo, setCampo] = useState<CampoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const id = ++reqIdRef.current;
    setLoading(true);
    setErrorMsg(null);
    void (async () => {
      const [rLog, rSup] = await Promise.all([
        supabase.rpc("ops_logistica" as never, {
          p_from: filters.from, p_to: filters.to,
          p_prev_from: prevRange.from, p_prev_to: prevRange.to,
        } as never),
        supabase.rpc("ops_supply" as never, {
          ...rpcParams, p_prev_from: prevRange.from, p_prev_to: prevRange.to,
        } as never),
      ]);
      if (id !== reqIdRef.current) return;
      if (rLog.error || rSup.error) {
        console.error("[ops_logistica]", rLog.error ?? rSup.error);
        setErrorMsg((rLog.error ?? rSup.error)?.message ?? "Error desconocido");
        setLoading(false);
        return;
      }
      setLog(rLog.data as unknown as LogisticaPayload);
      setSupply(normalizarSupply(rSup.data));
      setLoading(false);
    })();
  }, [rpcParams, filters.from, filters.to, prevRange.from, prevRange.to, reloadKey]);

  // (C) Logística de campo — reutiliza las RPC existentes (ops_dispersion para km,
  // ops_costes para el importe de desplazamiento). Sin duplicar lógica de cálculo.
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const [rDisp, rCost] = await Promise.all([
        supabase.rpc("ops_dispersion" as never, {
          p_from: filters.from, p_to: filters.to,
          p_delegacion: filters.delegacion, p_gama: filters.gama, p_familia: filters.familia,
        } as never),
        supabase.rpc("ops_costes" as never, { p_from: filters.from, p_to: filters.to } as never),
      ]);
      if (!vivo || rDisp.error || rCost.error) return;
      const d = (rDisp.data ?? {}) as Record<string, unknown>;
      const k = (d.kpis ?? {}) as Record<string, unknown>;
      const c = ((rCost.data ?? {}) as Record<string, unknown>).kpis as Record<string, unknown> | undefined;
      setCampo({
        kmMedia: num(k.km_media),
        kmMediana: num(k.km_mediana),
        cerradas: num(k.cerradas),
        geocodificadas: num(k.geocodificadas),
        costeDesplazamiento: num(c?.coste_desplazamiento),
      });
    })();
    return () => { vivo = false; };
  }, [filters.from, filters.to, filters.delegacion, filters.gama, filters.familia]);

  const etiqueta = labelPeriodo(filters.from, filters.to);
  const hayExpediciones = (log?.total_filas ?? 0) > 0;
  const linea = useMemo(
    () => lineaEjecutivaLogistica(log?.total_filas ?? 0, log?.periodo.n ?? 0, etiqueta),
    [log, etiqueta],
  );
  const domExp = dominio("expediciones");
  const traz = supply ? pctTrazabilidad(supply.cadena) : null;

  const otd = log && log.periodo.otd_n > 0 ? log.periodo.otd_ok / log.periodo.otd_n : null;
  const otdPrev = log && log.periodo_prev.otd_n > 0 ? log.periodo_prev.otd_ok / log.periodo_prev.otd_n : null;
  const dias = Math.max(1, Math.round((Date.parse(filters.to) - Date.parse(filters.from)) / 86_400_000) + 1);

  if (loading && !log) {
    return (
      <div className="flex items-center gap-2 text-ink/40 py-20 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando logística…
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-2xl p-6 space-y-3">
        <p className="text-sm text-amber-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> No se ha podido cargar el módulo de logística.
        </p>
        <p className="text-xs text-amber-800 font-mono break-all">{errorMsg}</p>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-2 text-xs rounded-full border border-amber-300 px-3 py-1.5 text-amber-900 hover:bg-amber-100"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <Eyebrow>Supply &amp; Fulfilment</Eyebrow>
        <h1 className="heading-display text-3xl md:text-4xl text-ink mt-1">Logística &amp; Expediciones</h1>
        <p className="mt-3 text-[13px] text-ink/70 max-w-4xl leading-relaxed">{linea}</p>
      </header>

      {/* A — EXPEDICIONES DEL PERÍODO */}
      <section>
        <Eyebrow>A · Expediciones del período</Eyebrow>
        {!hayExpediciones ? (
          <div className="mt-3 rounded-2xl border border-black/[0.06] bg-white p-6">
            <p className="text-sm text-ink flex items-center gap-2">
              <Chip>{GLIFO_FUENTE.pendiente} {LABEL_FUENTE.pendiente}</Chip> Sin expediciones registradas.
            </p>
            <p className="mt-3 text-[13px] text-ink/60 max-w-3xl leading-relaxed">
              {domExp?.medida ?? "ops_expedicion está creada pero vacía."} No se muestra ninguna cifra de transporte
              porque no existe todavía la fuente.
            </p>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">
              Indicadores que se activan al cargar la fuente
            </p>
            <ul className="mt-2 space-y-1.5 text-[12px] text-ink/60 list-disc pl-5">
              {KPIS_PREVISTOS.map((k) => (
                <li key={k.kpi}><strong className="text-ink/80">{k.kpi}</strong> — {k.def}</li>
              ))}
            </ul>
            <p className="mt-4 text-[12px] text-ink/50">
              Cabeceras exactas de la plantilla:{" "}
              <code className="font-mono text-[11px] text-ink/70 break-all">{cabeceraPlantilla("ops_expedicion")}</code>
            </p>
            <Link to="/operaciones/importar" className="mt-3 inline-block text-[12px] text-ink underline underline-offset-2 hover:text-ink/70">
              Ir al importador →
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card label="Expediciones" value={fmtNum(log?.periodo.n)} hint={`${fmtDec((log?.periodo.n ?? 0) / dias, 1)} por día del período.`} />
              <Card
                label="OTD · entrega en plazo"
                value={fmtPct(otd)}
                hint={sinComparable || otdPrev == null ? "Sin período comparable." : `Período anterior: ${fmtPct(otdPrev)}`}
              />
              <Card
                label="Lead time expedición → entrega"
                value={log?.periodo.lead_medio == null ? "—" : `${fmtDec(log.periodo.lead_medio, 1)} d`}
                hint={`Sobre ${fmtNum(log?.periodo.lead_n)} envíos con ambas fechas.`}
              />
              <Card
                label="Coste medio por envío"
                value={log?.periodo.coste_medio == null ? "—" : fmtEur(log.periodo.coste_medio)}
                hint={`Sobre ${fmtNum(log?.periodo.coste_n)} envíos con coste informado.`}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {([
                { titulo: "Por transportista", filas: log?.por_transportista ?? [], inc: true },
                { titulo: "Por tipo de destino", filas: log?.por_destino ?? [], inc: false },
              ] as const).map((b) => (
                <div key={b.titulo} className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-black/[0.06]">
                    <p className="text-sm font-medium text-ink">{b.titulo}</p>
                  </div>
                  <table className="w-full text-[13px]">
                    <thead className="bg-black/[0.02]">
                      <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-ink/40">
                        <th className="px-4 py-2 font-semibold">Entidad</th>
                        <th className="px-4 py-2 font-semibold text-right">Envíos</th>
                        {b.inc && <th className="px-4 py-2 font-semibold text-right">Incidencias</th>}
                        <th className="px-4 py-2 font-semibold text-right">Coste medio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05]">
                      {b.filas.map((f) => (
                        <tr key={f.entidad}>
                          <td className="px-4 py-2">{f.entidad}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtNum(f.n)}</td>
                          {b.inc && <td className="px-4 py-2 text-right tabular-nums text-ink/60">{fmtNum((f as { incidencias?: number }).incidencias ?? 0)}</td>}
                          <td className="px-4 py-2 text-right tabular-nums text-ink/60">{f.coste_medio == null ? "—" : fmtEur(f.coste_medio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* B — FLUJO OT ↔ EXPEDICIÓN */}
      <section>
        <Eyebrow>B · Flujo OT ↔ expedición</Eyebrow>
        <div className="mt-3 rounded-2xl border border-black/[0.06] bg-white p-6">
          {!hayExpediciones ? (
            <>
              <p className="text-sm text-ink flex items-center gap-2">
                <Chip>{GLIFO_FUENTE.pendiente} {LABEL_FUENTE.pendiente}</Chip> Trazabilidad no calculable.
              </p>
              <p className="mt-3 text-[13px] text-ink/60 max-w-3xl leading-relaxed">
                Sin expediciones cargadas no se puede saber qué proporción de las OTs con pieza llegó a expedirse.
                {supply && ` En el período hay ${fmtNum(supply.cadena.ots_con_pieza_periodo)} OTs con pieza a las que enlazar la expedición.`}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink/70">
              {traz == null
                ? "Trazabilidad no calculable: falta la solicitud de pieza que enlaza OT y expedición."
                : `${fmtPct(traz)} de las OTs con pieza del período tienen trazabilidad en la cadena de suministro.`}
            </p>
          )}
        </div>
      </section>

      {/* C — PRODUCTIVIDAD DE ALMACÉN */}
      <section>
        <Eyebrow>C · Productividad de almacén (picking y expedición)</Eyebrow>
        <p className="mt-2 text-[12px] text-ink/50 max-w-3xl leading-relaxed">{prod.linea} {NOTA_COMPARABILIDAD}</p>
        {prodFilas.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-black/[0.06] bg-white p-6">
            <p className="text-sm text-ink flex items-center gap-2">
              <Chip>{GLIFO_FUENTE.pendiente} {LABEL_FUENTE.pendiente}</Chip> Productividad no calculable.
            </p>
            <p className="mt-3 text-[13px] text-ink/60 max-w-3xl leading-relaxed">
              Se activa al cargar la cabecera de expediciones con marcas de picking y el detalle de líneas.
            </p>
            <ul className="mt-3 space-y-1.5 text-[12px] text-ink/60 list-disc pl-5">
              {INDICADORES_PRODUCTIVIDAD.map((i) => (
                <li key={i.clave}>
                  <strong className="text-ink/80">{i.label}</strong> — {i.definicion}{" "}
                  <span className="text-ink/40">Requiere: {i.requiere.join(", ")}.</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[12px] text-ink/50">
              Cabeceras exactas:{" "}
              <code className="font-mono text-[11px] text-ink/70 break-all">{cabeceraPlantilla("ops_expedicion")}</code>
              <br />
              <code className="font-mono text-[11px] text-ink/70 break-all">{cabeceraPlantilla("ops_expedicion_linea")}</code>
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-black/[0.06] bg-white overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-black/[0.02]">
                <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-ink/40">
                  <th className="px-4 py-2 font-semibold">Almacén base</th>
                  <th className="px-4 py-2 font-semibold text-right">Expediciones</th>
                  <th className="px-4 py-2 font-semibold text-right">Líneas</th>
                  <th className="px-4 py-2 font-semibold text-right">Líneas/hora</th>
                  <th className="px-4 py-2 font-semibold text-right">Min/línea</th>
                  <th className="px-4 py-2 font-semibold">Comparabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {prodFilas.map((f) => (
                  <tr key={`${f.almacen_base}-${f.entidad}`}>
                    <td className="px-4 py-2">{f.entidad}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(f.expediciones)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(f.lineas)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{f.lineasHora == null ? "—" : fmtDec(f.lineasHora, 1)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{f.minutosPorLinea == null ? "—" : fmtDec(f.minutosPorLinea, 1)}</td>
                    <td className="px-4 py-2 text-[11px] text-ink/50">{f.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[12px] text-ink/50">
          El desplazamiento del técnico a domicilio no es logística de almacén: se mide en{" "}
          <Link to="/operaciones/dispersion" className="text-ink underline underline-offset-2 hover:text-ink/70">
            Cobertura &amp; Dispersión
          </Link>.
        </p>
      </section>


      {/* D — DEFINICIONES */}
      <section className="rounded-2xl border border-black/[0.06] bg-white p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70 flex items-center gap-2">
          <Info className="h-3.5 w-3.5" /> Definiciones
        </p>
        <ul className="mt-3 space-y-2 text-[12px] text-ink/60 leading-relaxed list-disc pl-5">
          <li><strong className="text-ink/80">OTD (On Time Delivery):</strong> entregas con fecha real ≤ fecha prevista, medidas solo sobre los envíos que tienen las dos fechas.</li>
          <li><strong className="text-ink/80">Lead time:</strong> días entre expedición y entrega real. Un envío sin entrega registrada se excluye; nunca cuenta como cero.</li>
          <li><strong className="text-ink/80">Logística de campo</strong> es el desplazamiento del técnico a domicilio, distinto de la expedición de material.</li>
          <li><strong className="text-ink/80">Fuente de expediciones:</strong> ops_expedicion, cargada desde el importador. Mientras esté vacía, este módulo no publica cifras de transporte.</li>
        </ul>
      </section>
    </div>
  );
}
