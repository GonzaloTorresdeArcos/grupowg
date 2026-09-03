/**
 * SLA-E1.3 · Sección "Cumplimiento contractual temporal" dentro de la ficha de
 * programa de Performance Real.
 *
 * Contractual Intelligence es CAPA HABILITADORA de Performance Real: no hay
 * ruta, rail ni módulo propios. Esta sección solo se pinta cuando el programa
 * tiene indicadores temporales representados y gobernados.
 *
 * Toda la clasificación (oficial / sombra / escenario), el desglose territorial
 * y la agregación de motivos vienen resueltos de BD (`ctr_sla_programa_kpis`).
 * El frontend NO recalcula ni reclasifica nada.
 */
import { useMemo, useState } from "react";
import { AlertTriangle, Download, Info, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OpsErrorBlock, falloDeQuery } from "@/components/ops/OpsErrorBlock";
import { useOpsRpc } from "@/lib/ops-query";
import { fmtNum, fmtDec } from "@/lib/ops-filters";
import {
  BADGE_COBERTURA_LIMITADA,
  ETIQUETA_CLASIFICACION,
  ETIQUETA_RESULTADO,
  FORMULA_DENOMINADOR,
  MARCA_ESCENARIO,
  MARCA_SHADOW,
  NOTA_ALC02_PROXY,
  NOTA_ALC03_ESCENARIO,
  NOTA_PROFESSIONAL_8020,
  PROCEDENCIA_NORMALIZACION_DEFECTO,
  SALVEDAD_OCR,
  TEXTO_NO_EVALUABLE_FUERA,
  TEXTO_SIN_KPIS,
  TEXTO_ZONA_SUBORDINADA,
  TITULO_SECCION,
  csvDrilldown,
  descargarCsv,
  esOficial,
  etiquetaTerritorio,
  marcaDe,
  motivosOrdenados,
  traducirMotivoNoEvaluable,
  type SlaKpi,
  type SlaOtFila,
} from "@/lib/ops-sla-contractual";

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{children}</p>
);

const pct = (v: number | null | undefined) => (v == null ? null : `${fmtDec(v, 2)} %`);

