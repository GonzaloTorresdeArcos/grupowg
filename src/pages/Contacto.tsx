import { useState } from "react";
import { z } from "zod";
import { ArrowRight, Check, Loader2, Mail, Phone, MapPin } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { toast } from "sonner";

const schema = z.object({
  nombre: z.string().trim().min(1, "Requerido").max(120),
  empresa: z.string().trim().max(200).optional(),
  email: z.string().trim().email("Email no válido").max(255),
  telefono: z.string().trim().max(20).optional(),
  mensaje: z.string().trim().min(10, "Cuéntanos un poco más").max(2000),
});

const Contacto = () => {
  const [form, setForm] = useState({ nombre: "", empresa: "", email: "", telefono: "", mensaje: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) {
      const ne: Record<string, string> = {};
      r.error.issues.forEach((i) => { ne[i.path[0] as string] = i.message; });
      setErrs(ne);
      return;
    }
    setErrs({});
    setLoading(true);
    // En esta v1 mostramos confirmación. La conexión a CRM/email se añadirá después.
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setSent(true);
    toast.success("Mensaje recibido");
  };

  return (
    <section className="pt-40 pb-32 bg-bone">
      <div className="container-tight grid gap-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Reveal>
            <p className="eyebrow mb-4">Contacto</p>
            <h1 className="heading-display text-ink text-5xl md:text-7xl text-balance">
              Hablemos.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-md">
              Si eres fabricante, distribuidor, ecommerce, aseguradora, SAT o instalador,
              cuéntanos qué necesitas resolver.
            </p>
            <div className="mt-12 space-y-5 text-sm">
              <div className="flex items-start gap-3"><Mail className="h-4 w-4 mt-1 text-teal" /><span>info@grupowg.com</span></div>
              <div className="flex items-start gap-3"><Phone className="h-4 w-4 mt-1 text-teal" /><span>+34 900 000 000</span></div>
              <div className="flex items-start gap-3"><MapPin className="h-4 w-4 mt-1 text-teal" /><span>Oficinas Grupo Warranty Global, España</span></div>
            </div>
          </Reveal>
        </div>

        <div className="md:col-span-7">
          {sent ? (
            <Reveal>
              <div className="rounded-3xl bg-ink text-bone p-12">
                <div className="h-12 w-12 rounded-full bg-teal flex items-center justify-center mb-6"><Check className="h-5 w-5 text-ink" /></div>
                <h2 className="font-display text-3xl mb-4">Mensaje recibido.</h2>
                <p className="text-bone/70">Te contestaremos lo antes posible. Gracias por confiar en Grupo WG.</p>
              </div>
            </Reveal>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5 rounded-3xl bg-card border border-border p-8 md:p-10">
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Nombre *" error={errs.nombre}>
                  <input className="input-base" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                </Field>
                <Field label="Empresa">
                  <input className="input-base" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
                </Field>
                <Field label="Email *" error={errs.email}>
                  <input type="email" className="input-base" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <Field label="Teléfono">
                  <input className="input-base" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </Field>
              </div>
              <Field label="¿En qué podemos ayudarte? *" error={errs.mensaje}>
                <textarea className="input-base min-h-32" value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} />
              </Field>
              <button disabled={loading} className="btn-primary disabled:opacity-50">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar mensaje <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .input-base {
          width: 100%; border: 1px solid hsl(var(--border));
          background: hsl(var(--card)); border-radius: 0.75rem;
          padding: 0.75rem 1rem; font-size: 0.95rem; color: hsl(var(--foreground));
          transition: all 0.2s;
        }
        .input-base:focus { outline: none; border-color: hsl(var(--ink)); box-shadow: 0 0 0 3px hsl(var(--teal) / 0.2); }
      `}</style>
    </section>
  );
};

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-sm font-medium text-ink mb-2">{label}</span>
    {children}
    {error && <span className="block text-xs text-destructive mt-1.5">{error}</span>}
  </label>
);

export default Contacto;
