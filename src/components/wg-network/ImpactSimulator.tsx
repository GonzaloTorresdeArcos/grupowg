import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowUpRight, ChevronDown, Wrench, PackagePlus, ShieldCheck, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  ASSUMPTIONS_LIST,
  computeImpact,
  DEFAULT_INPUTS,
  type Gama,
  type ImpactInputs,
} from "@/lib/impact-model";
import { useTranslation } from "react-i18next";

const gamas: { id: Gama; label: string }[] = [
  { id: "blanca", label: "Blanca" },
  { id: "marron", label: "Marrón" },
  { id: "clima", label: "Clima" },
  { id: "pae", label: "PAE" },
  { id: "movilidad", label: "Movilidad" },
  { id: "multi", label: "Multi" },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.round(n));

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = value;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return value;
}

export const ImpactSimulator = () => {
  const { t } = useTranslation("wg-network");
  const navigate = useNavigate();

  const [inputs, setInputs] = useState<ImpactInputs>(DEFAULT_INPUTS);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const result = useMemo(() => computeImpact(inputs), [inputs]);
  const animatedTotal = useCountUp(result.impactoTotal);

  const cpValid = /^\d{5}$/.test(inputs.cp);

  const rows = [
    { icon: Wrench, label: t("sim.rows.repuesto"), value: result.ahorroRepuesto, color: "bg-teal" },
    { icon: PackagePlus, label: t("sim.rows.equipos"), value: result.ingresoEquipos, color: "bg-teal-deep" },
    { icon: ShieldCheck, label: t("sim.rows.garantias"), value: result.ingresoGarantias, color: "bg-teal-soft" },
    { icon: Clock, label: t("sim.rows.tiempo"), value: result.ahorroTiempo, color: "bg-ink-soft" },
  ];
  const maxRow = Math.max(...rows.map((r) => r.value), 1);

  // ── Lead capture ──
  const [lead, setLead] = useState({ nombre: "", empresa: "", email: "", telefono: "" });
  const submitLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.nombre || !lead.email) {
      toast.error(t("sim.capture.errRequired"));
      return;
    }
    toast.success(t("sim.capture.success"));
    const qs = cpValid ? `?cp=${encodeURIComponent(inputs.cp)}` : "";
    setTimeout(() => navigate(`/wg-network/inscripcion${qs}`), 400);
  };

  return (
    <section id="simulador" className="scroll-mt-24 py-20 md:py-28 bg-bone">
      <div className="container-tight">
        <div className="max-w-3xl mb-12">
          <p className="eyebrow mb-3">{t("sim.eyebrow")}</p>
          <h2 className="heading-display text-ink text-4xl md:text-6xl text-balance">
            {t("sim.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("sim.subtitle")}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Inputs */}
          <div className="lg:col-span-2 rounded-3xl bg-card border border-border p-6 md:p-8 shadow-sm">
            <h3 className="font-display text-xl text-ink mb-6">{t("sim.inputs.title")}</h3>

            <div className="space-y-6">
              {/* CP */}
              <div>
                <label className="text-sm font-medium text-ink flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-teal" /> {t("sim.inputs.cp")}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={inputs.cp}
                  onChange={(e) => setInputs({ ...inputs, cp: e.target.value.replace(/\D/g, "") })}
                  placeholder="28001"
                  className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal"
                />
                {cpValid && (
                  <p className="mt-2 text-sm text-teal flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> {t("sim.inputs.cpOk")}
                  </p>
                )}
              </div>

              {/* Intervenciones */}
              <div>
                <div className="flex justify-between items-baseline">
                  <label className="text-sm font-medium text-ink">{t("sim.inputs.intervenciones")}</label>
                  <span className="font-display text-lg text-ink">{inputs.intervencionesMes}</span>
                </div>
                <Slider
                  className="mt-3"
                  min={10}
                  max={300}
                  step={5}
                  value={[inputs.intervencionesMes]}
                  onValueChange={([v]) => setInputs({ ...inputs, intervencionesMes: v })}
                />
              </div>

              {/* Ticket medio */}
              <div>
                <div className="flex justify-between items-baseline">
                  <label className="text-sm font-medium text-ink">{t("sim.inputs.ticket")}</label>
                  <span className="font-display text-lg text-ink">{inputs.ticketMedio} €</span>
                </div>
                <Slider
                  className="mt-3"
                  min={15}
                  max={150}
                  step={1}
                  value={[inputs.ticketMedio]}
                  onValueChange={([v]) => setInputs({ ...inputs, ticketMedio: v })}
                />
              </div>

              {/* Gama */}
              <div>
                <label className="text-sm font-medium text-ink">{t("sim.inputs.gama")}</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {gamas.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setInputs({ ...inputs, gamaPrincipal: g.id })}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm transition-colors",
                        inputs.gamaPrincipal === g.id
                          ? "bg-ink text-background border-ink"
                          : "bg-background text-ink border-border hover:border-ink"
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced */}
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-ink"
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
                {t("sim.inputs.advanced")}
              </button>
              {showAdvanced && (
                <div className="space-y-5 pt-2 border-t border-border">
                  <div>
                    <div className="flex justify-between items-baseline">
                      <label className="text-sm font-medium text-ink">{t("sim.inputs.tecnicos")}</label>
                      <span className="font-display text-lg text-ink">{inputs.tecnicos}</span>
                    </div>
                    <Slider
                      className="mt-3"
                      min={1}
                      max={20}
                      step={1}
                      value={[inputs.tecnicos ?? 1]}
                      onValueChange={([v]) => setInputs({ ...inputs, tecnicos: v })}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-baseline">
                      <label className="text-sm font-medium text-ink">{t("sim.inputs.fuera")}</label>
                      <span className="font-display text-lg text-ink">
                        {Math.round((inputs.pctFueraGarantia ?? 0.4) * 100)}%
                      </span>
                    </div>
                    <Slider
                      className="mt-3"
                      min={0}
                      max={100}
                      step={5}
                      value={[Math.round((inputs.pctFueraGarantia ?? 0.4) * 100)]}
                      onValueChange={([v]) => setInputs({ ...inputs, pctFueraGarantia: v / 100 })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Result */}
          <div className="lg:col-span-3 rounded-3xl bg-gradient-to-br from-ink to-ink-soft text-background p-6 md:p-10 relative overflow-hidden">
            <p className="eyebrow text-teal-soft mb-3">{t("sim.result.eyebrow")}</p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-display text-5xl md:text-7xl text-background">
                {fmt(animatedTotal)} €
              </span>
              <span className="text-background/60 text-lg">{t("sim.result.perYear")}</span>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-teal/20 border border-teal/40 px-3 py-1 text-sm text-teal-soft">
              +{Math.round((result.multiplicador - 1) * 100)}% {t("sim.result.overCurrent")}
            </div>

            <div className="mt-8 space-y-4">
              {rows.map((r) => {
                const pct = (r.value / maxRow) * 100;
                const Icon = r.icon;
                return (
                  <div key={r.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-2 text-sm text-background/85">
                        <Icon className="h-4 w-4 text-teal-soft" strokeWidth={1.5} />
                        {r.label}
                      </span>
                      <span className="font-display text-lg text-background">{fmt(r.value)} €</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-background/10 overflow-hidden">
                      <div
                        className={cn("h-full transition-all duration-700 ease-out", r.color)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 rounded-2xl border border-teal/30 bg-teal/10 p-4 md:p-5">
              <p className="text-sm text-teal-soft">{t("sim.result.cashLabel")}</p>
              <p className="font-display text-2xl md:text-3xl text-background mt-1">
                +{fmt(result.cajaLiberada)} €
              </p>
              <p className="text-xs text-background/60 mt-1">{t("sim.result.cashNote")}</p>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowAssumptions((v) => !v)}
                className="flex items-center gap-1 text-xs text-background/60 hover:text-background"
              >
                <ChevronDown className={cn("h-3 w-3 transition-transform", showAssumptions && "rotate-180")} />
                {t("sim.result.assumptions")}
              </button>
              <p className="mt-2 text-xs text-background/50 max-w-lg">{t("sim.result.disclaimer")}</p>
              {showAssumptions && (
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-background/70">
                  {ASSUMPTIONS_LIST.map((a) => (
                    <div key={a.key} className="flex justify-between border-b border-background/10 py-1">
                      <span className="font-mono">{a.key}</span>
                      <span>{a.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Capture */}
        <div className="mt-8 rounded-3xl bg-ink text-background p-6 md:p-10">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div>
              <p className="eyebrow text-teal-soft mb-3">{t("sim.capture.eyebrow")}</p>
              <h3 className="font-display text-3xl md:text-4xl text-background text-balance">
                {t("sim.capture.title")}
              </h3>
              <p className="mt-3 text-background/70">{t("sim.capture.subtitle")}</p>
            </div>
            <form onSubmit={submitLead} className="grid gap-3 sm:grid-cols-2">
              <input
                required
                placeholder={t("sim.capture.nombre")}
                value={lead.nombre}
                onChange={(e) => setLead({ ...lead, nombre: e.target.value })}
                className="rounded-xl bg-background/10 border border-background/20 px-4 py-3 text-background placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-teal"
              />
              <input
                placeholder={t("sim.capture.empresa")}
                value={lead.empresa}
                onChange={(e) => setLead({ ...lead, empresa: e.target.value })}
                className="rounded-xl bg-background/10 border border-background/20 px-4 py-3 text-background placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-teal"
              />
              <input
                required
                type="email"
                placeholder={t("sim.capture.email")}
                value={lead.email}
                onChange={(e) => setLead({ ...lead, email: e.target.value })}
                className="rounded-xl bg-background/10 border border-background/20 px-4 py-3 text-background placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-teal"
              />
              <input
                type="tel"
                placeholder={t("sim.capture.telefono")}
                value={lead.telefono}
                onChange={(e) => setLead({ ...lead, telefono: e.target.value })}
                className="rounded-xl bg-background/10 border border-background/20 px-4 py-3 text-background placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-teal"
              />
              <button
                type="submit"
                className="sm:col-span-2 mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-teal px-6 py-3.5 text-base font-medium text-ink hover:gap-3 transition-all"
              >
                {t("sim.capture.cta")} <ArrowUpRight className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
