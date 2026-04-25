import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowRight, Check, Loader2, Mail, Phone, MapPin, Clock } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { toast } from "sonner";

const MOTIVOS = [
  { value: "garantias", label: "Garantías" },
  { value: "reparaciones", label: "Reparaciones" },
  { value: "repuestos", label: "Repuestos" },
  { value: "movilidad", label: "Movilidad" },
  { value: "seguros", label: "Seguros" },
  { value: "wg-network", label: "WG Network (colaboradores)" },
  { value: "otro", label: "Otro" },
] as const;

const motivoValues = MOTIVOS.map((m) => m.value) as [string, ...string[]];

const schema = z.object({
  nombre: z.string().trim().min(1, "Requerido").max(120, "Máximo 120 caracteres"),
  empresa: z.string().trim().max(200, "Máximo 200 caracteres").optional(),
  email: z.string().trim().email("Email no válido").max(255, "Máximo 255 caracteres"),
  telefono: z
    .string()
    .trim()
    .max(20, "Máximo 20 caracteres")
    .regex(/^[+\d\s().-]*$/, "Sólo dígitos y símbolos válidos")
    .optional()
    .or(z.literal("")),
  motivo: z.enum(motivoValues, { message: "Selecciona un motivo" }),
  mensaje: z
    .string()
    .trim()
    .min(10, "Cuéntanos un poco más")
    .max(2000, "Máximo 2000 caracteres"),
});

