import { useMemo, useState } from "react";
import { ChevronRight, ArrowLeft, Info } from "lucide-react";
import { DataAsOf } from "@/components/ops/DataAsOf";
import { OpsErrorBlock, falloDeQuery, fallosDeQueries } from "@/components/ops/OpsErrorBlock";
import { ReadinessBar } from "@/components/ops/ReadinessBar";
import { SlaContractual } from "@/components/ops/SlaContractual";

import { useOpsRpc, useOpsRpcs } from "@/lib/ops-query";
import { fmtNum, fmtDec, useOpsFilters } from "@/lib/ops-filters";
import {
  CODIGO_SIN_RESOLVER,
  DEGRADACION,
  ETIQUETA_CLAIMS_REPRESENTADOS,
  MARCA_REFERENCIA_INTERNA,
  NIVEL_IDENTIDAD,
  NOTA_ALIAS_NO_GOBERNADO,
  NOTA_CLAIMS_REPRESENTADOS,
  NOTA_UNIVERSO_RESUELTA,
  NOTA_UNIVERSO_SERVICIO,
  TEXTO_ECONOMIA_CONTRIBUCION,
  TEXTO_ECONOMIA_COSTE,
  TEXTO_ECONOMIA_ESTADO_FUENTE,
  TEXTO_HUECO_CONTRACTUAL,
  TEXTO_SIN_OBLIGACIONES,
  UNIVERSO,
  desgloseCategorias,
  etiquetaCategoriaClaim,
  etiquetaClaseNoResuelta,
  etiquetaGobiernoAlias,
  etiquetaSinResolver,
  notaImporte,
  pctSeguro,
  semanticaClaimSinRegla,
  traducirReason,
  type ObligacionFila,
  type PortfolioArbolFila,
  type PortfolioNoResueltaFila,
  type PortfolioResumenFila,
  type ProgramaFicha,
} from "@/lib/ops-portfolio";
import { type SlaDisponibilidadFila } from "@/lib/ops-sla-contractual";



const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{children}</p>
);

/** Valor con degradación explícita: nunca NaN, nunca 0 engañoso. */
const Dato = ({ label, valor, nota, degradado }: {
  label: string; valor: string | null; nota?: string; degradado?: string;
}) => (
  <div className="min-w-0">
    <p className="text-[11px] text-ink/50 leading-snug">{label}</p>
    {valor != null ? (
      <p className="mt-0.5 heading-display text-xl text-ink">{valor}</p>
    ) : (
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/45">
        {degradado ?? DEGRADACION.DATO_NO_DISPONIBLE}
      </p>
    )}
    {nota && <p className="mt-0.5 text-[10.5px] text-ink/45 leading-snug">{nota}</p>}
  </div>
);

const Bloque = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-black/[0.06] bg-white/70 p-4 flex flex-col gap-3 min-w-0">
    <Eyebrow>{titulo}</Eyebrow>
    <div className="space-y-3">{children}</div>
  </div>
);

const pct1 = (v: number | null | undefined) =>
  v == null || Number.isNaN(Number(v)) ? null : `${(Number(v) * 100).toFixed(1)}%`;

// ── Economía (idéntica en todas las tarjetas, campos SIEMPRE visibles) ──────
// Dato ausente ≠ cero. Se cuentan por separado importe no cero, importe cero
// y importe nulo, y nunca se agrega ni se promedia.
const BloqueEconomia = ({ noCero, cero, nulo, total }: {
  noCero: number; cero: number; nulo: number; total: number;
}) => {
  const p = pctSeguro(noCero, total);
  return (
    <Bloque titulo="Economía">
      <Dato
        label="OTs con importe no cero (fact_cli ≠ 0)"
        valor={total > 0 ? `${fmtNum(noCero)} de ${fmtNum(total)} (${p == null ? "—" : p.toFixed(1)}%)` : null}
        nota={total > 0 ? `${fmtNum(cero)} a cero · ${fmtNum(nulo)} sin importe informado` : undefined}
        degradado={DEGRADACION.SIN_POBLACION}
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/45">
        {TEXTO_ECONOMIA_COSTE}
      </p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/45">
        {TEXTO_ECONOMIA_CONTRIBUCION}
      </p>
      <p className="text-[10.5px] text-ink/45 leading-snug">{TEXTO_ECONOMIA_ESTADO_FUENTE}</p>
      <p className="text-[10.5px] text-ink/45 leading-snug">{notaImporte(p)}</p>
    </Bloque>
  );
};

