import { AlertTriangle } from "lucide-react";
import { useDataQuality } from "@/hooks/useDataQuality";
import {
  DOMINIO_OPERATIVO,
  avisoObsolescencia,
  desfaseEntre,
  etiquetaAsOf,
  frescuraDominio,
  type DominioCarga,
} from "@/lib/ops-as-of";

/**
 * F4B · Cabecera temporal obligatoria de toda página operativa.
 *
 * Todo lo que se lee en /operaciones está medido contra la FECHA EFECTIVA DEL
 * DATO, no contra el día de hoy. Declararla evita la lectura falsa de "esto es
 * la foto de ahora mismo". Si el dato va más de 7 días por detrás, se avisa.
 */
export const DataAsOf = ({
  dominio = DOMINIO_OPERATIVO,
  /** Dominios adicionales que esta página cruza con el principal. */
  cruza = [],
  className = "",
}: {
  dominio?: DominioCarga;
  cruza?: readonly DominioCarga[];
  className?: string;
}) => {
  const { medidas } = useDataQuality();
  const cargas = medidas?.cargas ?? [];
  if (cargas.length === 0) return null;

  const f = frescuraDominio(cargas, dominio);
  const aviso = avisoObsolescencia(f);
  const desfases = cruza
    .map((d) => desfaseEntre(cargas, dominio, d))
    .filter((d): d is NonNullable<typeof d> => !!d && d.relevante);

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="inline-flex items-center gap-2 text-[11px] text-ink/55">
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
        {etiquetaAsOf(f.asOf, dominio)}
        {f.dias != null && <span className="text-ink/35">· {f.dias} d respecto a hoy</span>}
      </p>

      {aviso && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" aria-hidden />
          <span>{aviso}</span>
        </p>
      )}

      {desfases.map((d) => (
        <p
          key={d.b}
          className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2"
        >
          <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" aria-hidden />
          <span>{d.texto}</span>
        </p>
      ))}
    </div>
  );
};

export default DataAsOf;
