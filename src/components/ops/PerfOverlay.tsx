import { useState } from "react";
import { X, Activity, Copy, Check } from "lucide-react";
import {
  HITOS, formatearBytes, informeTexto, limpiarHitos, limpiarMarcas, perfActivo,
  resumirMarcas, usePerfHitos, usePerfMarcas, type HitoId,
} from "@/lib/ops-perf";

/**
 * Overlay discreto de medición (`?perf=1`). No se monta si el flag no está
 * activo, de modo que en uso normal no añade ningún trabajo de render.
 */
export const PerfOverlay = () => {
  const activo = perfActivo();
  const marcas = usePerfMarcas();
  const hitos = usePerfHitos();
  const [abierto, setAbierto] = useState(true);
  const [copiado, setCopiado] = useState(false);
  if (!activo) return null;
  const r = resumirMarcas(marcas);

  const copiar = async () => {
    const txt = informeTexto(marcas, hitos);
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      // Entornos sin permiso de portapapeles: se deja el texto seleccionable.
      // eslint-disable-next-line no-console
      console.log(txt);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <div
      data-testid="perf-overlay"
      className="fixed bottom-3 right-3 z-50 w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-xl border border-black/10 bg-white/95 backdrop-blur shadow-lg text-ink"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06]">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-ink/50">
          <Activity className="h-3.5 w-3.5" /> Perf · {r.llamadas} RPC
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copiar}
            className="inline-flex items-center gap-1 text-[11px] text-ink/60 underline"
          >
            {copiado ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copiar informe
          </button>
          <button
            type="button"
            className="text-[11px] text-ink/50 underline"
            onClick={() => { limpiarMarcas(); limpiarHitos(); }}
          >
            Limpiar
          </button>
          <button type="button" aria-label="Cerrar" onClick={() => setAbierto((a) => !a)}>
            <X className="h-3.5 w-3.5 text-ink/40" />
          </button>
        </div>
      </div>
      {abierto && (
        <>
          <div className="px-3 py-2 border-b border-black/[0.06] text-[11px] tabular-nums space-y-0.5">
            {(Object.keys(HITOS) as HitoId[]).map((id) => {
              const h = hitos.find((x) => x.id === id);
              return (
                <div key={id} className="flex items-baseline justify-between gap-2">
                  <span className="text-ink/50">{HITOS[id]}</span>
                  <span className="text-ink/80">{h ? `${h.ms} ms` : "—"}</span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2 px-3 py-2 text-[11px] tabular-nums">
            <div><span className="text-ink/40">Suma</span><br />{r.msTotal} ms</div>
            <div><span className="text-ink/40">Máx</span><br />{r.msMax} ms</div>
            <div><span className="text-ink/40">Payload</span><br />{formatearBytes(r.bytes)}</div>
          </div>
          <div className="max-h-64 overflow-y-auto border-t border-black/[0.06]">
            {marcas.map((m) => (
              <div key={m.id} className="flex items-baseline justify-between gap-2 px-3 py-1 text-[11px] tabular-nums border-b border-black/[0.03]">
                <span className={`truncate ${m.error ? "text-red-600" : "text-ink/70"}`}>{m.rpc}</span>
                <span className="shrink-0 text-ink/50">{Math.round(m.ms)} ms · {formatearBytes(m.bytes)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