// ── Vista 1 · verticales ────────────────────────────────────────────────────
const TarjetaVertical = ({ f, onDrill }: { f: PortfolioResumenFila; onDrill: () => void }) => {
  const identificadas = Number(f.n_ots_cliente_identificado || 0);
  const gobernadas = Number(f.n_ots_alias_gobernado || 0);
  const noGobernadas = Number(f.n_ots_alias_no_gobernado || 0);
  const resueltas = Number(f.n_ots || 0);
  const desglose = desgloseCategorias(f.claims_por_categoria);
  return (
    <section className="rounded-2xl border border-black/[0.06] bg-white p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow>Vertical</Eyebrow>
          <h2 className="heading-display text-xl text-ink truncate">{f.vertical_nombre}</h2>
          <p className="text-[11px] text-ink/45 font-mono">{f.vertical_codigo}</p>
        </div>
        <button
          type="button"
          onClick={onDrill}
          className="shrink-0 inline-flex items-center gap-1 rounded-full border border-black/[0.08] px-3 py-1.5 text-[12px] text-ink/70 hover:text-ink hover:border-ink/40"
        >
          Ver clientes <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </header>

      <p className="mt-2 text-[12.5px] text-ink">
        {fmtNum(identificadas + resueltas)} OTs operativas identificadas ·{" "}
        {fmtNum(resueltas)} resueltas a programa
      </p>
      {identificadas > 0 && (
        <p className="mt-1 text-[11.5px] text-ink/65 leading-snug max-w-2xl">
          {fmtNum(identificadas)} OTs corresponden a un {NIVEL_IDENTIDAD.OPERATIVO_RECONOCIDO.toLowerCase()}{" "}
          sin programa contractual resuelto ({fmtNum(gobernadas)} con identidad contractual gobernada ·{" "}
          {fmtNum(noGobernadas)} con alias no gobernado). Existen operativamente; no se reparten entre
          programas. El reparto mostrado describe estas OTs, no el censo global de alias.
        </p>
      )}


      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Bloque titulo="Servicio">
          <Dato
            label={`${UNIVERSO.RESUELTA} (OTs)`}
            valor={resueltas > 0 ? fmtNum(resueltas) : null}
            nota={NOTA_UNIVERSO_RESUELTA}
            degradado={DEGRADACION.SIN_POBLACION}
          />
          <Dato
            label={`OTs de ${NIVEL_IDENTIDAD.OPERATIVO_RECONOCIDO.toLowerCase()} sin programa resuelto`}
            valor={fmtNum(identificadas)}
            nota="Contabilizadas en el bloque de población no resuelta; no se suman a la resuelta."
          />
          <Dato label="Programas" valor={fmtNum(f.n_programas)} />
          <Dato label="Clientes" valor={fmtNum(f.n_clientes)} />
        </Bloque>

        <Bloque titulo="Contrato">
          <Dato
            label="Instrumentos con alcance registrado"
            valor={f.n_instrumentos > 0 ? fmtNum(f.n_instrumentos) : null}
            degradado={DEGRADACION.OBLIGACION_NO_REPRESENTADA}
          />
          {f.n_claims > 0 ? (
            <>
              <Dato
                label={ETIQUETA_CLAIMS_REPRESENTADOS}
                valor={`${fmtNum(f.n_claims)}`}
                nota={`${fmtNum(f.claims_validated)} validados · ${fmtNum(f.claims_pending)} pendientes de validar${desglose ? ` · ${desglose}` : ""}`}
              />
              <p className="text-[10.5px] text-ink/45 leading-snug">{NOTA_CLAIMS_REPRESENTADOS}</p>
              <Dato
                label="Reglas derivadas"
                valor={fmtNum(f.n_reglas)}
                nota={f.n_reglas === 0
                  ? "Claim representado sin regla derivada: no evaluable, no inexistente."
                  : undefined}
              />
            </>
          ) : (
            <p className="text-[12px] text-ink/60 leading-snug">{TEXTO_SIN_OBLIGACIONES}</p>
          )}
          <p className="text-[10.5px] text-ink/45 leading-snug">{TEXTO_HUECO_CONTRACTUAL}</p>
        </Bloque>

        <BloqueEconomia
          noCero={f.n_ots_importe_no_cero}
          cero={f.n_ots_importe_cero}
          nulo={f.n_ots_importe_nulo}
          total={resueltas}
        />
      </div>
    </section>
  );
};