const Contacto = () => {
  const [form, setForm] = useState({
    nombre: "",
    empresa: "",
    email: "",
    telefono: "",
    motivo: "",
    mensaje: "",
  });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Contacto · Grupo WG";
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute(
      "content",
      "Contacta con Grupo WG: hablemos de cómo convertir tu servicio postventa en un sistema bajo control.",
    );
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) {
      const ne: Record<string, string> = {};
      r.error.issues.forEach((i) => {
        ne[i.path[0] as string] = i.message;
      });
      setErrs(ne);
      return;
    }
    setErrs({});
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setSent(true);
    toast.success("Mensaje recibido");
  };

  return (
    <>
      {/* HERO + FORM */}
      <section className="pt-32 md:pt-40 pb-20 md:pb-28 bg-bone relative overflow-hidden">
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-20 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--teal)/0.08),transparent_60%)] pointer-events-none" />

        <div className="container-tight relative grid gap-12 md:gap-16 md:grid-cols-12">
          {/* LEFT */}
          <div className="md:col-span-5">
            <Reveal>
              <p className="eyebrow-mono mb-4">Contacto</p>
              <h1 className="heading-display text-ink text-4xl sm:text-5xl md:text-7xl text-balance leading-[1.05] md:leading-[1.02] tracking-tight">
                Hablemos.
              </h1>
              <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-md text-pretty">
                Si eres fabricante, distribuidor, ecommerce, aseguradora, SAT o instalador,
                cuéntanos qué necesitas resolver.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="mt-10 md:mt-12 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 md:p-7 space-y-5">
                <a
                  href="mailto:info@grupowg.com"
                  className="flex items-start gap-3 group"
                >
                  <span className="h-9 w-9 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0 group-hover:bg-teal/20 transition-colors">
                    <Mail className="h-4 w-4 text-teal" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                      Email
                    </span>
                    <span className="block text-sm font-medium text-ink truncate">
                      info@grupowg.com
                    </span>
                  </span>
                </a>

                <a
                  href="tel:+34900000000"
                  className="flex items-start gap-3 group"
                >
                  <span className="h-9 w-9 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0 group-hover:bg-teal/20 transition-colors">
                    <Phone className="h-4 w-4 text-teal" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                      Teléfono
                    </span>
                    <span className="block text-sm font-medium text-ink">
                      +34 900 000 000
                    </span>
                  </span>
                </a>

                <div className="flex items-start gap-3">
                  <span className="h-9 w-9 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-teal" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                      Oficinas
                    </span>
                    <span className="block text-sm font-medium text-ink">
                      Grupo Warranty Global · España
                    </span>
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <span className="h-9 w-9 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-teal" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                      Horario
                    </span>
                    <span className="block text-sm font-medium text-ink">
                      L-V · 09:00 – 18:00
                    </span>
                  </span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* RIGHT — FORM */}
          <div className="md:col-span-7">
            {sent ? (
              <Reveal>
                <div className="rounded-3xl bg-ink text-bone p-8 md:p-12 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--teal)/0.18),transparent_60%)] pointer-events-none" />
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-teal flex items-center justify-center mb-6">
                      <Check className="h-5 w-5 text-ink" />
                    </div>
                    <h2 className="font-display text-3xl md:text-4xl mb-4">
                      Mensaje recibido.
                    </h2>
                    <p className="text-bone/70 text-base md:text-lg max-w-md">
                      Te contestaremos lo antes posible. Gracias por confiar en Grupo WG.
                    </p>
                  </div>
                </div>
              </Reveal>
            ) : (
              <Reveal delay={80}>
                <form
                  onSubmit={onSubmit}
                  className="space-y-5 rounded-3xl bg-card border border-border p-6 sm:p-8 md:p-10 shadow-sm"
                  noValidate
                >
                  <div className="grid md:grid-cols-2 gap-5">
                    <Field label="Nombre *" error={errs.nombre}>
                      <input
                        className="input-base"
                        value={form.nombre}
                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        maxLength={120}
                        autoComplete="name"
                      />
                    </Field>
                    <Field label="Empresa" error={errs.empresa}>
                      <input
                        className="input-base"
                        value={form.empresa}
                        onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                        maxLength={200}
                        autoComplete="organization"
                      />
                    </Field>
                    <Field label="Email *" error={errs.email}>
                      <input
                        type="email"
                        className="input-base"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        maxLength={255}
                        autoComplete="email"
                        inputMode="email"
                      />
                    </Field>
                    <Field label="Teléfono" error={errs.telefono}>
                      <input
                        className="input-base"
                        value={form.telefono}
                        onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                        maxLength={20}
                        autoComplete="tel"
                        inputMode="tel"
                      />
                    </Field>
                  </div>

                  <Field label="Motivo de contacto *" error={errs.motivo}>
                    <div className="flex flex-wrap gap-2">
                      {MOTIVOS.map((m) => {
                        const active = form.motivo === m.value;
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setForm({ ...form, motivo: m.value })}
                            className={
                              "px-3.5 py-2 rounded-full text-xs font-medium border transition-all " +
                              (active
                                ? "bg-ink text-bone border-ink shadow-sm"
                                : "bg-card text-ink/80 border-border hover:border-ink/40 hover:text-ink")
                            }
                            aria-pressed={active}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="¿En qué podemos ayudarte? *" error={errs.mensaje}>
                    <textarea
                      className="input-base min-h-32"
                      value={form.mensaje}
                      onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                      maxLength={2000}
                    />
                    <span className="block text-[11px] text-muted-foreground mt-1.5 text-right">
                      {form.mensaje.length}/2000
                    </span>
                  </Field>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary disabled:opacity-50 w-full sm:w-auto justify-center"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Enviar mensaje <ArrowRight className="h-4 w-4" />
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Al enviar este formulario aceptas nuestra{" "}
                    <a href="/privacidad" className="underline hover:text-ink">
                      política de privacidad
                    </a>
                    .
                  </p>
                </form>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {/* MAP */}
      <section className="bg-background border-t border-foreground/5">
        <div className="container-tight py-16 md:py-20">
          <Reveal>
            <p className="eyebrow-mono mb-3">Dónde estamos</p>
            <h2 className="heading-display text-foreground text-3xl md:text-5xl text-balance max-w-2xl">
              Operamos en <span className="text-teal italic">toda España</span>.
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl text-pretty">
              Sede central en España con red de colaboradores cualificados a nivel nacional.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-10 rounded-3xl overflow-hidden border border-border shadow-sm aspect-[16/9] md:aspect-[21/9] bg-muted">
              <iframe
                title="Mapa Grupo WG"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-9.5%2C35.8%2C4.5%2C44.0&layer=mapnik"
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <style>{`
        .input-base {
          width: 100%; border: 1px solid hsl(var(--border));
          background: hsl(var(--card)); border-radius: 0.75rem;
          padding: 0.75rem 1rem; font-size: 0.95rem; color: hsl(var(--foreground));
          transition: all 0.2s;
        }
        .input-base:focus { outline: none; border-color: hsl(var(--ink)); box-shadow: 0 0 0 3px hsl(var(--teal) / 0.2); }
      `}</style>
    </>
  );
};

const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="block text-sm font-medium text-ink mb-2">{label}</span>
    {children}
    {error && <span className="block text-xs text-destructive mt-1.5">{error}</span>}
  </label>
);

export default Contacto;