// ── Popover de motivos de no evaluabilidad ──────────────────────────────────
const MotivosPopover = ({ k }: { k: SlaKpi }) => {
  const motivos = motivosOrdenados(k.universos_y_resultado?.motivos_no_evaluable);
  const n = k.universos_y_resultado?.not_evaluable_within_candidate ?? 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="underline decoration-dotted underline-offset-2 text-ink/60 hover:text-ink"
          aria-label="Ver motivos de no evaluabilidad"
        >
          {fmtNum(n)} no evaluables
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 text-[11px] leading-snug">
        <p className="font-semibold text-ink">Motivos de no evaluabilidad</p>
        <p className="mt-1 text-ink/55">{TEXTO_NO_EVALUABLE_FUERA}</p>
        {motivos.length === 0 ? (
          <p className="mt-2 text-ink/55">No hay motivos registrados.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {motivos.map((m) => (
              <li key={m.code} className="flex items-start justify-between gap-3">
                <span className="text-ink/70">{m.texto}</span>
                <span className="shrink-0 tabular-nums text-ink">{fmtNum(m.n)}</span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};

// ── Desglose territorial ────────────────────────────────────────────────────
const TablaTerritorial = ({ k }: { k: SlaKpi }) => {
  const filas = k.desglose_territorial ?? [];
  if (filas.length === 0) return null;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-ink/45 text-left">
            <th className="font-normal py-1">Ámbito</th>
            <th className="font-normal py-1 text-right">Candidatas</th>
            <th className="font-normal py-1 text-right">Cumplidas</th>
            <th className="font-normal py-1 text-right">Incumplidas</th>
            <th className="font-normal py-1 text-right">No evaluables</th>
            <th className="font-normal py-1 text-right">Adherencia</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.grupo} className="border-t border-black/[0.05]">
              <td className="py-1 text-ink/70">{etiquetaTerritorio(f.grupo)}</td>
              <td className="py-1 text-right tabular-nums">{fmtNum(f.candidata)}</td>
              <td className="py-1 text-right tabular-nums">{fmtNum(f.met)}</td>
              <td className="py-1 text-right tabular-nums">{fmtNum(f.missed)}</td>
              <td className="py-1 text-right tabular-nums">{fmtNum(f.not_evaluable)}</td>
              <td className="py-1 text-right tabular-nums text-ink">
                {f.adherencia_pct == null ? "no calculable" : pct(f.adherencia_pct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[10.5px] text-ink/45">
        Recuentos absolutos. Una n pequeña no se redondea ni se oculta: se lee junto al porcentaje.
      </p>
    </div>
  );
};

// ── Cobertura ───────────────────────────────────────────────────────────────
const Cobertura = ({ k }: { k: SlaKpi }) => {
  const c = k.cobertura;
  if (!c) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
      <span className="text-ink/55">
        Evaluables {fmtNum(c.evaluables)} / {fmtNum(c.candidate_population)} candidatas
        {c.ratio_evaluables_pct != null && ` · ${fmtDec(c.ratio_evaluables_pct, 2)} %`}
      </span>
      {c.limitada && (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700">
          <AlertTriangle className="h-3 w-3" aria-hidden /> {BADGE_COBERTURA_LIMITADA}
        </span>
      )}
    </div>
  );
};

// ── Panel de evidencia (a un clic) ──────────────────────────────────────────
type Evidencia = {
  as_of?: string | null;
  claim?: Record<string, unknown> | null;
  documento?: Record<string, unknown> | null;
  normalizacion?: Record<string, unknown> | null;
  regla?: Record<string, unknown> | null;
  mappings?: Record<string, unknown>[] | null;
  actos?: Record<string, unknown>[] | null;
};

const Campo = ({ label, valor }: { label: string; valor: unknown }) => (
  <div className="py-1">
    <p className="text-[10px] uppercase tracking-[0.1em] text-ink/40">{label}</p>
    <p className="text-[11.5px] text-ink/75 leading-snug break-words">
      {valor == null || valor === "" ? "—" : typeof valor === "object" ? JSON.stringify(valor) : String(valor)}
    </p>
  </div>
);

const PanelEvidencia = ({ k, onCerrar }: { k: SlaKpi; onCerrar: () => void }) => {
  const [tab, setTab] = useState<"contractual" | "normalizacion" | "gobierno">("contractual");
  const q = useOpsRpc<Evidencia>("ctr_sla_evidencia_kpi", { p_regla_version: k.regla_version_id });
  const e = q.data ?? null;
  const doc = e?.documento as Record<string, unknown> | null | undefined;
  const claim = e?.claim as Record<string, unknown> | null | undefined;
  const nor = e?.normalizacion as Record<string, unknown> | null | undefined;
  const reg = e?.regla as Record<string, unknown> | null | undefined;
  const fallo = falloDeQuery("ctr_sla_evidencia_kpi", q, "evidencia");

  const TABS = [
    ["contractual", "Literal contractual"],
    ["normalizacion", "Normalización WG"],
    ["gobierno", "Claim · regla · actos"],
  ] as const;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] overflow-y-auto border-l border-black/[0.08] bg-white shadow-xl"
      role="dialog"
      aria-label={`Evidencia de ${k.kpi}`}
    >
      <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-black/[0.06] bg-white px-5 py-3">
        <div className="min-w-0">
          <Eyebrow>Evidencia · {k.kpi}</Eyebrow>
          <p className="text-[12px] text-ink/60 truncate">{k.kpi_nombre ?? ""}</p>
        </div>
        <button type="button" onClick={onCerrar} aria-label="Cerrar evidencia"
          className="rounded-full p-1.5 hover:bg-black/[0.04]">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-1 border-b border-black/[0.06] px-5 py-2">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`rounded-full px-3 py-1 text-[11px] ${
              tab === id ? "bg-ink text-bone" : "text-ink/55 hover:bg-black/[0.04]"
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="px-5 py-4 space-y-2">
        {fallo && <OpsErrorBlock fallos={[fallo]} onReintentar={() => void q.refetch()} />}
        {!e && !fallo && <p className="text-[11.5px] text-ink/45">Cargando evidencia…</p>}

        {e && tab === "contractual" && (
          <>
            <Campo label="Literal contractual" valor={claim?.literal_contractual} />
            <Campo label="Referencia de página" valor={claim?.ref_pagina} />
            <Campo label="Documento" valor={doc?.fichero} />
            <Campo label="Tipo documental · fecha" valor={`${doc?.tipo_documental ?? "—"} · ${doc?.fecha_documento ?? "—"}`} />
            <Campo label="Estado de evidencia" valor={doc?.estado_evidencia} />
            <Campo label="Hash del documento" valor={doc?.hash} />
            {doc?.salvedad_ocr === true && (
              <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-700 leading-snug">
                {SALVEDAD_OCR}
              </p>
            )}
          </>
        )}

        {e && tab === "normalizacion" && (
          <>
            <Campo label="Literal documental" valor={nor?.literal_documental} />
            <Campo label="Unidad documental" valor={nor?.unidad_documental} />
            <Campo label="Normalización WG" valor={nor?.normalizacion_wg} />
            <Campo label="Plazo aplicado" valor={`${nor?.deadline_dias ?? "—"} ${nor?.deadline_unidad ?? ""}`} />
            <Campo label="Calendario" valor={nor?.calendar_type} />
            <p className="mt-2 rounded-lg border border-black/[0.06] bg-black/[0.02] px-3 py-2 text-[11px] text-ink/60 leading-snug">
              Procedencia: {String(nor?.procedencia ?? PROCEDENCIA_NORMALIZACION_DEFECTO)}
            </p>
            {(e.mappings ?? []).length > 0 && (
              <div className="pt-2">
                <Eyebrow>Mapeo operativo de hitos</Eyebrow>
                <ul className="mt-1 space-y-1">
                  {(e.mappings ?? []).map((m, i) => (
                    <li key={i} className="text-[11px] text-ink/65 leading-snug">
                      {String(m.rol_evento)} · {String(m.evento)} → ERP <span className="font-mono">{String(m.campo_erp)}</span>{" "}
                      · grado {String(m.grado)} · {String(m.estado)} · granularidad {String(m.granularidad)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {e && tab === "gobierno" && (
          <>
            <Campo label="Claim" valor={`${claim?.categoria ?? "—"} · ${claim?.estado ?? "—"}`} />
            <Campo label="Extraído por" valor={claim?.extraido_por} />
            <Campo label="Regla" valor={`v${reg?.version ?? "—"} · fase ${reg?.fase ?? "—"} · unidad ${reg?.unidad ?? "—"}`} />
            <Campo label="Valor estructurado del claim" valor={claim?.valor_estructurado} />
            <div className="pt-2">
              <Eyebrow>Actos de gobierno</Eyebrow>
              <ul className="mt-1 space-y-2">
                {(e.actos ?? []).map((a, i) => (
                  <li key={i} className="rounded-lg border border-black/[0.06] p-2.5">
                    <p className="text-[10.5px] text-ink/45">
                      {String(a.ts).slice(0, 10)} · {String(a.accion)} · {String(a.objeto_tipo)} ·{" "}
                      {String(a.actor_nombre ?? "—")} ({String(a.actor_rol ?? "—")})
                    </p>
                    <p className="text-[11px] text-ink/70 leading-snug mt-0.5">{String(a.motivo ?? "")}</p>
                    <p className="text-[10.5px] text-ink/45 mt-0.5">
                      {String(a.estado_anterior ?? "—")} → {String(a.estado_nuevo ?? "—")}
                      {a.fuente_procedencia ? ` · ${String(a.fuente_procedencia)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <p className="pt-3 text-[10.5px] text-ink/45">
          Fecha efectiva del dato (as-of): {e?.as_of ?? k.as_of ?? "no disponible"}
        </p>
      </div>
    </aside>
  );
};

// ── Drill-down de OTs ───────────────────────────────────────────────────────
const PanelOts = ({ k, onCerrar }: { k: SlaKpi; onCerrar: () => void }) => {
  const [resultado, setResultado] = useState<string>("TODOS");
  const [ambito, setAmbito] = useState<string>("TODOS");
  const q = useOpsRpc<SlaOtFila[]>("ctr_sla_temporal_ot", {
    p_regla_version: k.regla_version_id,
    p_escenario_baja: k.escenario_baja ?? "A",
  });
  const fallo = falloDeQuery("ctr_sla_temporal_ot", q, "detalle de OTs");
  const todas = useMemo(() => (Array.isArray(q.data) ? q.data : []), [q.data]);
  const ambitos = useMemo(
    () => Array.from(new Set(todas.map((f) => f.territorio_ot ?? "UNRESOLVED"))).sort(),
    [todas],
  );
  const filas = useMemo(
    () =>
      todas.filter(
        (f) =>
          (resultado === "TODOS" || f.temporal_result === resultado) &&
          (ambito === "TODOS" || (f.territorio_ot ?? "UNRESOLVED") === ambito),
      ),
    [todas, resultado, ambito],
  );

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-black/[0.08] bg-white shadow-xl"
      role="dialog"
      aria-label={`Detalle de OTs de ${k.kpi}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-3">
        <div className="min-w-0">
          <Eyebrow>Detalle · {k.kpi}</Eyebrow>
          <p className="text-[12px] text-ink/60 truncate">{k.kpi_nombre ?? ""}</p>
          <p className="text-[10.5px] text-ink/45">
            {ETIQUETA_CLASIFICACION[k.clasificacion]} · as-of {k.as_of ?? "—"}
          </p>
        </div>
        <button type="button" onClick={onCerrar} aria-label="Cerrar detalle"
          className="rounded-full p-1.5 hover:bg-black/[0.04]">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] px-5 py-2">
        <select aria-label="Filtrar por resultado" value={resultado}
          onChange={(ev) => setResultado(ev.target.value)}
          className="rounded-full border border-black/[0.08] px-2.5 py-1 text-[11px]">
          <option value="TODOS">Todos los resultados</option>
          <option value="MET">Cumplidas</option>
          <option value="MISSED">Incumplidas</option>
          <option value="NOT_EVALUABLE">No evaluables</option>
        </select>
        <select aria-label="Filtrar por ámbito" value={ambito}
          onChange={(ev) => setAmbito(ev.target.value)}
          className="rounded-full border border-black/[0.08] px-2.5 py-1 text-[11px]">
          <option value="TODOS">Todos los ámbitos</option>
          {ambitos.map((a) => <option key={a} value={a}>{etiquetaTerritorio(a)}</option>)}
        </select>
        <button
          type="button"
          onClick={() => descargarCsv(`${k.kpi}_detalle.csv`, csvDrilldown(k, filas))}
          disabled={filas.length === 0}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[11px] text-bone disabled:opacity-40"
        >
          <Download className="h-3 w-3" aria-hidden /> CSV
        </button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-3">
        {fallo && <OpsErrorBlock fallos={[fallo]} onReintentar={() => void q.refetch()} />}
        {!fallo && q.isPending && <p className="text-[11.5px] text-ink/45">Cargando OTs…</p>}
        {!fallo && !q.isPending && (
          <>
            <p className="mb-2 text-[10.5px] text-ink/45">
              {fmtNum(filas.length)} OTs mostradas de {fmtNum(todas.length)} candidatas.
            </p>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-ink/45">
                  <th className="font-normal py-1">OT</th>
                  <th className="font-normal py-1">Inicio</th>
                  <th className="font-normal py-1">Límite</th>
                  <th className="font-normal py-1">Fin</th>
                  <th className="font-normal py-1">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {filas.slice(0, 500).map((f) => (
                  <tr key={f.num_ot} className="border-t border-black/[0.05] align-top">
                    <td className="py-1 font-mono text-[10.5px]">{f.num_ot}</td>
                    <td className="py-1">{f.start_date ?? "—"}</td>
                    <td className="py-1">{f.deadline_date ?? "—"}</td>
                    <td className="py-1">{f.end_date ?? "—"}</td>
                    <td className="py-1">
                      <span className="text-ink/75">
                        {ETIQUETA_RESULTADO[f.temporal_result ?? ""] ?? f.temporal_result ?? "—"}
                      </span>
                      <span className="block text-[10px] text-ink/45">
                        {etiquetaTerritorio(f.territorio_ot ?? "UNRESOLVED")}
                        {f.reason_not_evaluable
                          ? ` · ${traducirMotivoNoEvaluable(f.reason_not_evaluable)}`
                          : ""}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filas.length > 500 && (
              <p className="mt-2 text-[10.5px] text-ink/45">
                Se muestran las primeras 500 filas. El CSV exporta las {fmtNum(filas.length)} filas filtradas.
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

// ── Tarjeta de KPI ──────────────────────────────────────────────────────────
const TarjetaKpi = ({ k, oficial, onOts, onEvidencia }: {
  k: SlaKpi; oficial: boolean; onOts: () => void; onEvidencia: () => void;
}) => {
  const u = k.universos_y_resultado;
  const met = u?.met ?? 0;
  const missed = u?.missed ?? 0;
  const denom = met + missed;
  const sinResultado = k.error_evaluacion != null || denom === 0;
  const marca = marcaDe(k.clasificacion);

  return (
    <div
      className={
        oficial
          ? "rounded-2xl border border-black/[0.08] bg-white p-4"
          : "rounded-xl border border-black/[0.06] bg-black/[0.015] p-4"
      }
      data-kpi={k.kpi}
      data-clasificacion={k.clasificacion}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.12em] text-ink/40">{k.kpi}</p>
          <p className="text-[12.5px] text-ink/75 leading-snug">{k.kpi_nombre ?? "Indicador sin nombre"}</p>
        </div>
        <span className="shrink-0 rounded-full border border-black/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-ink/55">
          Claim {k.claim_estado ?? "—"}
        </span>
      </div>

      {marca && (
        <p className="mt-2 inline-block rounded-full border border-black/[0.12] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-ink/60">
          {marca}
        </p>
      )}

      {sinResultado ? (
        <p className="mt-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink/45">
          Sin resultado calculable
          <span className="block normal-case font-normal tracking-normal text-ink/55">
            {k.error_evaluacion ?? k.next_blocker ?? "No hay población evaluable para este indicador."}
          </span>
        </p>
      ) : (
        <p className={oficial
          ? "mt-3 heading-display text-[32px] leading-none text-ink"
          : "mt-3 text-[20px] font-medium text-ink/70"}>
          {pct(u?.temporal_adherence_pct)}
        </p>
      )}

      <p className="mt-2 text-[11px] text-ink/60">
        Cumplidas {fmtNum(met)} · Incumplidas {fmtNum(missed)} · <MotivosPopover k={k} />
      </p>
      <p className="mt-0.5 text-[10.5px] text-ink/45">
        Denominador {FORMULA_DENOMINADOR} = {fmtNum(denom)}. {TEXTO_NO_EVALUABLE_FUERA}
      </p>

      <Cobertura k={k} />

      {!k.evaluation_ready && k.next_blocker && (
        <p className="mt-2 text-[10.5px] text-ink/55">Bloqueo: {k.next_blocker}</p>
      )}

      <TablaTerritorial k={k} />

      {k.es_professional_8020 && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-black/[0.06] bg-black/[0.02] px-3 py-2 text-[10.5px] text-ink/60 leading-snug">
          <Info className="h-3.5 w-3.5 mt-px shrink-0 text-ink/35" aria-hidden />
          <span>
            {NOTA_PROFESSIONAL_8020}{" "}
            <span className="text-ink/45">
              El 80/20 es un mecanismo contractual de imputabilidad de responsabilidad, no un
              objetivo de servicio ni un target de resultado.
            </span>
          </span>
        </p>
      )}

      {k.clasificacion === "SHADOW_RESULT_ONLY" && (
        <p className="mt-2 text-[10.5px] text-ink/55 leading-snug">{NOTA_ALC02_PROXY}</p>
      )}
      {k.clasificacion === "MANAGEMENT_SCENARIO_ONLY" && (
        <p className="mt-2 text-[10.5px] text-ink/55 leading-snug">{NOTA_ALC03_ESCENARIO}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
        <button type="button" onClick={onOts} className="text-ink underline underline-offset-2">
          Ver OTs
        </button>
        <button type="button" onClick={onEvidencia} className="text-ink/60 underline underline-offset-2">
          Evidencia y as-of
        </button>
        <span className="ml-auto text-[10.5px] text-ink/40">as-of {k.as_of ?? "—"}</span>
      </div>
    </div>
  );
};

// ── Sección ─────────────────────────────────────────────────────────────────
export const SlaContractual = ({ programaId }: { programaId: string }) => {
  const q = useOpsRpc<SlaKpi[]>("ctr_sla_programa_kpis", { p_programa: programaId });
  const fallo = falloDeQuery("ctr_sla_programa_kpis", q, "cumplimiento contractual temporal");
  const kpis = useMemo(() => (Array.isArray(q.data) ? q.data : []), [q.data]);
  const [ots, setOts] = useState<SlaKpi | null>(null);
  const [evid, setEvid] = useState<SlaKpi | null>(null);

  const oficiales = kpis.filter((k) => esOficial(k.clasificacion));
  const otros = kpis.filter((k) => !esOficial(k.clasificacion));

  // Sin representación: la sección no se pinta en absoluto (no hay ceros).
  if (!fallo && !q.isPending && kpis.length === 0) {
    return (
      <section className="rounded-2xl border border-black/[0.06] bg-white p-5">
        <Eyebrow>{TITULO_SECCION}</Eyebrow>
        <p className="mt-2 text-[12.5px] text-ink/65 leading-snug max-w-2xl">{TEXTO_SIN_KPIS}</p>
        <p className="mt-1 text-[11px] text-ink/45">
          Los claims representados de este programa se listan más arriba, en Contrato.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-black/[0.06] bg-white p-5 space-y-4">
      <div>
        <Eyebrow>{TITULO_SECCION}</Eyebrow>
        <p className="mt-1 text-[11px] text-ink/45 leading-snug max-w-2xl">
          Resultados calculados en base de datos sobre la población gobernada de cada indicador. El
          panel no recalcula ni reinterpreta: presenta lo que la capa contractual clasifica.
        </p>
      </div>

      {fallo && <OpsErrorBlock fallos={[fallo]} onReintentar={() => void q.refetch()} />}
      {q.isPending && !fallo && <p className="text-[11.5px] text-ink/45">Calculando indicadores…</p>}

      {oficiales.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/55">
            Resultado contractual publicable
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {oficiales.map((k) => (
              <TarjetaKpi key={k.regla_version_id} k={k} oficial
                onOts={() => setOts(k)} onEvidencia={() => setEvid(k)} />
            ))}
          </div>
        </div>
      )}

      {otros.length > 0 && (
        <div className="mt-2 rounded-2xl border border-dashed border-black/[0.12] bg-black/[0.02] p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/45">
            No contractual · resultados subordinados
          </p>
          <p className="text-[10.5px] text-ink/50 leading-snug max-w-2xl">{TEXTO_ZONA_SUBORDINADA}</p>
          <ul className="space-y-3">
            {otros.map((k) => (
              <li key={k.regla_version_id}>
                <TarjetaKpi k={k} oficial={false}
                  onOts={() => setOts(k)} onEvidencia={() => setEvid(k)} />
              </li>
            ))}
          </ul>
          <p className="text-[10px] uppercase tracking-[0.1em] text-ink/40">
            {MARCA_SHADOW} · {MARCA_ESCENARIO}
          </p>
        </div>
      )}

      {ots && <PanelOts k={ots} onCerrar={() => setOts(null)} />}
      {evid && <PanelEvidencia k={evid} onCerrar={() => setEvid(null)} />}
    </section>
  );
};

export default SlaContractual;
