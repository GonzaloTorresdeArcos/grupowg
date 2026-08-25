import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useInvalidarOps } from "@/lib/ops-query";
import { guardarAsOfSesion } from "@/lib/ops-cache";
import { Upload, CheckCircle2, AlertTriangle, FileText, Loader2 } from "lucide-react";
import {
  parseCSV, detectTable, normalizeRow, conflictKey, TABLE_LABEL,
  DOMINIO_POR_TABLA, fechaAsOfDelLote, type OpsTable,
} from "@/lib/ops-csv";
import { fmtFechaEs, LABEL_DOMINIO_CARGA } from "@/lib/ops-as-of";

type Parsed = {
  file: string;
  table: OpsTable;
  header: string[];
  records: Record<string, unknown>[];
  skipped: number;
  totalRows: number;
  sample: string[][];
};

type Result = {
  inserted: number;
  updated: number;
  errors: number;
  errorSample: string[];
  /** F4B · Fecha efectiva registrada en ops_carga_log para este dominio. */
  asOf?: string | null;
  dominio?: string;
  logError?: string | null;
};


const CHUNK = 500;

const Importar = () => {
  const invalidarOps = useInvalidarOps();
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [manualTable, setManualTable] = useState<OpsTable | "">("");

  const previewRows = useMemo(() => parsed?.sample.slice(0, 6) ?? [], [parsed]);

  const handleFile = async (f: File) => {
    setFile(f);
    setParsed(null); setResult(null); setProgress(0);
    try {
      const text = await f.text();
      const rows = parseCSV(text);
      if (rows.length < 2) { toast.error("El CSV está vacío"); return; }
      const header = rows[0];
      const detected = detectTable(header);
      const table = (manualTable || detected) as OpsTable | null;
      if (!table) {
        toast.error("No se ha podido detectar el tipo de fichero. Selecciónalo manualmente.");
        return;
      }
      const dataRows = rows.slice(1);
      const records: Record<string, unknown>[] = [];
      let skipped = 0;
      for (const r of dataRows) {
        const rec = normalizeRow(table, header, r);
        if (!rec) { skipped++; continue; }
        records.push(rec);
      }
      setParsed({
        file: f.name,
        table,
        header,
        records,
        skipped,
        totalRows: dataRows.length,
        sample: rows.slice(0, 7),
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error leyendo el fichero";
      toast.error(err);
    }
  };

  const handleConfirm = async () => {
    if (!parsed) return;
    setBusy(true); setProgress(0);
    const res: Result = { inserted: 0, updated: 0, errors: 0, errorSample: [] };
    const key = conflictKey(parsed.table);

    // Para saber si un upsert es INSERT o UPDATE, hacemos lookup previo por clave en el lote.
    try {
      for (let i = 0; i < parsed.records.length; i += CHUNK) {
        const slice = parsed.records.slice(i, i + CHUNK);
        const keyCols = key.split(",");
        const keyVals = slice.map((r) => keyCols.map((c) => r[c]).join("‖"));

        // Lookup existentes
        let existingSet = new Set<string>();
        try {
          if (keyCols.length === 1) {
            const vals = slice.map((r) => r[keyCols[0]]).filter(Boolean) as (string | number)[];
            if (vals.length) {
              const { data } = await (supabase.from(parsed.table) as unknown as {
                select: (c: string) => {
                  in: (col: string, vs: (string | number)[]) => Promise<{ data: Record<string, unknown>[] | null }>;
                };
              })
                .select(keyCols[0])
                .in(keyCols[0], vals);
              existingSet = new Set((data ?? []).map((d) => String(d[keyCols[0]])));

            }
          } else {
            // Clave compuesta: preguntamos todo y filtramos en memoria
            const { data } = await (supabase.from(parsed.table) as unknown as {
              select: (cols: string) => {
                in: (col: string, vals: (string | number)[]) => Promise<{ data: Record<string, unknown>[] | null }>;
              };
            })
              .select(keyCols.join(","))
              .in(keyCols[0], slice.map((r) => r[keyCols[0]]).filter(Boolean) as (string | number)[]);
            existingSet = new Set(
              (data ?? []).map((d) => keyCols.map((c) => String(d[c])).join("‖")),
            );
          }

        } catch {
          /* si el lookup falla, contamos todo como insertado (conservador) */
        }

        const inserts = keyVals.filter((k) => !existingSet.has(k)).length;
        const updates = slice.length - inserts;

        const { error } = await supabase
          .from(parsed.table)
          .upsert(slice as never, { onConflict: key });
        if (error) {
          // Reintento fila a fila: no descartar 500 por una fila mala
          let rowInserted = 0;
          let rowUpdated = 0;
          for (let j = 0; j < slice.length; j++) {
            const row = slice[j];
            const rowKey = keyVals[j];
            const { error: rowErr } = await supabase
              .from(parsed.table)
              .upsert([row] as never, { onConflict: key });
            if (rowErr) {
              res.errors += 1;
              if (res.errorSample.length < 5) res.errorSample.push(rowErr.message);
            } else if (existingSet.has(rowKey)) {
              rowUpdated += 1;
            } else {
              rowInserted += 1;
            }
          }
          res.inserted += rowInserted;
          res.updated += rowUpdated;
        } else {
          res.inserted += inserts;
          res.updated += updates;
        }
        setProgress(Math.min(100, Math.round(((i + slice.length) / parsed.records.length) * 100)));
      }
      // F4B · Registro del reloj de datos. Solo se anota si de verdad entraron
      // filas: una importación fallida no puede adelantar la fecha efectiva.
      const dominio = DOMINIO_POR_TABLA[parsed.table];
      const filasOk = res.inserted + res.updated;
      if (filasOk > 0) {
        const asOfLote = fechaAsOfDelLote(parsed.table, parsed.records);
        const { error: logErr } = await supabase.from("ops_carga_log").insert({
          dominio,
          fuente: parsed.file,
          last_successful_load: new Date().toISOString(),
          data_as_of_date: asOfLote,
          filas: filasOk,
          origen: "importador",
          notas: res.errors > 0 ? `${res.errors} filas con error` : null,
        } as never);
        res.asOf = asOfLote;
        res.dominio = LABEL_DOMINIO_CARGA[dominio];
        res.logError = logErr?.message ?? null;
      }
      setResult(res);
      toast.success(`Importación completa · ${res.inserted} nuevas · ${res.updated} actualizadas`);
      // A1 · La foto del dato ha cambiado: toda la caché de análisis queda
      // obsoleta y se invalida explícitamente (no hay refresco por tiempo).
      if (filasOk > 0) {
        await invalidarOps();
        guardarAsOfSesion(res.asOf);
        toast.message("Datos actualizados: caché de análisis invalidada");
      }

    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al importar";
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setFile(null); setParsed(null); setResult(null); setProgress(0); setManualTable(""); };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Carga mensual</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">Importar CSV</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          El importador detecta el tipo de fichero por sus cabeceras (OTs, técnicos, portfolio o benchmark),
          previsualiza y actualiza por lotes. Reejecutable sin duplicados: se hace upsert por la clave natural.
        </p>
      </header>

      {/* Paso 1: selector */}
      {!parsed && (
        <div className="border border-dashed border-black/[0.16] rounded-2xl bg-white p-8 space-y-4">
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">Tipo de fichero</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setManualTable("")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                manualTable === "" ? "bg-ink text-bone border-ink" : "border-black/[0.12] text-ink/70 hover:border-ink/40"
              }`}
            >Auto-detectar</button>
            {(Object.keys(TABLE_LABEL) as OpsTable[]).map((t) => (
              <button
                key={t}
                onClick={() => setManualTable(t)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  manualTable === t ? "bg-ink text-bone border-ink" : "border-black/[0.12] text-ink/70 hover:border-ink/40"
                }`}
              >{TABLE_LABEL[t].split(" (")[0]}</button>
            ))}
          </div>

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            className="block w-full text-sm text-ink/70 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-ink file:text-bone hover:file:bg-ink/90"
          />
          <p className="text-[11px] text-ink/40">
            Formato CSV con cabeceras. Fechas admitidas: dd/mm/aaaa o yyyy-mm-dd. Decimales con coma o punto. Separador , o ;.
          </p>
        </div>
      )}

      {/* Paso 2: preview */}
      {parsed && !result && (
        <div className="space-y-6">
          <div className="border border-black/[0.06] rounded-2xl bg-white p-6">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-ink/60 mt-0.5" />
                <div>
                  <p className="font-medium text-ink">{parsed.file}</p>
                  <p className="text-xs text-ink/50">{TABLE_LABEL[parsed.table]}</p>
                </div>
              </div>
              <div className="flex gap-8 text-right">
                <div><p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">Filas</p><p className="font-display text-xl tabular-nums text-ink">{parsed.totalRows.toLocaleString("es-ES")}</p></div>
                <div><p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">Válidas</p><p className="font-display text-xl tabular-nums text-ink">{parsed.records.length.toLocaleString("es-ES")}</p></div>
                <div><p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">Omitidas</p><p className="font-display text-xl tabular-nums text-ink">{parsed.skipped.toLocaleString("es-ES")}</p></div>
              </div>
            </div>
            {parsed.skipped > 0 && (
              <p className="mt-4 text-xs text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> {parsed.skipped} filas omitidas por falta de clave obligatoria.
              </p>
            )}
          </div>

          <div className="border border-black/[0.06] rounded-2xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-black/[0.06]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Previsualización</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-black/[0.02]">
                  <tr>
                    {parsed.header.map((h, i) => (
                      <th key={i} className="text-left font-medium px-3 py-2 text-ink/60 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(1).map((r, i) => (
                    <tr key={i} className="border-t border-black/[0.04]">
                      {r.map((c, j) => (
                        <td key={j} className="px-3 py-2 text-ink/80 whitespace-nowrap">{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <Button variant="ghost" onClick={reset} disabled={busy}>Descartar</Button>
            <div className="flex items-center gap-3">
              {busy && (
                <span className="text-xs text-ink/60 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {progress}%
                </span>
              )}
              <Button disabled={busy || parsed.records.length === 0} onClick={handleConfirm} className="gap-2">
                <Upload className="h-4 w-4" /> Confirmar e importar {parsed.records.length.toLocaleString("es-ES")} filas
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Paso 3: resultado */}
      {result && (
        <div className="border border-black/[0.06] rounded-2xl bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="font-display text-lg tracking-tight text-ink">Importación completada</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">Nuevas</p><p className="font-display text-2xl tabular-nums text-ink">{result.inserted.toLocaleString("es-ES")}</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">Actualizadas</p><p className="font-display text-2xl tabular-nums text-ink">{result.updated.toLocaleString("es-ES")}</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">Errores</p><p className={`font-display text-2xl tabular-nums ${result.errors > 0 ? "text-red-600" : "text-ink"}`}>{result.errors.toLocaleString("es-ES")}</p></div>
          </div>
          {result.dominio && (
            <div className="text-xs rounded-lg border border-black/[0.08] bg-black/[0.02] p-3 text-ink/70 space-y-1">
              <p>
                Dominio actualizado: <span className="font-medium text-ink">{result.dominio}</span>
                {result.asOf
                  ? <> · datos operativos a <span className="font-medium text-ink">{fmtFechaEs(result.asOf)}</span></>
                  : <> · sin fecha efectiva deducible en este fichero</>}
              </p>
              {result.logError && (
                <p className="text-amber-700">
                  No se pudo registrar la carga en el histórico ({result.logError}): las fechas mostradas en la sección pueden quedar desactualizadas.
                </p>
              )}
            </div>
          )}

          {result.errorSample.length > 0 && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3 space-y-1">
              {result.errorSample.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}
          <div className="pt-2">
            <Button variant="ghost" onClick={reset}>Importar otro fichero</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Importar;
