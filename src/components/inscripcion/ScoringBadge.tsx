import { Award, ChevronUp, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoringResult, Tier } from "@/lib/scoring";
import { tierLabel } from "@/lib/scoring";

const tierConfig: Record<Tier, { Icon: typeof Star; bg: string; text: string; desc: string }> = {
  basic: {
    Icon: Star,
    bg: "bg-secondary border-border",
    text: "text-ink",
    desc: "Acceso a la red. Recibirás trabajos de tu zona y categoría.",
  },
  advanced: {
    Icon: TrendingUp,
    bg: "bg-teal/15 border-teal",
    text: "text-ink",
    desc: "Prioridad media en asignaciones. Acceso a coberturas y formación.",
  },
  premium: {
    Icon: Award,
    bg: "bg-ink text-bone border-ink",
    text: "text-bone",
    desc: "Máxima prioridad. Asignaciones preferentes, repuestos a coste y soporte dedicado.",
  },
};

export const ScoringBadge = ({ scoring }: { scoring: ScoringResult }) => {
  const cfg = tierConfig[scoring.tier];
  const Icon = cfg.Icon;
  const max = 100;
  const pct = Math.min(100, Math.round((scoring.total / max) * 100));

  return (
    <div className={cn("rounded-2xl border p-6 space-y-5", cfg.bg)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center",
            scoring.tier === "premium" ? "bg-bone text-ink" : "bg-ink text-bone",
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div className={cfg.text}>
            <p className="text-xs uppercase tracking-wider opacity-70">Tier propuesto</p>
            <p className="font-display text-2xl">{tierLabel(scoring.tier)}</p>
          </div>
        </div>
        <div className={cn("text-right", cfg.text)}>
          <p className="font-display text-4xl leading-none">{scoring.total}</p>
          <p className="text-xs opacity-70 mt-1">de {max} puntos</p>
        </div>
      </div>

      <p className={cn("text-sm leading-relaxed", cfg.text)}>{cfg.desc}</p>

      {/* Barra */}
      <div className="space-y-2">
        <div className={cn("h-1.5 rounded-full overflow-hidden", scoring.tier === "premium" ? "bg-bone/20" : "bg-ink/15")}>
          <div
            className={cn("h-full transition-all duration-700", scoring.tier === "premium" ? "bg-bone" : "bg-ink")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Desglose */}
      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {Object.entries(scoring.breakdown).map(([key, val]) => (
          <div key={key} className={cn("flex items-center justify-between", cfg.text, "opacity-90")}>
            <span>{key}</span>
            <span className="font-mono font-medium">{val} pts</span>
          </div>
        ))}
      </div>

      {scoring.recommendations.length > 0 && (
        <details className={cn("text-xs rounded-lg p-3 border", scoring.tier === "premium" ? "bg-bone/10 border-bone/20" : "bg-card border-border", cfg.text)}>
          <summary className="cursor-pointer font-medium flex items-center justify-between gap-2">
            Cómo subir tu tier ({scoring.recommendations.length})
            <ChevronUp className="h-3 w-3" />
          </summary>
          <ul className="mt-2 space-y-1 list-disc pl-5 opacity-90">
            {scoring.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};
