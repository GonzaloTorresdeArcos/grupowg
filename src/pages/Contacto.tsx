import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Clock,
} from "lucide-react";
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

type MotivoValue = (typeof MOTIVOS)[number]["value"];
const motivoValues = MOTIVOS.map((m) => m.value) as [MotivoValue, ...MotivoValue[]];

const URGENCIAS = ["Estándar", "Alta", "Crítica"] as const;
const RAMOS = ["Hogar", "Decesos", "Salud", "Auto", "Comercio", "Otro"] as const;
const VEHICULOS = ["Turismo", "Furgoneta", "Industrial", "Moto", "Otro"] as const;

const optionalString = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres`).optional().or(z.literal(""));

const baseSchema = z.object({
  nombre: z.string().trim().min(1, "Requerido").max(120, "Máximo 120 caracteres"),
  empresa: optionalString(200),
  email: z.string().trim().email("Email no válido").max(255, "Máximo 255 caracteres"),
  telefono: z
    .string()
    .trim()
    .max(20, "Máximo 20 caracteres")
    .regex(/^[+\d\s().-]*$/, "Sólo dígitos y símbolos válidos")
    .optional()
    .or(z.literal("")),
  motivo: z.enum(motivoValues, { message: "Selecciona un motivo" }),
  // Campos por motivo (todos opcionales en base; se requieren condicionalmente más abajo)
  marca: optionalString(80),
  numeroSerie: optionalString(60),
  producto: optionalString(120),
  urgencia: z.enum(URGENCIAS).optional(),
  referencia: optionalString(80),
  vehiculo: z.enum(VEHICULOS).optional(),
  matricula: optionalString(15),
  ramo: z.enum(RAMOS).optional(),
  poliza: optionalString(60),
  mensaje: z
    .string()
    .trim()
    .min(10, "Cuéntanos un poco más")
    .max(2000, "Máximo 2000 caracteres"),
});

type FormData = z.infer<typeof baseSchema>;

// Reglas condicionales por motivo
const requiredByMotivo: Partial<Record<MotivoValue, Array<keyof FormData>>> = {
  garantias: ["marca"],
  reparaciones: ["producto", "urgencia"],
  repuestos: ["referencia"],
  movilidad: ["vehiculo"],
  seguros: ["ramo"],
};

const validateAll = (data: FormData) => {
  const r = baseSchema.safeParse(data);
  const errors: Record<string, string> = {};
  if (!r.success) {
    r.error.issues.forEach((i) => {
      errors[i.path[0] as string] = i.message;
    });
  }
  // Validación condicional
  const required = requiredByMotivo[data.motivo as MotivoValue] || [];
  required.forEach((field) => {
    const v = (data as Record<string, unknown>)[field];
    if (!v || (typeof v === "string" && v.trim() === "")) {
      errors[field as string] = "Requerido para este motivo";
    }
  });
  return errors;
};

const initialForm: FormData = {
  nombre: "",
  empresa: "",
  email: "",
  telefono: "",
  motivo: "" as MotivoValue,
  marca: "",
  numeroSerie: "",
  producto: "",
  urgencia: undefined,
  referencia: "",
  vehiculo: undefined,
  matricula: "",
  ramo: undefined,
  poliza: "",
  mensaje: "",
};

const Contacto = () => {
  const [form, setForm] = useState<FormData>(initialForm);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState<"form" | "review">("form");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const allErrors = useMemo(() => validateAll(form), [form]);
  const visibleErrs = useMemo(() => {
    const out: Record<string, string> = {};
    Object.entries(allErrors).forEach(([k, v]) => {
      if (touched[k]) out[k] = v;
    });
    // Errores forzados (al intentar avanzar) se mantienen
    Object.entries(errs).forEach(([k, v]) => {
      if (v) out[k] = v;
    });
    return out;
  }, [allErrors, touched, errs]);

  const markTouched = (field: string) =>
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));

  const update = <K extends keyof FormData>(field: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  useEffect(() => {
    const TITLE = "Contacto · Grupo WG | Hablemos de tu servicio postventa";
    const DESC =
      "Contacta con Grupo WG. Convertimos el servicio postventa en un sistema bajo control: garantías, reparaciones, repuestos, movilidad y seguros.";
    const ORIGIN =
      typeof window !== "undefined" ? window.location.origin : "https://grupowg.lovable.app";
    const URL = `${ORIGIN}/contacto`;
    // Reutiliza la OG image global definida en index.html (verificada y servida correctamente).
    const existingOg = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
    const IMAGE =
      existingOg?.getAttribute("content") ||
      "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/81e8433f-b22f-4fcd-8e97-ed835e2d2373/id-preview-30d46061--9ab87566-7170-4271-8fbb-e76ea62dec17.lovable.app-1777036857514.png";

    document.title = TITLE;

    const setMeta = (selector: string, attr: string, value: string, create: () => HTMLMetaElement) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    // Description
    setMeta('meta[name="description"]', "content", DESC, () => {
      const m = document.createElement("meta");
      m.setAttribute("name", "description");
      return m;
    });

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", URL);

    // OpenGraph
    const og: Array<[string, string]> = [
      ["og:title", TITLE],
      ["og:description", DESC],
      ["og:type", "website"],
      ["og:url", URL],
      ["og:image", IMAGE],
      ["og:site_name", "Grupo WG"],
      ["og:locale", "es_ES"],
    ];
    og.forEach(([prop, val]) => {
      setMeta(`meta[property="${prop}"]`, "content", val, () => {
        const m = document.createElement("meta");
        m.setAttribute("property", prop);
        return m;
      });
    });

    // Twitter
    const tw: Array<[string, string]> = [
      ["twitter:card", "summary_large_image"],
      ["twitter:title", TITLE],
      ["twitter:description", DESC],
      ["twitter:image", IMAGE],
    ];
    tw.forEach(([name, val]) => {
      setMeta(`meta[name="${name}"]`, "content", val, () => {
        const m = document.createElement("meta");
        m.setAttribute("name", name);
        return m;
      });
    });

    // JSON-LD ContactPage + Organization
    const ldId = "ld-contacto";
    document.getElementById(ldId)?.remove();
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = ldId;
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: TITLE,
      description: DESC,
      url: URL,
      mainEntity: {
        "@type": "Organization",
        name: "Grupo Warranty Global",
        url: "https://grupowg.com",
        email: "info@grupowg.com",
        telephone: "+34900000000",
        address: { "@type": "PostalAddress", addressCountry: "ES" },
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "info@grupowg.com",
            telephone: "+34900000000",
            availableLanguage: ["Spanish"],
            areaServed: "ES",
          },
        ],
      },
    });
    document.head.appendChild(ld);

    return () => {
      document.getElementById(ldId)?.remove();
    };
  }, []);

  const goReview = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateAll(form);
    if (Object.keys(errors).length > 0) {
      setErrs(errors);
      // marca todos como touched para mostrar errores
      const t: Record<string, boolean> = {};
      Object.keys(errors).forEach((k) => (t[k] = true));
      setTouched((prev) => ({ ...prev, ...t }));
      toast.error("Revisa los campos marcados");
      return;
    }
    setErrs({});
    setStep("review");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmSend = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setSent(true);
    toast.success("Mensaje recibido");
  };

  const motivoLabel = MOTIVOS.find((m) => m.value === form.motivo)?.label ?? "—";

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

      {/* SEO CONTENT — direcciones, horarios, áreas de servicio */}
      <section className="bg-bone border-t border-foreground/5">
        <div className="container-tight py-16 md:py-24">
          <Reveal>
            <p className="eyebrow-mono mb-3">Información de contacto</p>
            <h2 className="heading-display text-ink text-3xl md:text-5xl text-balance max-w-3xl">
              Cómo y cuándo <span className="text-teal italic">trabajamos contigo</span>.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Reveal>
              <article className="rounded-2xl border border-border bg-card p-7 h-full">
                <h3 className="font-display text-xl text-ink mb-4">Sede y direcciones</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Grupo Warranty Global opera desde su sede central en España, con presencia
                  operativa nacional a través de la red WG Network.
                </p>
                <dl className="mt-5 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Oficina central
                    </dt>
                    <dd className="text-ink font-medium">España</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Email corporativo
                    </dt>
                    <dd>
                      <a
                        href="mailto:info@grupowg.com"
                        className="text-ink font-medium hover:text-teal"
                      >
                        info@grupowg.com
                      </a>
                    </dd>
                  </div>
                </dl>
              </article>
            </Reveal>

            <Reveal delay={100}>
              <article className="rounded-2xl border border-border bg-card p-7 h-full">
                <h3 className="font-display text-xl text-ink mb-4">Horarios de atención</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Atención comercial y técnica en horario laboral peninsular. Las urgencias
                  operativas se gestionan a través de los canales contratados con cada cliente.
                </p>
                <dl className="mt-5 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Lunes a Viernes
                    </dt>
                    <dd className="text-ink font-medium">09:00 – 18:00 (CET)</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Sábados, Domingos y festivos
                    </dt>
                    <dd className="text-ink font-medium">Cerrado · Guardias bajo contrato</dd>
                  </div>
                </dl>
              </article>
            </Reveal>

            <Reveal delay={200}>
              <article className="rounded-2xl border border-border bg-card p-7 h-full">
                <h3 className="font-display text-xl text-ink mb-4">Áreas de servicio</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cobertura nacional en España (Península, Baleares y Canarias) y proyectos
                  internacionales seleccionados.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-ink/85">
                  <li className="flex gap-2">
                    <span className="text-teal">·</span> Garantías y postventa industrial
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal">·</span> Reparaciones e instalaciones
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal">·</span> Repuestos y logística
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal">·</span> Movilidad y aseguradoras
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal">·</span> WG Network · Colaboradores
                  </li>
                </ul>
              </article>
            </Reveal>
          </div>

          <Reveal delay={250}>
            <p className="mt-12 text-sm text-muted-foreground max-w-2xl">
              Si representas a un fabricante, distribuidor, ecommerce, aseguradora, SAT o
              instalador y quieres explorar una colaboración, escríbenos a{" "}
              <a
                href="mailto:info@grupowg.com"
                className="text-ink font-medium underline hover:text-teal"
              >
                info@grupowg.com
              </a>{" "}
              o utiliza el formulario superior. Respondemos en un plazo máximo de 48 horas
              laborables.
            </p>
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
