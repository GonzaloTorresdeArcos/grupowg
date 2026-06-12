import { useState } from "react";
import { Reveal } from "@/components/site/Reveal";
import {
  Activity, Clock, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Package, Wrench, Euro, Timer, ArrowUpRight, ArrowDownRight, LineChart, Send, Loader2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// KPIs principales
const kpiCards = [
  {
    icon: Wrench,
    label: "First Time Fix",
    value: "87.4",
    suffix: "%",
    target: "Target ≥ 85%",
    trend: "up",
    delta: "+2.1pp",
    status: "ok",
  },
  {
    icon: Timer,
    label: "TAT End-to-End",
    value: "6.2",
    suffix: "días",
    target: "SLA ≤ 7 días",
    trend: "down",
    delta: "-0.8d",
    status: "ok",
  },
  {
    icon: Euro,
    label: "Cost per Repair",
    value: "42.10",
    suffix: "€",
    target: "Budget 45€",
    trend: "down",
    delta: "-6.4%",
    status: "ok",
  },
  {
    icon: AlertTriangle,
    label: "Technical Returns",
    value: "3.1",
    suffix: "%",
    target: "Target ≤ 4%",
    trend: "down",
    delta: "-0.5pp",
    status: "ok",
  },
];

// SLA por etapa del flujo
const slaStages = [
  { stage: "Front · Apertura", sla: "24h", real: "18h", pct: 96, owner: "Customer Care" },
  { stage: "Asignación SAT", sla: "48h", real: "36h", pct: 94, owner: "Operaciones" },
  { stage: "Diagnóstico", sla: "72h", real: "68h", pct: 89, owner: "Red técnica" },
  { stage: "Repuesto disponible", sla: "5d", real: "4.2d", pct: 91, owner: "Supply Chain" },
  { stage: "Reparación", sla: "7d", real: "6.1d", pct: 93, owner: "SAT" },
  { stage: "Cierre y validación", sla: "24h", real: "22h", pct: 97, owner: "Quality" },
];

// Ageing buckets
const ageing = [
  { bucket: "0–7 días", count: 1842, pct: 68, color: "bg-teal" },
  { bucket: "8–15 días", count: 524, pct: 19, color: "bg-teal/60" },
  { bucket: "16–30 días", count: 248, pct: 9, color: "bg-amber-400" },
  { bucket: "+30 días", count: 102, pct: 4, color: "bg-red-400" },
];

// Trazabilidad: timeline de un caso
const traceability = [
  { ts: "12/03 · 09:14", event: "Apertura incidencia", actor: "Cliente final", state: "done" },
  { ts: "12/03 · 09:42", event: "Triaje y asignación SAT", actor: "Front Office", state: "done" },
  { ts: "12/03 · 14:20", event: "Cita confirmada", actor: "SAT Madrid Norte", state: "done" },
  { ts: "13/03 · 11:05", event: "Diagnóstico técnico", actor: "Técnico #284", state: "done" },
  { ts: "13/03 · 11:30", event: "Solicitud repuesto", actor: "Supply Chain", state: "done" },
  { ts: "15/03 · 10:00", event: "Repuesto en SAT", actor: "Logística", state: "done" },
  { ts: "16/03 · 13:45", event: "Reparación finalizada", actor: "Técnico #284", state: "active" },
  { ts: "Pendiente", event: "Validación y cierre", actor: "Quality", state: "todo" },
];

export const Dashboards = () => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    setSubmitting(false);
    setOpen(false);
    toast.success("Solicitud enviada", {
      description: "Te contactaremos en menos de 24h para agendar la demo.",
    });
  };

  return (
  <section id="cuadros-de-mando" className="py-24 md:py-32 bg-background text-foreground">
    <div className="container-tight">
      <Reveal>
        <div className="max-w-3xl mb-16 md:mb-20">
          <p className="eyebrow text-teal mb-4">04 · Cuadros de mando</p>
          <h2 className="heading-display text-foreground text-4xl md:text-6xl text-balance">
            El servicio que no se mide{" "}
            <span className="text-teal font-normal">no se gobierna.</span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-foreground/70 max-w-2xl leading-relaxed">
            Un ejemplo del cuadro de mando que entregamos a cliente: KPIs financieros y operativos,
            SLAs por etapa, ageing del backlog y trazabilidad caso a caso. Datos reales, ownership claro,
            decisiones accionables.
          </p>
        </div>
      </Reveal>

      {/* KPI Grid */}
      <Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-muted/50 rounded-2xl overflow-hidden border border-border mb-px">
          {kpiCards.map((k) => {
            const TrendIcon = k.trend === "up" ? ArrowUpRight : ArrowDownRight;
            return (
              <div key={k.label} className="bg-background p-6 md:p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-9 w-9 rounded-lg border border-teal/40 text-teal flex items-center justify-center">
                    <k.icon className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-mono text-teal">
                    <TrendIcon className="h-3 w-3" />
                    {k.delta}
                  </span>
                </div>
                <p className="text-xs font-mono uppercase tracking-widest text-foreground/50 mb-2">{k.label}</p>
                <p className="font-display text-3xl md:text-4xl text-foreground leading-none">
                  {k.value}
                  <span className="text-lg text-foreground/60 ml-1">{k.suffix}</span>
                </p>
                <p className="mt-3 text-xs text-foreground/50">{k.target}</p>
              </div>
            );
          })}
        </div>
      </Reveal>

      {/* SLA + Ageing */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-px bg-muted/50 border-x border-b border-border rounded-b-2xl overflow-hidden mb-12">
        {/* SLA por etapa */}
        <Reveal>
          <div className="bg-background p-6 md:p-10 h-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-teal mb-1">SLA por etapa</p>
                <h3 className="font-display text-xl text-foreground">Cumplimiento end-to-end del flujo</h3>
              </div>
              <Activity className="h-5 w-5 text-foreground/40" strokeWidth={1.5} />
            </div>

            <div className="space-y-5">
              {slaStages.map((s) => (
                <div key={s.stage}>
                  <div className="flex items-baseline justify-between mb-1.5 gap-3">
                    <p className="text-sm text-foreground font-medium truncate">{s.stage}</p>
                    <p className="text-xs font-mono text-foreground/50 shrink-0">
                      <span className="text-foreground/80">{s.real}</span>
                      <span className="text-foreground/30"> / {s.sla}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          s.pct >= 95 ? "bg-teal" : s.pct >= 90 ? "bg-teal/70" : "bg-amber-400"
                        }`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                    <p className="text-xs font-mono text-foreground/70 w-10 text-right">{s.pct}%</p>
                  </div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-foreground/40 mt-1">
                    Owner · {s.owner}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Ageing del backlog */}
        <Reveal delay={120}>
          <div className="bg-background p-6 md:p-10 h-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-teal mb-1">Ageing backlog</p>
                <h3 className="font-display text-xl text-foreground">Distribución por antigüedad</h3>
              </div>
              <Clock className="h-5 w-5 text-foreground/40" strokeWidth={1.5} />
            </div>

            <p className="font-display text-4xl text-foreground mb-1">2.716</p>
            <p className="text-xs font-mono uppercase tracking-widest text-foreground/50 mb-8">
              Casos activos
            </p>

            <div className="space-y-4">
              {ageing.map((a) => (
                <div key={a.bucket}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <p className="text-sm text-foreground/80">{a.bucket}</p>
                    <p className="text-xs font-mono text-foreground/60">
                      {a.count.toLocaleString("es-ES")} · {a.pct}%
                    </p>
                  </div>
                  <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${a.color}`} style={{ width: `${a.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-border flex items-center gap-2 text-xs text-foreground/60">
              <CheckCircle2 className="h-4 w-4 text-teal shrink-0" strokeWidth={1.5} />
              <span>87% del backlog dentro de los 15 días objetivo</span>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Trazabilidad */}
      <Reveal>
        <div className="rounded-2xl border border-border bg-background overflow-hidden">
          <div className="p-6 md:p-10 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-teal mb-1">Trazabilidad</p>
              <h3 className="font-display text-xl text-foreground">Caso #WG-284-1739 · Lavadora · Madrid</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-teal border border-teal/30 rounded-full px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" />
                En curso
              </span>
              <span className="text-xs font-mono text-foreground/50">TAT actual · 4d 18h</span>
            </div>
          </div>

          <div className="p-6 md:p-10">
            <ol className="relative">
              {traceability.map((t, i) => (
                <li key={i} className="grid grid-cols-[100px_24px_1fr] md:grid-cols-[140px_24px_1fr] gap-3 md:gap-4 pb-5 last:pb-0">
                  <p className="text-xs font-mono text-foreground/50 pt-1">{t.ts}</p>
                  <div className="relative flex justify-center">
                    {i < traceability.length - 1 && (
                      <span className="absolute top-3 bottom-[-20px] w-px bg-muted/50" />
                    )}
                    <span
                      className={`relative h-3 w-3 rounded-full mt-1.5 ${
                        t.state === "done"
                          ? "bg-teal"
                          : t.state === "active"
                            ? "bg-bone ring-4 ring-teal/30"
                            : "bg-muted/50 border border-border"
                      }`}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-sm leading-snug ${
                        t.state === "todo" ? "text-foreground/40" : "text-foreground"
                      }`}
                    >
                      {t.event}
                    </p>
                    <p className="text-[11px] font-mono uppercase tracking-wider text-foreground/45 mt-0.5">
                      {t.actor}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Reveal>

      {/* CTA: Solicitar demo */}
      <Reveal>
        <div className="mt-16 md:mt-20 rounded-2xl border border-teal/20 bg-gradient-to-br from-teal/10 via-background to-background p-8 md:p-12">
          <div className="grid lg:grid-cols-[1.4fr_auto] gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <LineChart className="h-4 w-4 text-teal" strokeWidth={1.5} />
                <p className="text-xs font-mono uppercase tracking-widest text-teal">
                  Demo personalizada
                </p>
              </div>
              <h3 className="font-display text-2xl md:text-3xl text-foreground leading-snug mb-3 text-balance">
                ¿Quieres ver el cuadro de mando aplicado a tu operación?
              </h3>
              <p className="text-sm md:text-base text-foreground/70 max-w-xl leading-relaxed">
                Te mostramos un caso real con tus categorías, tus SLAs y tu modelo de servicio.
                Sesión de 30 minutos con nuestro equipo de operaciones.
              </p>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="bg-teal text-ink hover:bg-teal/90 font-medium gap-2 h-12 px-6 w-full lg:w-auto"
                >
                  Solicitar demo
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">
                    Solicita tu demo del cuadro de mando
                  </DialogTitle>
                  <DialogDescription>
                    Cuéntanos brevemente sobre tu operación y te contactamos en menos de 24h.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="demo-nombre">Nombre y apellidos *</Label>
                      <Input id="demo-nombre" name="nombre" required placeholder="Tu nombre" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-empresa">Empresa *</Label>
                      <Input id="demo-empresa" name="empresa" required placeholder="Tu empresa" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="demo-email">Email corporativo *</Label>
                      <Input id="demo-email" name="email" type="email" required placeholder="nombre@empresa.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-telefono">Teléfono</Label>
                      <Input id="demo-telefono" name="telefono" type="tel" placeholder="+34 ..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demo-cargo">Cargo</Label>
                    <Input id="demo-cargo" name="cargo" placeholder="Director de operaciones, postventa, etc." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demo-mensaje">¿Qué te gustaría ver en la demo?</Label>
                    <Textarea
                      id="demo-mensaje"
                      name="mensaje"
                      rows={3}
                      placeholder="Volumen de incidencias, categorías, geografía, retos actuales..."
                    />
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={submitting} className="gap-2">
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Solicitar demo
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Al enviar aceptas nuestra política de privacidad. No compartiremos tus datos con terceros.
                  </p>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Reveal>

      {/* Footer note */}
      <Reveal>
        <div className="mt-12 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm">
          <p className="text-foreground/60 italic font-display">
            "Lo que el cliente ve no es un informe. Es el sistema funcionando en tiempo real."
          </p>
          <div className="flex flex-wrap gap-2">
            {["Power BI", "API en vivo", "Export programado", "Drill-down por SAT"].map((t) => (
              <span
                key={t}
                className="text-xs font-mono text-foreground/70 border border-border rounded-full px-3 py-1"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  </section>
  );
};

