import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Props {
  compact?: boolean;
}

/**
 * Diagrama animado del Service OS.
 * Nodos: Entrada → Diagnóstico → Asignación → Ejecución → Control
 * Modo compact = overlay del hero. Modo normal = sección dedicada.
 */
export const ServiceOSDiagram = ({ compact = false }: Props) => {
  const { t } = useTranslation("home-diagram");
  const labels = t("nodes", { returnObjects: true }) as string[];
  const positions = [
    { x: 8, y: 50 },
    { x: 28, y: 30 },
    { x: 48, y: 60 },
    { x: 72, y: 35 },
    { x: 92, y: 55 },
  ];
  const nodes = positions.map((p, i) => ({ ...p, label: labels[i] ?? "" }));

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl border border-foreground/10 bg-ink/85 backdrop-blur-md overflow-hidden",
        compact ? "p-4" : "p-8 md:p-12",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="badge-os">{t("liveBadge")}</div>
        <p className="font-mono text-[10px] text-bone/40 uppercase tracking-[0.18em]">
          {t("tag")}
        </p>
      </div>
      <div className={cn("relative w-full", compact ? "h-24" : "h-44 md:h-56")}>
        <svg
          viewBox="0 0 100 80"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {/* Líneas */}
          {nodes.slice(0, -1).map((n, i) => {
            const next = nodes[i + 1];
            return (
              <line
                key={`l-${i}`}
                x1={n.x}
                y1={n.y}
                x2={next.x}
                y2={next.y}
                stroke="hsl(var(--teal) / 0.35)"
                strokeWidth="0.4"
                strokeDasharray="1.5 1.5"
              />
            );
          })}
          {/* Nodos */}
          {nodes.map((n, i) => (
            <g key={`n-${i}`}>
              <circle cx={n.x} cy={n.y} r="2.4" fill="hsl(var(--teal))" />
              <circle
                cx={n.x}
                cy={n.y}
                r="4.5"
                fill="none"
                stroke="hsl(var(--teal))"
                strokeOpacity="0.4"
                style={{ animation: `pulse-dot 2.4s ${i * 0.35}s ease-in-out infinite` }}
              />
            </g>
          ))}
          {/* Pulso de datos viajando */}
          <circle r="1" fill="hsl(var(--teal-glow))">
            <animateMotion
              dur="6s"
              repeatCount="indefinite"
              path={`M ${nodes[0].x} ${nodes[0].y} ${nodes
                .slice(1)
                .map((n) => `L ${n.x} ${n.y}`)
                .join(" ")}`}
            />
          </circle>
        </svg>

        {/* Etiquetas */}
        {!compact &&
          nodes.map((n, i) => (
            <div
              key={`lbl-${i}`}
              className="absolute -translate-x-1/2 translate-y-3 text-center"
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bone/70">
                {n.label}
              </p>
            </div>
          ))}
      </div>
      {compact && (
        <div className="grid grid-cols-5 gap-1 mt-2">
          {nodes.map((n) => (
            <p
              key={n.label}
              className="font-mono text-[9px] uppercase tracking-[0.15em] text-bone/60 text-center truncate"
            >
              {n.label}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
