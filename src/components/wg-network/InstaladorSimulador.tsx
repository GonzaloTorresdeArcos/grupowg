import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowUpRight, MapPin, Users, CalendarDays, Wallet, TrendingUp, Clock, CheckCircle2, Sparkles } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const fmt = (n: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.round(n));

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
      setValue(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(step);
      else prev.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

type Zone = {
  provinceCode: string;
  provinceName: string;
  hasData: boolean;
  volume: number;
  tariffs: { T1: number; T2: number; "2X1": number; "3X1": number };
  desinstalacion: number;
  material: number;
};

const MIX = { T1: 0.84, "2X1": 0.10, T2: 0.05, "3X1": 0.01 } as const;

export const InstaladorSimulador = () => {
  const navigate = useNavigate();
  const [cp, setCp] = useState("");
  const [zone, setZone] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(false);
  const [parejas, setParejas] = useState(2);
  const [insDia, setInsDia] = useState(2);
  const [diasSemana, setDiasSemana] = useState(5);
  const [materialWG, setMaterialWG] = useState(true);
  const [lead, setLead] = useState({ nombre: "", empresa: "", email: "", telefono: "" });

  const cpValid = /^\d{5}$/.test(cp);

  useEffect(() => {
    if (!cpValid) { setZone(null); return; }
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("installer-tariffs", { body: { cp } });
        if (!cancelled) setZone(error ? null : (data as Zone));
      } catch {
        if (!cancelled) setZone(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(id); };
  }, [cp, cpValid]);

  const calc = useMemo(() => {
    if (!zone) return null;
    const tf = zone.tariffs;
    const blend = tf.T1 * MIX.T1 + tf["2X1"] * MIX["2X1"] + tf.T2 * MIX.T2 + tf["3X1"] * MIX["3X1"];
    const tarifaMedia = blend + 0.18 * zone.desinstalacion;
    const diaria = parejas * insDia;
    const mensual = Math.round(diaria * diasSemana * 4.33);
    const diasLab10 = Math.max(1, Math.round((10 * diasSemana) / 7));
    const porAsignacion = diaria * diasLab10;
    const facturacionMes = mensual * tarifaMedia;
    const importeAsignacion = porAsignacion * tarifaMedia;
    const oportunidadZona = zone.volume * tarifaMedia;
    const materialMes = mensual * zone.material;
    const boostPareja = insDia * diasSemana * 4.33 * tarifaMedia;
    return { tarifaMedia, diaria, mensual, diasLab10, porAsignacion, facturacionMes, importeAsignacion, oportunidadZona, materialMes, boostPareja };
  }, [zone, parejas, insDia, diasSemana]);

  const animated = useCountUp(calc?.facturacionMes ?? 0);

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.nombre || !lead.email) { toast.error("Nombre y email son obligatorios."); return; }
    try {
      await supabase.functions.invoke("submit-lead", {
        body: {
          nombre: lead.nombre, empresa: lead.empresa, email: lead.email, telefono: lead.telefono,
          cp, impacto_total: Math.round((calc?.facturacionMes ?? 0) * 12),
          breakdown: {
            perfil: "instalador", zona: zone?.provinceName, parejas, insDia, diasSemana,
            materialWG, facturacionMes: Math.round(calc?.facturacionMes ?? 0), instalacionesMes: calc?.mensual ?? 0,
          },
        },
      });
    } catch (err) { console.warn("[submit-lead] non-blocking", err); }
    toast.success("¡Listo! Te llevamos a la inscripción.");
    const params = new URLSearchParams();
    if (cpValid) params.set("cp", cp);
    if (lead.email) params.set("email", lead.email);
    if (lead.nombre) params.set("nombre", lead.nombre);
    if (lead.empresa) params.set("empresa", lead.empresa);
    if (lead.telefono) params.set("tel", lead.telefono);
    params.set("perfil", "instalador");
    const qs = params.toString();
    setTimeout(() => navigate(`/wg-network/inscripcion${qs ? `?${qs}` : ""}`), 400);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2 rounded-3xl bg-card border border-border p-6 md:p-8 shadow-sm">
        <h3 className="font-display text-xl text-ink mb-6">Tu capacidad de instalación</h3>
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-ink flex items-center gap-2"><MapPin className="h-4 w-4 text-teal" /> Tu código postal</label>
            <input type="text" inputMode="numeric" maxLength={5} value={cp}
              onChange={(e) => setCp(e.target.value.replace(/\D/g, ""))} placeholder="28009"
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal" />
            {loading && <p className="mt-2 text-xs text-muted-foreground">Buscando instalaciones en tu zona…</p>}
            {zone && (
              <div className="mt-3 rounded-xl border border-teal/30 bg-teal/5 p-3">
                <p className="text-sm text-ink">En <span className="font-semibold">{zone.provinceName}</span> se movieron <span className="font-semibold">{fmt(zone.volume)}</span> instalaciones en la campaña AA.</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-ink">T1 {zone.tariffs.T1}€</span>
                  <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-ink">T2 {zone.tariffs.T2}€</span>
                  <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-ink">2×1 {zone.tariffs["2X1"]}€</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-baseline">
              <label className="text-sm font-medium text-ink flex items-center gap-2"><Users className="h-4 w-4 text-teal" /> Parejas de instalación</label>
              <span className="font-display text-lg text-ink">{parejas}</span>
            </div>
            <Slider className="mt-3" min={1} max={20} step={1} value={[parejas]} onValueChange={([v]) => setParejas(v)} />
          </div>

          <div>
            <div className="flex justify-between items-baseline">
              <label className="text-sm font-medium text-ink">Instalaciones/día por pareja</label>
              <span className="font-display text-lg text-ink">{insDia}</span>
            </div>
            <Slider className="mt-3" min={1} max={6} step={1} value={[insDia]} onValueChange={([v]) => setInsDia(v)} />
          </div>

          <div>
            <div className="flex justify-between items-baseline">
              <label className="text-sm font-medium text-ink flex items-center gap-2"><CalendarDays className="h-4 w-4 text-teal" /> Días que trabajas/semana</label>
              <span className="font-display text-lg text-ink">{diasSemana}</span>
            </div>
            <Slider className="mt-3" min={1} max={7} step={1} value={[diasSemana]} onValueChange={([v]) => setDiasSemana(v)} />
          </div>

          <div>
            <label className="text-sm font-medium text-ink">Material de instalación</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMaterialWG(true)} className={cn("rounded-xl border px-3 py-2 text-sm font-medium transition-colors", materialWG ? "bg-ink text-background border-ink" : "bg-background text-ink border-border hover:border-ink")}>Lo pone WG</button>
              <button type="button" onClick={() => setMaterialWG(false)} className={cn("rounded-xl border px-3 py-2 text-sm font-medium transition-colors", !materialWG ? "bg-ink text-background border-ink" : "bg-background text-ink border-border hover:border-ink")}>Lo pones tú</button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Si lo pone WG, no adelantas el material: lo recoges y se descuenta tras la liquidación.</p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 rounded-3xl bg-gradient-to-br from-ink to-ink-soft text-background p-6 md:p-10 relative overflow-hidden">
        {!zone ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center">
            <MapPin className="h-10 w-10 text-teal-soft mb-4" strokeWidth={1.5} />
            <p className="text-background/80 max-w-xs">Mete tu código postal y verás las instalaciones y precios de tu zona, y cuánto puedes facturar con WG.</p>
          </div>
        ) : (
          <>
            <p className="eyebrow text-teal-soft mb-3">Con tu capacidad, con WG</p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-display text-5xl md:text-7xl text-background">{fmt(animated)} €</span>
              <span className="text-background/60 text-lg">/mes</span>
            </div>
            <p className="mt-2 text-background/70 text-sm">≈ {fmt(calc!.mensual)} instalaciones/mes ({parejas} {parejas === 1 ? "pareja" : "parejas"} × {insDia}/día × {diasSemana} días)</p>

            <div className="mt-6 rounded-2xl border border-teal/30 bg-teal/10 p-4 md:p-5">
              <p className="text-sm text-teal-soft flex items-center gap-2"><TrendingUp className="h-4 w-4" /> El mercado de tu zona</p>
              <p className="font-display text-2xl md:text-3xl text-background mt-1">{fmt(calc!.oportunidadZona)} €</p>
              <p className="text-xs text-background/60 mt-1">{fmt(zone.volume)} instalaciones en {zone.provinceName} (campaña AA). Cuantas más parejas dediques a WG, más te asignamos.</p>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-teal-soft mt-0.5 shrink-0" /><span className="text-background/85">Te asignamos <span className="font-semibold text-background">~{fmt(calc!.porAsignacion)} instalaciones</span> por bloque (~10 días) ≈ <span className="font-semibold text-background">{fmt(calc!.importeAsignacion)} €</span>.</span></div>
              <div className="flex items-start gap-2"><Clock className="h-4 w-4 text-teal-soft mt-0.5 shrink-0" /><span className="text-background/85"><span className="font-semibold text-background">Cobro semanal</span>: subes la documentación firmada y entras a pago. Antes: ~47 días.</span></div>
              <div className="flex items-start gap-2"><Wallet className="h-4 w-4 text-teal-soft mt-0.5 shrink-0" /><span className="text-background/85">{materialWG ? <>No adelantas material: <span className="font-semibold text-background">~{fmt(calc!.materialMes)} €/mes</span> que no pones de tu bolsillo.</> : <>Si dejas que WG ponga el material, dejarías de adelantar <span className="font-semibold text-background">~{fmt(calc!.materialMes)} €/mes</span>.</>}</span></div>
              <div className="flex items-start gap-2"><Sparkles className="h-4 w-4 text-teal-soft mt-0.5 shrink-0" /><span className="text-background/85">Cada pareja extra que dediques a WG ≈ <span className="font-semibold text-background">+{fmt(calc!.boostPareja)} €/mes</span>.</span></div>
            </div>

            <p className="mt-6 text-xs text-background/50">Estimación con tarifas reales de tu zona (campaña A/A). El volumen asignado depende de tu capacidad y disponibilidad.</p>
          </>
        )}
      </div>

      <div className="lg:col-span-5 rounded-3xl bg-ink text-background p-6 md:p-10">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div>
            <p className="eyebrow text-teal-soft mb-3">Da el paso</p>
            <h3 className="font-display text-3xl md:text-4xl text-background text-balance">Empieza a recibir instalaciones de WG</h3>
            <p className="mt-3 text-background/70">Déjanos tus datos y te llevamos a la inscripción para activar tu zona.</p>
          </div>
          <form onSubmit={submitLead} className="grid gap-3 sm:grid-cols-2">
            <input required placeholder="Nombre" value={lead.nombre} onChange={(e) => setLead({ ...lead, nombre: e.target.value })} className="rounded-xl bg-background/10 border border-background/20 px-4 py-3 text-background placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-teal" />
            <input placeholder="Empresa (opcional)" value={lead.empresa} onChange={(e) => setLead({ ...lead, empresa: e.target.value })} className="rounded-xl bg-background/10 border border-background/20 px-4 py-3 text-background placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-teal" />
            <input required type="email" placeholder="Email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} className="rounded-xl bg-background/10 border border-background/20 px-4 py-3 text-background placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-teal" />
            <input type="tel" placeholder="Teléfono" value={lead.telefono} onChange={(e) => setLead({ ...lead, telefono: e.target.value })} className="rounded-xl bg-background/10 border border-background/20 px-4 py-3 text-background placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-teal" />
            <button type="submit" className="sm:col-span-2 mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-teal px-6 py-3.5 text-base font-medium text-ink hover:gap-3 transition-all">Únete a la red <ArrowUpRight className="h-5 w-5" /></button>
          </form>
        </div>
      </div>
    </div>
  );
};
