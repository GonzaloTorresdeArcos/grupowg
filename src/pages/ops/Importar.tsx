import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";

// Cabeceras esperadas (subset mínimo). El importador acepta cualquier CSV con estas columnas.
const COLUMN_MAP: Record<string, string> = {
  num_ot: "num_ot",
  numot: "num_ot",
  ot: "num_ot",
  fecha_creacion: "fecha_creacion",
  fecha_cierre: "fecha_cierre",
  fecha_primer_contacto: "fecha_primer_contacto",
  fecha_primera_visita: "fecha_primera_visita",
  fecha_baja: "fecha_baja",
  cliente_wg: "cliente_wg",
  cliente: "cliente_wg",
  sat: "sat",
  tipo_recurso: "tipo_recurso",
  tecnico: "tecnico",
  canal: "canal",
  delegacion: "delegacion",
  estado: "estado",
  situacion: "situacion",
  incidencia: "incidencia",
  aparato: "aparato",
  marca: "marca",
  modelo: "modelo",
  familia: "familia",
  subfamilia: "subfamilia",
  gama_origen: "gama_origen",
  seccion: "seccion",
  provincia: "provincia",
  municipio: "municipio",
  codigo_postal: "codigo_postal",
  cp: "codigo_postal",
  capital: "capital",
  dias_cierre: "dias_cierre",
  sla_cierre_dlab: "sla_cierre_dlab",
  kpi_20d: "kpi_20d",
  kpi_30d: "kpi_30d",
  tiene_piezas: "tiene_piezas",
  anio_garantia: "anio_garantia",
  importe_mo: "importe_mo",
  importe_desplazamiento: "importe_desplazamiento",
  fact_cli: "fact_cli",
  fact_sat: "fact_sat",
};

const NUMERIC_FIELDS = new Set(["dias_cierre", "sla_cierre_dlab", "anio_garantia", "importe_mo", "importe_desplazamiento", "fact_cli", "fact_sat"]);
const DATE_FIELDS = new Set(["fecha_creacion", "fecha_cierre", "fecha_primer_contacto", "fecha_primera_visita", "fecha_baja"]);
const BOOL_FIELDS = new Set(["kpi_20d", "kpi_30d", "tiene_piezas"]);

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s.]+/g, "_").replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i").replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/ñ/g, "n");

const parseBool = (v: string): boolean | null => {
  const s = v.trim().toLowerCase();
  if (["1", "true", "si", "sí", "y", "yes", "x"].includes(s)) return true;
  if (["0", "false", "no", "n", ""].includes(s)) s === "" ? null : false;
  if (s === "") return null;
  return false;
};

const parseDate = (v: string): string | null => {
  const s = v.trim();
  if (!s) return null;
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
};

const parseNum = (v: string): number | null => {
  const s = v.trim().replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// CSV parser mínimo (soporta comillas)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',' || c === ';') { row.push(cur); cur = ""; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === '\r') { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x && x.trim().length));
}

const Importar = () => {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ ok: number; skipped: number; sample: string[][] } | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleImport = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error("CSV vacío");
      const header = rows[0].map((h) => COLUMN_MAP[norm(h)] ?? null);
      const dataRows = rows.slice(1);
      const records: Record<string, unknown>[] = [];
      let skipped = 0;

      for (const r of dataRows) {
        const rec: Record<string, unknown> = {};
        for (let i = 0; i < header.length; i++) {
          const col = header[i];
          if (!col) continue;
          const raw = (r[i] ?? "").trim();
          if (DATE_FIELDS.has(col)) rec[col] = parseDate(raw);
          else if (NUMERIC_FIELDS.has(col)) rec[col] = parseNum(raw);
          else if (BOOL_FIELDS.has(col)) rec[col] = parseBool(raw);
          else rec[col] = raw || null;
        }
        if (!rec.num_ot) { skipped++; continue; }
        // Derivados
        const inc = String(rec.incidencia ?? "").toUpperCase();
        rec.es_anulado = inc === "ANULADO AVISO";
        rec.es_nff = inc.includes("NO PRESENTA AVERIA");
        rec.es_baja = String(rec.situacion ?? "").toLowerCase() === "baja";
        records.push(rec);
      }

      // Insertar en lotes de 500 con upsert por num_ot
      const chunk = 500;
      for (let i = 0; i < records.length; i += chunk) {
        const slice = records.slice(i, i + chunk);
        const { error } = await supabase.from("ops_fact_ot").upsert(slice as any, { onConflict: "num_ot" });
        if (error) throw error;
      }

      setPreview({ ok: records.length, skipped, sample: rows.slice(0, 4) });
      toast.success(`Importadas ${records.length} OTs`);
    } catch (e: any) {
      toast.error(e.message ?? "Error al importar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Carga mensual</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">Importar CSV</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Sube el extracto mensual del ERP. Se upsertea por <code className="text-ink/80">num_ot</code>, por lo que
          re-importar el mismo mes es seguro (sobrescribe).
        </p>
      </header>

      <div className="border border-dashed border-black/[0.16] rounded-2xl bg-white p-8">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-ink/70 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-ink file:text-bone hover:file:bg-ink/90"
        />
        {file && <p className="mt-3 text-xs text-ink/60">Seleccionado: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)</p>}
        <Button disabled={!file || busy} onClick={handleImport} className="mt-5 gap-2">
          <Upload className="h-4 w-4" /> {busy ? "Importando…" : "Importar"}
        </Button>
      </div>

      {preview && (
        <div className="border border-black/[0.06] rounded-2xl bg-white p-6">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-ink">{preview.ok} filas importadas</span>
            {preview.skipped > 0 && (
              <span className="text-ink/60 inline-flex items-center gap-1 ml-3">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> {preview.skipped} filas omitidas (sin num_ot)
              </span>
            )}
          </div>
        </div>
      )}

      <div className="border border-black/[0.06] rounded-2xl bg-black/[0.02] p-6 text-xs text-ink/60 space-y-2">
        <p className="font-medium text-ink/80">Columnas reconocidas</p>
        <p>num_ot · fecha_creacion · fecha_cierre · fecha_primer_contacto · fecha_primera_visita · fecha_baja · cliente_wg · sat · tipo_recurso · tecnico · canal · delegacion · estado · situacion · incidencia · aparato · marca · modelo · familia · subfamilia · gama_origen · seccion · provincia · municipio · codigo_postal · capital · dias_cierre · sla_cierre_dlab · kpi_20d · kpi_30d · tiene_piezas · anio_garantia · importe_mo · importe_desplazamiento · fact_cli · fact_sat</p>
        <p className="pt-2">Se calculan automáticamente: <code>es_anulado</code> (incidencia = ANULADO AVISO), <code>es_nff</code> (contiene NO PRESENTA AVERIA), <code>es_baja</code> (situación = Baja).</p>
      </div>
    </div>
  );
};

export default Importar;
