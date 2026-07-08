import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowUpRight,
  ChevronDown,
  Briefcase,
  PackagePlus,
  ShieldCheck,
  Clock,
  Wrench,
  MapPin,
  CheckCircle2,
  Copy,
  type LucideIcon,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  ASSUMPTIONS_LIST,
  computeImpact,
  DEFAULT_INPUTS,
  defaultWGAsignables,
  defaultLinea,
  PRICE_BY_GAMA,
  INSTALL_PRICE_BY_GAMA,
  type ImpactInputs,
  type Perfil,
  type Pais,
} from "@/lib/impact-model";
import { GAMAS } from "@/lib/gamas-taxonomy";
import { MARCAS_POR_GAMA } from "@/lib/marcas-por-gama";
import { InstaladorSimulador } from "@/components/wg-network/InstaladorSimulador";
import { useTranslation } from "react-i18next";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.round(n));

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = prev.current;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(step);
      else prev.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const PERFIL_TITLES: Record<Perfil, { title: string; subtitle: string }> = {
  sat: {
    title: "Mete 4 datos. Mira lo que WG puede hacer por tu SAT.",
    subtitle:
      "Dos minutos. Sin registros. Cálculo con tarifas reales de la red WG.",
  },
  instalador: {
    title: "Mete 4 datos. Mira lo que WG puede hacer por tu negocio de instalación.",
    subtitle:
      "Dos minutos. Sin registros. Cálculo con tickets reales de instalación.",
  },
  ambos: {
    title: "Repares o instales, mira lo que WG puede hacer por tu negocio.",
    subtitle:
      "Dos minutos. Sin registros. Basado en la operación real de la red WG.",
  },
};

const VolRow = ({ label, Icon, value, ticket, onChange }: { label: string; Icon: LucideIcon; value: number; ticket?: number; onChange: (n: number) => void }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="flex items-center gap-1.5 text-sm text-ink">
      <Icon className="h-4 w-4 text-teal" strokeWidth={1.5} /> {label}
      {ticket ? <span className="text-xs text-muted-foreground">~{ticket}€</span> : null}
    </span>
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onChange(Math.max(0, value - 5))} className="h-7 w-7 rounded-lg border border-border text-ink hover:border-ink flex items-center justify-center leading-none">−</button>
      <input type="text" inputMode="numeric" value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)))}
        className="w-12 text-center rounded-lg border border-border bg-background py-1.5 text-sm font-display" />
      <button type="button" onClick={() => onChange(value + 5)} className="h-7 w-7 rounded-lg border border-border text-ink hover:border-ink flex items-center justify-center leading-none">+</button>
    </div>
  </div>
);