// ── Vista 2/3 · clientes y programas ───────────────────────────────────────
const FilaProgramaBtn = ({ label, sub, right, onClick }: {
  label: string; sub?: string; right?: string; onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-between gap-4 rounded-xl border border-black/[0.06] bg-white px-4 py-3 text-left hover:border-ink/30"
  >
    <span className="min-w-0">
      <span className="block text-[14px] text-ink truncate">{label}</span>
      {sub && <span className="block text-[11px] text-ink/45 truncate">{sub}</span>}
    </span>
    <span className="shrink-0 flex items-center gap-2 text-[12px] text-ink/55">
      {right}
      <ChevronRight className="h-4 w-4" />
    </span>
  </button>
);

// ── Ficha de programa ───────────────────────────────────────────────────────
const FichaPrograma = ({ programaId, onVolver }: { programaId: string; onVolver: () => void }) => {
  const specs = useMemo(
    () => [
      { rpc: "ctr_programa_ficha", params: { p_programa: programaId } },
      { rpc: "ctr_obligaciones_programa", params: { p_programa: programaId } },
    ],
    [programaId],
  );
  const [fichaQ, obligQ] = useOpsRpcs<unknown>(specs);
  const fallos = fallosDeQueries(
    [{ rpc: "ctr_programa_ficha", contexto: "ficha" }, { rpc: "ctr_obligaciones_programa", contexto: "obligaciones" }],
    [fichaQ, obligQ],
  );
  const reintentar = () => { void fichaQ.refetch(); void obligQ.refetch(); };

  const ficha = (fichaQ.data ?? null) as ProgramaFicha | null;
  const obligaciones = (Array.isArray(obligQ.data) ? obligQ.data : []) as ObligacionFila[];

  if (fallos.length && !ficha) {
    return <OpsErrorBlock fallos={fallos} onReintentar={reintentar} />;
  }

  const s = ficha?.servicio;
  const total = s?.ots ?? 0;
  const poblacionResuelta = ficha?.poblacion?.resuelta ?? total;
  const anulados = ficha?.poblacion?.excluidas_anulado_aviso ?? 0;


  return (
    <div className="space-y-6">
      <button type="button" onClick={onVolver}
        className="inline-flex items-center gap-1.5 text-[12px] text-ink/55 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Volver al portfolio
      </button>

      {fallos.length > 0 && (
        <OpsErrorBlock fallos={fallos} onReintentar={reintentar} conservaDatos />
      )}

      <header className="rounded-2xl border border-black/[0.06] bg-white p-5">
        <Eyebrow>
          {ficha?.programa?.vertical_nombre ?? "Vertical no asignada"} ›{" "}
          {ficha?.programa?.cliente ?? "Cliente no asignado"}
        </Eyebrow>
        <h1 className="heading-display text-2xl text-ink mt-1">
          {ficha?.programa?.nombre ?? "Programa"}
        </h1>
        <p className="mt-1 text-[12px] text-ink/55">
          Estado: {ficha?.programa?.estado ?? "—"} · Territorio:{" "}
          {ficha?.programa?.territorio?.length ? ficha.programa.territorio.join(", ") : "—"} · Vigencia:{" "}
          {ficha?.programa?.effective_from ?? "—"} → {ficha?.programa?.effective_to ?? "sin fin declarado"}
        </p>

        <div className="mt-4 grid gap-2 md:grid-cols-3 text-[11px] text-ink/55">
          <p>As-of operativo: <span className="text-ink">{ficha?.as_of_operativo ?? DEGRADACION.DATO_NO_DISPONIBLE}</span></p>
          <p>As-of contractual: <span className="text-ink/45 uppercase tracking-[0.1em]">{DEGRADACION.DATO_NO_DISPONIBLE}</span></p>
          <p>
            As-of económico:{" "}
            <span className="text-ink/45 uppercase tracking-[0.1em]">
              {ficha?.economia?.fuente_cargada
                ? DEGRADACION.FUENTE_NO_RECONCILIADA
                : DEGRADACION.FUENTE_NO_CARGADA}
            </span>
            <span className="block text-[10.5px] text-ink/40 leading-snug">
              Indicador derivado por proxy (existencia de OTs con importe en el ERP), no de un
              registro de carga del dominio económico.
            </span>
          </p>

        </div>

        {/* Los DOS universos, siempre juntos y siempre nombrados. */}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-black/[0.06] p-3">
            <p className="text-[11px] text-ink/50">{UNIVERSO.RESUELTA}</p>
            <p className="heading-display text-xl text-ink">{fmtNum(poblacionResuelta)}</p>
            <p className="text-[10.5px] text-ink/45 leading-snug">{NOTA_UNIVERSO_RESUELTA}</p>
          </div>
          <div className="rounded-xl border border-black/[0.06] p-3">
            <p className="text-[11px] text-ink/50">{UNIVERSO.SERVICIO}</p>
            <p className="heading-display text-xl text-ink">{fmtNum(total)}</p>
            <p className="text-[10.5px] text-ink/45 leading-snug">
              {NOTA_UNIVERSO_SERVICIO} Excluidas: {fmtNum(anulados)}.
            </p>
          </div>
        </div>
        <DataAsOf className="mt-3" />
      </header>

      {/* SERVICIO */}
      <section className="rounded-2xl border border-black/[0.06] bg-white p-5 space-y-4">
        <Eyebrow>Servicio · {UNIVERSO.SERVICIO}</Eyebrow>
        {total === 0 ? (
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink/45">
            {DEGRADACION.SIN_POBLACION}
          </p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Dato
                label="OTs analizadas (excluye ANULADO AVISO)"
                valor={fmtNum(total)}
                nota={`De ${fmtNum(poblacionResuelta)} resueltas al programa`}
              />

              <Dato label="Cerradas" valor={fmtNum(s?.cerradas ?? 0)} />
              <Dato label="Abiertas" valor={fmtNum(s?.abiertas ?? 0)} />
              <Dato
                label="Días de cierre (media)"
                valor={s?.dias_cierre_medio == null ? null : fmtDec(s.dias_cierre_medio, 1)}
                degradado={DEGRADACION.NO_CALCULABLE}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-black/[0.06] bg-black/[0.015] p-4">
                <span className="inline-block rounded-full bg-ink/[0.06] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink/55">
                  {MARCA_REFERENCIA_INTERNA}
                </span>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <Dato label="≤20 días" valor={pct1(s?.pct_kpi_20d)} degradado={DEGRADACION.NO_CALCULABLE} />
                  <Dato label="≤30 días" valor={pct1(s?.pct_kpi_30d)} degradado={DEGRADACION.NO_CALCULABLE} />
                </div>
                <p className="mt-2 text-[10.5px] text-ink/45 leading-snug">
                  Umbral interno de gestión. No es una obligación contractual del programa.
                </p>
              </div>

              <div className="rounded-xl border border-black/[0.06] p-4 grid grid-cols-2 gap-4">
                <Dato
                  label="Completitud del dato · primer contacto"
                  valor={pct1(s?.completitud_primer_contacto)}
                  degradado={DEGRADACION.DATO_NO_DISPONIBLE}
                />
                <Dato
                  label="Completitud del dato · primera visita"
                  valor={pct1(s?.completitud_primera_visita)}
                  degradado={DEGRADACION.DATO_NO_DISPONIBLE}
                />
                <p className="col-span-2 text-[10.5px] text-ink/45 leading-snug">
                  Mide si el hito está registrado, no si se cumplió ningún plazo.
                </p>
              </div>
            </div>

            <div>
              <p className="text-[11px] text-ink/50 mb-2">Antigüedad de las OTs abiertas (desde creación)</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {([
                  ["0-20 d", s?.aging.b_0_20], ["21-30 d", s?.aging.b_21_30],
                  ["31-60 d", s?.aging.b_31_60], ["61-90 d", s?.aging.b_61_90],
                  ["+90 d", s?.aging.b_90_mas], ["sin fecha", s?.aging.sin_fecha],
                ] as const).map(([l, v]) => (
                  <div key={l} className="rounded-lg border border-black/[0.06] px-3 py-2">
                    <p className="text-[10px] text-ink/45">{l}</p>
                    <p className="text-[15px] text-ink">{v == null ? "—" : fmtNum(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {/* CONTRATO */}
      <section className="rounded-2xl border border-black/[0.06] bg-white p-5 space-y-4">
        <Eyebrow>Contrato</Eyebrow>

        {ficha && ficha.instrumentos.length === 0 ? (
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink/45">
            {DEGRADACION.OBLIGACION_NO_REPRESENTADA}
          </p>
        ) : (
          <ul className="space-y-2">
            {(ficha?.instrumentos ?? []).map((i) => (
              <li key={i.contrato_id} className="rounded-xl border border-black/[0.06] px-4 py-3">
                <p className="text-[14px] text-ink">{i.titulo ?? "Instrumento sin título"}</p>
                <p className="text-[11px] text-ink/50 mt-0.5">
                  {i.tipo_instrumento ?? "—"} · firma {i.fecha_firma ?? "—"} · vigencia{" "}
                  {i.effective_from ?? "—"} → {i.effective_to ?? "sin fin declarado"} · evidencia{" "}
                  {i.estado_evidencia ?? "—"}
                </p>
                <p className="text-[11px] text-ink/45 mt-0.5">
                  {i.sociedad_wg ?? "Sociedad WG no declarada"} ↔ {i.contraparte ?? "Contraparte no declarada"}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="pt-2 space-y-3">
          <p className="text-[11px] text-ink/50">{ETIQUETA_CLAIMS_REPRESENTADOS}</p>
          <p className="text-[10.5px] text-ink/45 leading-snug max-w-2xl">
            {NOTA_CLAIMS_REPRESENTADOS} {TEXTO_HUECO_CONTRACTUAL}
          </p>
          {obligaciones.length === 0 ? (
            <p className="text-[12.5px] text-ink/65">{TEXTO_SIN_OBLIGACIONES}</p>
          ) : (
            <ul className="space-y-3">
              {obligaciones.map((o) => (
                <li key={o.claim_id} className="rounded-xl border border-black/[0.06] p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-ink/40">
                        Claim · {etiquetaCategoriaClaim(o.categoria)}
                      </p>

                      <p className="text-[13.5px] text-ink leading-snug">
                        {o.enunciado ?? "Enunciado no registrado"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-black/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-ink/55">
                      {o.estado ?? "—"}
                    </span>
                  </div>

                  <p className="text-[11px] text-ink/55 font-mono break-all">
                    {o.valor_estructurado == null ? "valor literal no estructurado" : JSON.stringify(o.valor_estructurado)}
                  </p>

                  <p className="text-[11px] text-ink/45">
                    Documento: {o.doc_fichero ?? DEGRADACION.DATO_NO_DISPONIBLE}
                    {o.doc_estado_evidencia ? ` · evidencia ${o.doc_estado_evidencia}` : ""}
                    {o.doc_hash ? ` · ${o.doc_hash.slice(0, 12)}…` : ""}
                  </p>

                  {o.regla_version_id ? (
                    <div className="pt-1 border-t border-black/[0.05] space-y-2">
                      <p className="text-[11px] text-ink/55">
                        Regla {o.regla_codigo ?? "—"} · unidad {o.regla_unidad ?? "—"} ·{" "}
                        {o.calendario_requerido ? "requiere calendario laboral" : "sin dependencia de calendario"}
                      </p>
                      <ReadinessBar
                        estado={o.readiness_estado}
                        reason={o.readiness_reason}
                        claimEstado={o.estado}
                        tieneRegla={Boolean(o.regla_version_id)}
                      />

                      {o.readiness_estado !== "APPLICABLE" && (
                        <p
                          className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/45"
                          title={o.readiness_reason ?? undefined}
                          data-reason={o.readiness_reason ?? ""}
                        >
                          {DEGRADACION.NO_EVALUABLE} — <span className="normal-case font-normal tracking-normal">{traducirReason(o.readiness_reason)}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p
                      className="text-[11px] text-ink/60 leading-snug"
                      data-sin-regla={o.categoria ?? ""}
                    >
                      {semanticaClaimSinRegla(o.categoria, o.estado)}
                    </p>
                  )}

                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* CUMPLIMIENTO CONTRACTUAL TEMPORAL (SLA-E1.3) */}
      <SlaContractual programaId={programaId} />

      {/* ECONOMÍA */}

      <section className="rounded-2xl border border-black/[0.06] bg-white p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <BloqueEconomia
            noCero={ficha?.economia?.n_ots_importe_no_cero ?? 0}
            cero={ficha?.economia?.n_ots_importe_cero ?? 0}
            nulo={ficha?.economia?.n_ots_importe_nulo ?? 0}
            total={total}
          />
          <div className="rounded-xl border border-black/[0.06] p-4 text-[11px] text-ink/50 leading-relaxed">
            <p className="flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-ink/35" aria-hidden />
              El importe por OT procede del ERP: la fuente está cargada, pero no está validada ni
              reconciliada con facturación. Un importe a cero es un valor observado, no un dato
              ausente. No se suman ni se promedian importes.
            </p>
          </div>

        </div>
      </section>

      {/* Bloque reservado */}
      <section className="rounded-2xl border border-dashed border-black/[0.12] bg-black/[0.015] p-5">
        <Eyebrow>Causas · Prioridades · Acciones</Eyebrow>
        <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink/45">
          CAPACIDAD AÚN NO HABILITADA
        </p>
        <p className="mt-1 text-[11px] text-ink/45 leading-snug">
          No se emiten diagnósticos ni recomendaciones mientras no exista evaluación fiable de
          obligaciones contra el dato operativo.
        </p>
      </section>
    </div>
  );
};

// ── Página ──────────────────────────────────────────────────────────────────
export const PerformanceReal = () => {
  const { filters, setFilters } = useOpsFilters();
  const [vertical, setVertical] = useState<string | null>(null);
  const [cliente, setCliente] = useState<string | null>(null);

  const resumenQ = useOpsRpc<PortfolioResumenFila[]>("ctr_portfolio_resumen");
  const arbolQ = useOpsRpc<PortfolioArbolFila[]>("ctr_portfolio_arbol");
  const noResueltasQ = useOpsRpc<PortfolioNoResueltaFila[]>("ctr_portfolio_no_resueltas");
  // SLA-E1.3 · chip de disponibilidad de indicadores temporales contractuales.
  const dispQ = useOpsRpc<SlaDisponibilidadFila[]>("ctr_sla_disponibilidad");


  const fallos = [
    ...falloDeQuery("ctr_portfolio_resumen", resumenQ, "portfolio por vertical"),
    ...falloDeQuery("ctr_portfolio_arbol", arbolQ, "árbol de programas"),
    ...falloDeQuery("ctr_portfolio_no_resueltas", noResueltasQ, "población no resuelta"),
  ];
  const reintentar = () => {
    void resumenQ.refetch(); void arbolQ.refetch(); void noResueltasQ.refetch();
  };

  const filas = Array.isArray(resumenQ.data) ? resumenQ.data : [];
  const arbol = Array.isArray(arbolQ.data) ? arbolQ.data : [];
  const noResueltas = Array.isArray(noResueltasQ.data) ? noResueltasQ.data : [];


  const verticales = filas.filter((f) => f.vertical_codigo !== CODIGO_SIN_RESOLVER);
  const sinResolver = filas.filter((f) => f.vertical_codigo === CODIGO_SIN_RESOLVER);
  const totalCartera =
    filas.reduce((a, f) => a + Number(f.n_ots || 0), 0);

  const programaSeleccionado = filters.programa;

  /** programa_id → disponibilidad; y agregado por cliente. Nunca inventa ceros. */
  const disponibilidad = useMemo(
    () => (Array.isArray(dispQ.data) ? dispQ.data : []) as SlaDisponibilidadFila[],
    [dispQ.data],
  );
  const dispPorPrograma = useMemo(
    () => new Map(disponibilidad.map((d) => [d.programa_id, d])),
    [disponibilidad],
  );
  const dispPorCliente = useMemo(() => {
    const m = new Map<string, { n: number; pub: number }>();
    for (const d of disponibilidad) {
      const k = d.cliente_id ?? "sin_cliente";
      const prev = m.get(k) ?? { n: 0, pub: 0 };
      prev.n += Number(d.n_kpis || 0);
      prev.pub += Number(d.n_publicables || 0);
      m.set(k, prev);
    }
    return m;
  }, [disponibilidad]);
  const chipDisponibilidad = (n: number, pub: number) =>
    n === 0 ? "" : ` · ${n} indicador(es) temporal(es), ${pub} publicable(s)`;


  const clientesDeVertical = useMemo(() => {
    if (!vertical) return [];
    const m = new Map<string, { nombre: string; ots: number; programas: number }>();
    for (const p of arbol) {
      if (p.vertical_codigo !== vertical) continue;
      const key = p.cliente_id ?? "sin_cliente";
      const prev = m.get(key) ?? { nombre: p.cliente_nombre ?? "Cliente no asignado", ots: 0, programas: 0 };
      prev.ots += Number(p.n_ots || 0);
      prev.programas += 1;
      m.set(key, prev);
    }
    return [...m.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.ots - a.ots);
  }, [arbol, vertical]);

  const programasDeCliente = useMemo(
    () => arbol.filter((p) => p.vertical_codigo === vertical && (p.cliente_id ?? "sin_cliente") === cliente),
    [arbol, vertical, cliente],
  );

  if (fallos.length && filas.length === 0) {
    return <OpsErrorBlock fallos={fallos} onReintentar={reintentar} />;
  }

  if (programaSeleccionado) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-10 py-8">
        <FichaPrograma
          programaId={programaSeleccionado}
          onVolver={() => setFilters({ programa: null })}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-10 py-8 space-y-6">
      <header className="space-y-2">
        <Eyebrow>WG Operaciones · Performance</Eyebrow>
        <h1 className="heading-display text-2xl md:text-3xl text-ink">Performance Real</h1>
        <p className="text-[13px] text-ink/60 max-w-3xl leading-relaxed">
          Jerarquía WG → Vertical → Cliente → Programa. Cada bloque muestra lo que la base de
          datos puede sostener hoy: servicio medido, contrato representado y economía observable.
          Lo que no está representado se declara como tal; no se estima.
        </p>
        <DataAsOf />
      </header>

      {fallos.length > 0 && (
        <OpsErrorBlock fallos={fallos} onReintentar={reintentar} conservaDatos />
      )}

      {/* Migas del drill */}
      {(vertical || cliente) && (
        <nav className="flex items-center gap-2 text-[12px] text-ink/55">
          <button type="button" onClick={() => { setVertical(null); setCliente(null); }} className="hover:text-ink">
            Todas las verticales
          </button>
          {vertical && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <button type="button" onClick={() => setCliente(null)} className="hover:text-ink">
                {verticales.find((v) => v.vertical_codigo === vertical)?.vertical_nombre ?? vertical}
              </button>
            </>
          )}
          {cliente && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-ink">
                {clientesDeVertical.find((c) => c.id === cliente)?.nombre ?? "Cliente"}
              </span>
            </>
          )}
        </nav>
      )}

      {!vertical && (
        <>
          <div className="space-y-4">
            {verticales.length === 0 && !resumenQ.isPending && (
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink/45">
                {DEGRADACION.FUENTE_NO_CARGADA}
              </p>
            )}
            {verticales.map((f) => (
              <TarjetaVertical key={f.vertical_codigo} f={f} onDrill={() => setVertical(f.vertical_codigo)} />
            ))}
          </div>

          <section className="rounded-2xl border border-black/[0.08] bg-black/[0.02] p-5">
            <Eyebrow>Población sin programa resuelto</Eyebrow>
            <p className="mt-1 text-[12px] text-ink/60 max-w-2xl leading-snug">
              Estas OTs existen operativamente pero no tienen programa contractual resuelto de
              forma determinista. No se reparten entre programas; se muestran aparte para preservar
              el cuadre total.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {sinResolver.map((f) => (
                <div key={f.vertical_nombre} className="rounded-xl border border-black/[0.06] bg-white p-4">
                  <p className="text-[12px] text-ink">{etiquetaSinResolver(f.vertical_nombre)}</p>
                  <p className="mt-1 heading-display text-2xl text-ink">{fmtNum(f.n_ots)}</p>
                  <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink/45">
                    {DEGRADACION.NO_ATRIBUIBLE}
                  </p>
                </div>
              ))}
              {sinResolver.length === 0 && !resumenQ.isPending && (
                <p className="text-[12px] text-ink/50">Sin OTs pendientes de resolución.</p>
              )}
            </div>

            {noResueltas.length > 0 && (
              <div className="mt-5 overflow-x-auto">
                <p className="mb-2 text-[10.5px] text-ink/45 leading-snug max-w-3xl">
                  {NOTA_ALIAS_NO_GOBERNADO}
                </p>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[10.5px] uppercase tracking-[0.1em] text-ink/45">
                      <th className="py-1.5 pr-3 font-medium">Cliente operativo (literal ERP)</th>
                      <th className="py-1.5 pr-3 font-medium">Nivel de identidad</th>
                      <th className="py-1.5 pr-3 font-medium">Gobierno del alias</th>
                      <th className="py-1.5 pr-3 font-medium">Vertical candidata</th>
                      <th className="py-1.5 pr-3 font-medium text-right">OTs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {noResueltas.map((r, i) => (
                      <tr key={`${r.cliente_wg_origen ?? "sin"}-${i}`} className="border-t border-black/[0.05]">
                        <td className="py-1.5 pr-3 text-ink">
                          {r.cliente_wg_origen ?? r.cliente_nombre ?? "—"}
                        </td>
                        <td className="py-1.5 pr-3 text-ink/65">{etiquetaClaseNoResuelta(r.clase)}</td>
                        <td
                          className="py-1.5 pr-3 text-ink/65"
                          data-alias-gobernado={r.alias_gobernado ? "si" : "no"}
                        >
                          {r.cliente_nombre
                            ? `${etiquetaGobiernoAlias(r.alias_gobernado)}${r.alias_metodo ? ` · ${r.alias_metodo}` : ""}`
                            : "Sin alias registrado"}
                        </td>
                        <td className="py-1.5 pr-3 text-ink/65">
                          {r.vertical_nombre ?? DEGRADACION.NO_ATRIBUIBLE}
                        </td>
                        <td className="py-1.5 pr-3 text-right text-ink tabular-nums">{fmtNum(r.n_ots)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            )}

            <p className="mt-4 text-[11px] text-ink/45">
              Total OTs con resolución vigente: <span className="text-ink">{fmtNum(totalCartera)}</span>
            </p>
          </section>

        </>
      )}

      {vertical && !cliente && (
        <div className="space-y-2">
          {clientesDeVertical.length === 0 ? (
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink/45">
              {DEGRADACION.SIN_POBLACION}
            </p>
          ) : (
            clientesDeVertical.map((c) => (
              <FilaProgramaBtn
                key={c.id}
                label={c.nombre}
                sub={`${c.programas} programa(s)${chipDisponibilidad(dispPorCliente.get(c.id)?.n ?? 0, dispPorCliente.get(c.id)?.pub ?? 0)}`}
                right={`${fmtNum(c.ots)} OTs`}
                onClick={() => setCliente(c.id)}
              />
            ))
          )}
        </div>
      )}

      {vertical && cliente && (
        <div className="space-y-2">
          {programasDeCliente.map((p) => (
            <FilaProgramaBtn
              key={p.programa_id}
              label={p.programa_nombre ?? "Programa sin nombre"}
              sub={`${p.n_claims} claim(s) contractual(es) representado(s) · ${p.n_instrumentos} instrumento(s)${chipDisponibilidad(dispPorPrograma.get(p.programa_id)?.n_kpis ?? 0, dispPorPrograma.get(p.programa_id)?.n_publicables ?? 0)}`}
              right={`${fmtNum(p.n_ots)} OTs`}
              onClick={() => setFilters({ programa: p.programa_id })}
            />
          ))}
          {programasDeCliente.length === 0 && (
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink/45">
              {DEGRADACION.DATO_NO_DISPONIBLE}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceReal;
