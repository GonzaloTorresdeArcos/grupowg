import { Construction } from "lucide-react";

/**
 * Placeholder limpio para módulos aún no implementados del plan V2.
 * Sin mocks, sin gráficos falsos, sin datos inventados.
 */
export const ModuloEnDiseno = ({
  titulo,
  fase,
  descripcion,
}: {
  titulo: string;
  fase: string;
  descripcion: string[];
}) => (
  <div className="space-y-6">
    <header>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-1">
        WG Operaciones
      </p>
      <h1 className="font-display text-2xl md:text-3xl tracking-tight text-ink">{titulo}</h1>
    </header>

    <section className="border border-black/[0.06] rounded-2xl bg-white p-8">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-black/[0.04] flex items-center justify-center shrink-0">
          <Construction className="h-5 w-5 text-ink/50" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg tracking-tight text-ink">
            Módulo en diseño — {fase}
          </p>
          <ul className="mt-3 space-y-1.5 text-[13.5px] text-ink/70 leading-relaxed">
            {descripcion.map((d) => (
              <li key={d} className="flex gap-2">
                <span className="text-ink/25">·</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink/45">
            No se muestran datos ni estimaciones hasta que la fuente esté cargada y auditada.
          </p>
        </div>
      </div>
    </section>
  </div>
);
