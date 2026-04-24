import { Award, MapPin, Star, TrendingUp, Users, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { marcaLabel } from "@/lib/catalogos";

export interface MatchCandidate {
  application_id: string;
  razon_social: string;
  nombre_comercial: string | null;
  current_tier: string;
  current_score: number;
  numero_tecnicos: number | null;
  capacidad_mensual: string | null;
  cobertura_match: boolean;
  familia_match: boolean;
  marca_match: boolean;
  match_score: number;
}

const tierIcon = {
  premium: Award,
  advanced: TrendingUp,
  basic: Star,
};

interface Props {
  candidate: MatchCandidate;
  rank: number;
  onAssign?: (id: string) => void;
  assigning?: boolean;
}

export const CandidateCard = ({ candidate: c, rank, onAssign, assigning }: Props) => {
  const Icon = tierIcon[c.current_tier as keyof typeof tierIcon] ?? Star;

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-all",
        rank === 1
          ? "border-ink bg-ink/[0.02] shadow-sm"
          : "border-border bg-card hover:border-ink/30",
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center text-sm font-mono",
              rank === 1 ? "bg-ink text-bone" : "bg-muted text-ink",
            )}
          >
            #{rank}
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg text-ink truncate">
              {c.nombre_comercial ?? c.razon_social}
            </p>
            <p className="text-xs text-muted-foreground truncate">{c.razon_social}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-xs text-muted-foreground">match</p>
          <p className="font-display text-2xl text-ink leading-none">{c.match_score}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge variant="outline" className="gap-1 capitalize">
          <Icon className="h-3 w-3" />
          {c.current_tier}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Star className="h-3 w-3" />
          {c.current_score} pts
        </Badge>
        {c.numero_tecnicos != null && (
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {c.numero_tecnicos} técnicos
          </Badge>
        )}
        {c.capacidad_mensual && (
          <Badge variant="outline" className="gap-1">
            <Wrench className="h-3 w-3" />
            {c.capacidad_mensual}/mes
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mb-4">
        <Indicator on={c.cobertura_match} label="Cobertura" icon={MapPin} />
        <Indicator on={c.familia_match} label="Familia" icon={Wrench} />
        <Indicator on={c.marca_match} label="Marca" icon={Award} />
      </div>

      {onAssign && (
        <Button
          size="sm"
          className="w-full"
          onClick={() => onAssign(c.application_id)}
          disabled={assigning}
        >
          {assigning ? "Asignando..." : rank === 1 ? "Asignar mejor candidato" : "Asignar este"}
        </Button>
      )}
    </div>
  );
};

const Indicator = ({
  on,
  label,
  icon: Icon,
}: {
  on: boolean;
  label: string;
  icon: typeof MapPin;
}) => (
  <div
    className={cn(
      "rounded-lg border px-2 py-1.5 flex items-center gap-1.5",
      on ? "border-teal/40 bg-teal/10 text-ink" : "border-border bg-muted/30 text-muted-foreground",
    )}
  >
    <Icon className="h-3 w-3" />
    <span className="truncate">{label}</span>
  </div>
);