export const ImpactSimulator = () => {
  const { t } = useTranslation("wg-network");
  const navigate = useNavigate();

  const [inputs, setInputs] = useState<ImpactInputs>(DEFAULT_INPUTS);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const wgOverride = useRef(false);

  // Autopropuesta de avisos WG asignables cuando cambian las gamas.
  useEffect(() => {
    if (wgOverride.current) return;
    setInputs((prev) => ({
      ...prev,
      intervencionesWGMes: defaultWGAsignables(prev.gamas),
    }));
  }, [inputs.gamas]);

  // Normaliza volúmenes al cambiar de perfil o gamas.
  useEffect(() => {
    setInputs((prev) => {
      const volumenes: Record<string, { rep: number; ins: number }> = {};
      for (const g of prev.gamas) {
        const v = prev.volumenes[g] ?? defaultLinea(prev.perfil);
        volumenes[g] = {
          rep: prev.perfil === "instalador" ? 0 : (v.rep > 0 ? v.rep : 20),
          ins: prev.perfil === "sat" ? 0 : (v.ins > 0 ? v.ins : 10),
        };
      }
      return { ...prev, volumenes };
    });
  }, [inputs.perfil]);

  const setVol = (gama: string, field: "rep" | "ins", val: number) =>
    setInputs((prev) => ({ ...prev, volumenes: { ...prev.volumenes, [gama]: { ...(prev.volumenes[gama] ?? { rep: 0, ins: 0 }), [field]: Math.max(0, val) } } }));


  const result = useMemo(() => computeImpact(inputs), [inputs]);
  const animatedTotal = useCountUp(result.impactoTotal);

  const cpValid =
    inputs.pais === "ES"
      ? /^\d{5}$/.test(inputs.cp)
      : /^\d{4}(-\d{3})?$/.test(inputs.cp);
  const [radioKm, setRadioKm] = useState(25);
  const [coords, setCoords] = useState<{ munis: string[]; cps: Record<string, [number, number, number]> } | null>(null);
  const [copiedCP, setCopiedCP] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setCoords(null);
    fetch(`/cp-coords-${inputs.pais.toLowerCase()}.json`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setCoords(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [inputs.pais]);
  const cobertura = useMemo(() => {
    if (!coords || !cpValid) return null;
    const key = inputs.pais === "ES" ? inputs.cp : inputs.cp.slice(0, 4);
    const center = coords.cps[key];
    if (!center) return null;
    const R = Math.PI / 180;
    const dkm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
      const la = ((aLat + bLat) / 2) * R;
      return 6371 * Math.hypot((bLng - aLng) * R * Math.cos(la), (bLat - aLat) * R);
    };
    const covered: string[] = [];
    const munis = new Set<number>();
    for (const k in coords.cps) {
      const v = coords.cps[k];
      if (dkm(center[0], center[1], v[0], v[1]) <= radioKm) { covered.push(k); munis.add(v[2]); }
    }
    const muniNames = [...munis].map((i) => coords.munis[i]).filter(Boolean).sort((a, b) => a.localeCompare(b));
    return { covered: covered.sort(), muniNames };
  }, [coords, cpValid, inputs.cp, inputs.pais, radioKm]);

  const rows = [
    { icon: Briefcase, label: "Trabajo que te asigna WG", value: result.ingresoWG, color: "bg-teal" },
    {
      icon: Wrench,
      label: `Repuesto OEM (–${Math.round(inputs.descuentoRepuesto * 100)}%)`,
      value: result.ahorroRepuesto,
      color: "bg-teal-deep",
    },
    { icon: PackagePlus, label: "Venta de equipos", value: result.ingresoEquipos, color: "bg-teal-soft" },
    { icon: ShieldCheck, label: "Garantías extendidas", value: result.ingresoGarantias, color: "bg-ink-soft" },
    { icon: Clock, label: t("sim.rows.tiempo"), value: result.ahorroTiempo, color: "bg-muted" },
  ];
  const maxRow = Math.max(...rows.map((r) => r.value), 1);

  const toggleGama = (code: string) => {
    setInputs((prev) => {
      const has = prev.gamas.includes(code);
      const next = has ? prev.gamas.filter((g) => g !== code) : [...prev.gamas, code];
      if (!next.length) return prev;
      const volumenes = { ...prev.volumenes };
      if (has) delete volumenes[code];
      else if (!volumenes[code]) volumenes[code] = defaultLinea(prev.perfil);
      return { ...prev, gamas: next, volumenes };
    });
  };




  // ── Lead capture ──
  const [lead, setLead] = useState({ nombre: "", empresa: "", email: "", telefono: "" });
  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.nombre || !lead.email) {
      toast.error(t("sim.capture.errRequired"));
      return;
    }

    try {
      await supabase.functions.invoke("submit-lead", {
        body: {
          nombre: lead.nombre,
          empresa: lead.empresa,
          email: lead.email,
          telefono: lead.telefono,
          cp: inputs.cp,
          intervenciones_mes: result.reparacionesMes + result.instalacionesMes,
          ticket_medio: Math.round(result.ticketMedio),
          gama: inputs.gamas[0] ?? null,
          impacto_total: result.impactoTotal,
          multiplicador: result.multiplicador,
          caja_liberada: result.cajaLiberada,
          breakdown: {
            perfil: inputs.perfil,
            pais: inputs.pais,
            provincia: inputs.provincia,
            gamas: inputs.gamas,
            volumenes: inputs.volumenes,
            reparacionesMes: result.reparacionesMes,
            instalacionesMes: result.instalacionesMes,
            intervencionesWGMes: inputs.intervencionesWGMes,
            descuentoRepuesto: inputs.descuentoRepuesto,
            ticketMedio: Math.round(result.ticketMedio),
            ingresoWG: result.ingresoWG,
            ahorroRepuesto: result.ahorroRepuesto,
            ingresoEquipos: result.ingresoEquipos,
            ingresoGarantias: result.ingresoGarantias,
            ahorroTiempo: result.ahorroTiempo,
          },
        },
      });
    } catch (err) {
      console.warn("[submit-lead] non-blocking error", err);
    }

    toast.success(t("sim.capture.success"));
    const params = new URLSearchParams();
    if (cpValid) params.set("cp", inputs.cp);
    if (lead.email) params.set("email", lead.email);
    if (lead.nombre) params.set("nombre", lead.nombre);
    if (lead.empresa) params.set("empresa", lead.empresa);
    if (lead.telefono) params.set("tel", lead.telefono);
    const qs = params.toString();
    setTimeout(() => navigate(`/wg-network/inscripcion${qs ? `?${qs}` : ""}`), 400);
  };

  const perfilCopy = PERFIL_TITLES[inputs.perfil];

  return (
    <section id="simulador" className="scroll-mt-24 py-20 md:py-28 bg-bone">
      <div className="container-tight">
        <div className="max-w-3xl mb-12">
          <p className="eyebrow mb-3">{t("sim.eyebrow")}</p>
          <h2 className="heading-display text-ink text-4xl md:text-6xl text-balance">
            {perfilCopy.title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{perfilCopy.subtitle}</p>
        </div>

        <div className="mb-8">
          <div className="inline-grid grid-cols-3 rounded-full bg-muted p-1">
            {(["sat", "instalador", "ambos"] as Perfil[]).map((p) => (
              <button key={p} type="button" onClick={() => setInputs({ ...inputs, perfil: p })}
                className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition-colors", inputs.perfil === p ? "bg-ink text-background" : "text-muted-foreground hover:text-ink")}>
                {p === "sat" ? "SAT" : p === "instalador" ? "Instalador" : "Ambos"}
              </button>
            ))}
          </div>
        </div>

        {inputs.perfil === "instalador" ? (
          <InstaladorSimulador />
        ) : (
        <>
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Inputs */}
          <div className="lg:col-span-2 rounded-3xl bg-card border border-border p-6 md:p-8 shadow-sm">
            <h3 className="font-display text-xl text-ink mb-6">Tu negocio hoy</h3>

            <div className="space-y-6">
              {/* Perfil */}
              <div>
                <label className="text-sm font-medium text-ink">Perfil</label>
                <div className="mt-2 grid grid-cols-3 rounded-full bg-muted p-1">
                  {(["sat", "instalador", "ambos"] as Perfil[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setInputs({ ...inputs, perfil: p })}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-sm font-medium transition-colors capitalize",
                        inputs.perfil === p
                          ? "bg-ink text-background"
                          : "text-muted-foreground hover:text-ink"
                      )}
                    >
                      {p === "sat" ? "SAT" : p === "instalador" ? "Instalador" : "Ambos"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cobertura: país + CP + radio de acción */}
              <div>
                <label className="text-sm font-medium text-ink flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-teal" /> Cobertura — tu radio de acción
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["ES", "PT"] as Pais[]).map((p) => (
                    <button key={p} type="button"
                      onClick={() => setInputs({ ...inputs, pais: p, provincia: "", cp: "" })}
                      className={cn("rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                        inputs.pais === p ? "bg-ink text-background border-ink" : "bg-background text-ink border-border hover:border-ink")}>
                      {p === "ES" ? "🇪🇸 España" : "🇵🇹 Portugal"}
                    </button>
                  ))}
                </div>
                <input type="text" inputMode="numeric" maxLength={inputs.pais === "ES" ? 5 : 8}
                  value={inputs.cp}
                  onChange={(e) => setInputs({ ...inputs, cp: inputs.pais === "ES" ? e.target.value.replace(/\D/g, "") : e.target.value.replace(/[^\d-]/g, "") })}
                  placeholder={inputs.pais === "ES" ? "28009" : "1000-001"}
                  className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal" />
                <div className="mt-3 flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Radio de acción</span>
                  <span className="font-display text-base text-ink">{radioKm} km</span>
                </div>
                <Slider className="mt-2" min={5} max={50} step={1} value={[radioKm]} onValueChange={([v]) => setRadioKm(v)} />
                {cobertura && (
                  <div className="mt-3 rounded-xl border border-teal/30 bg-teal/5 p-3">
                    <p className="text-sm text-ink">
                      Cubres <span className="font-semibold">{cobertura.covered.length} CP</span> en{" "}
                      <span className="font-semibold">{cobertura.muniNames.length} municipios</span> a {radioKm} km.
                    </p>
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      <button type="button"
                        onClick={() => { navigator.clipboard?.writeText(cobertura.covered.join(", ")); setCopiedCP(true); setTimeout(() => setCopiedCP(false), 1500); }}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-teal hover:underline">
                        {copiedCP ? <><CheckCircle2 className="h-3.5 w-3.5" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar lista de CP</>}
                      </button>
                      <span className="text-xs text-muted-foreground">línea recta, todas direcciones</span>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-ink">Ver municipios</summary>
                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-h-32 overflow-y-auto">
                        {cobertura.muniNames.join(" · ")}
                      </p>
                    </details>
                  </div>
                )}
                {cpValid && coords && !cobertura && (
                  <p className="mt-2 text-xs text-muted-foreground">No encontramos ese código postal. Revísalo.</p>
                )}
              </div>


              {/* Gamas (multi) */}
              <div>
                <label className="text-sm font-medium text-ink">Gamas en las que trabajas</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {GAMAS.map((g) => {
                    const active = inputs.gamas.includes(g.code);
                    return (
                      <button
                        key={g.code}
                        type="button"
                        onClick={() => toggleGama(g.code)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-ink text-background border-ink"
                            : "bg-background text-ink border-border hover:border-ink"
                        )}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Volúmenes por gama y actividad */}
              <div>
                <label className="text-sm font-medium text-ink">
                  {inputs.perfil === "sat" ? "Lo que reparas al mes" : inputs.perfil === "instalador" ? "Lo que instalas al mes" : "Lo que reparas e instalas al mes"}
                </label>
                {inputs.gamas.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Selecciona al menos una gama arriba.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {inputs.gamas.map((code) => {
                      const gama = GAMAS.find((x) => x.code === code);
                      const v = inputs.volumenes[code] ?? { rep: 0, ins: 0 };
                      const showRep = inputs.perfil !== "instalador";
                      const showIns = inputs.perfil !== "sat";
                      return (
                        <div key={code} className="rounded-xl border border-border bg-background p-3">
                          <p className="text-sm font-medium text-ink mb-2">{gama?.label ?? code}</p>
                          <div className="space-y-2">
                            {showRep && (
                              <VolRow label="Reparaciones" Icon={Wrench} value={v.rep} ticket={PRICE_BY_GAMA[code]} onChange={(n) => setVol(code, "rep", n)} />
                            )}
                            {showIns && (
                              <VolRow label="Instalaciones" Icon={PackagePlus} value={v.ins} ticket={INSTALL_PRICE_BY_GAMA[code]} onChange={(n) => setVol(code, "ins", n)} />
                            )}
                          </div>
                          {(() => {
                            const m = MARCAS_POR_GAMA[code];
                            const total = m ? m.confirmadas.length + m.wip.length : 0;
                            if (!total) return null;
                            return (
                              <details className="mt-3 group border-t border-border/60 pt-2">
                                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-1.5 text-xs font-medium text-teal">
                                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                                  {total} marcas · SAT oficial hasta –70%
                                </summary>
                                <div className="mt-2 space-y-2">
                                  {m.confirmadas.length > 0 && (
                                    <div>
                                      <p className="text-[11px] font-medium text-ink mb-1 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3 text-teal" /> Descuento confirmado
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {m.confirmadas.map((b) => (
                                          <span key={b} className="rounded-md bg-teal/10 text-ink text-[11px] px-1.5 py-0.5 border border-teal/30">{b}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {m.wip.length > 0 && (
                                    <div>
                                      <p className="text-[11px] font-medium text-muted-foreground mb-1">En incorporación</p>
                                      <div className="flex flex-wrap gap-1">
                                        {m.wip.map((b) => (
                                          <span key={b} className="rounded-md bg-muted text-muted-foreground text-[11px] px-1.5 py-0.5 border border-border">{b}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </details>
                            );
                          })()}
                        </div>
                      );
                    })}
                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                      <span>Total: {result.reparacionesMes + result.instalacionesMes} intervenciones/mes</span>
                      {inputs.perfil === "ambos" && <span>{result.reparacionesMes} rep · {result.instalacionesMes} inst</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-1">
                      El descuento OEM (hasta –70% según tu nivel de servicio) aplica al repuesto de tus reparaciones fuera de garantía; en garantía, el repuesto va sin cargo. Confirmado en Vestel y marcas asociadas; resto en incorporación.
                    </p>
                  </div>
                )}
              </div>

              {/* Tiempo de resolución → descuento OEM */}
              <div>
                <label className="text-sm font-medium text-ink">Tiempo de resolución (trabajo WG)</label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Según cómo resuelvas los avisos que te asigna WG, ganas tu nivel de descuento OEM — aplicado al repuesto de tus reparaciones fuera de garantía.
                </p>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {[
                    { h: "≤24 h", d: 0.7 },
                    { h: "≤48 h", d: 0.6 },
                    { h: "≤72 h", d: 0.5 },
                    { h: "+72 h", d: 0.4 },
                  ].map((tier) => {
                    const active = Math.round(inputs.descuentoRepuesto * 100) === Math.round(tier.d * 100);
                    return (
                      <button
                        key={tier.h}
                        type="button"
                        onClick={() => setInputs({ ...inputs, descuentoRepuesto: tier.d })}
                        className={cn(
                          "rounded-xl border px-2 py-2 text-center transition-colors",
                          active ? "bg-ink text-background border-ink" : "bg-background text-ink border-border hover:border-ink"
                        )}
                      >
                        <span className="block text-xs font-medium">{tier.h}</span>
                        <span className="block text-[11px] opacity-70">–{Math.round(tier.d * 100)}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* % fuera de garantía → base del ahorro en repuesto */}
              <div>
                <div className="flex justify-between items-baseline">
                  <label className="text-sm font-medium text-ink">{t("sim.inputs.fuera")}</label>
                  <span className="font-display text-lg text-ink">
                    {Math.round((inputs.pctFueraGarantia ?? 0.4) * 100)}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  La parte de tus reparaciones donde facturas el repuesto y aplica el descuento OEM.
                </p>
                <Slider
                  className="mt-3"
                  min={0}
                  max={100}
                  step={5}
                  value={[Math.round((inputs.pctFueraGarantia ?? 0.4) * 100)]}
                  onValueChange={([v]) => setInputs({ ...inputs, pctFueraGarantia: v / 100 })}
                />
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
                      <label className="text-sm font-medium text-ink">
                        Avisos WG asignables / mes
                      </label>
                      <span className="font-display text-lg text-ink">
                        {inputs.intervencionesWGMes}
                      </span>
                    </div>
                    <Slider
                      className="mt-3"
                      min={0}
                      max={200}
                      step={5}
                      value={[inputs.intervencionesWGMes]}
                      onValueChange={([v]) => {
                        wgOverride.current = true;
                        setInputs({ ...inputs, intervencionesWGMes: v });
                      }}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Estimación — se conectará a nuestra base de datos de avisos.
                    </p>
                  </div>
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
