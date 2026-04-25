import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { SimplePage } from "@/components/site/SimplePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  SearchX,
  AlertCircle,
} from "lucide-react";

const REF_REGEX = /^ACC-[A-F0-9]{8}$/i;

const schema = z.object({
  reference: z
    .string()
    .trim()
    .regex(REF_REGEX, "Formato esperado: ACC-XXXXXXXX"),
  email: z.string().trim().email("Email no válido").max(255),
});

type LookupResult =
  | {
      found: true;
      reference: string;
      request_type: string;
      status: string;
      created_at: string;
      updated_at: string;
      preferred_format: string | null;
      admin_notes: string | null;
    }
  | { found: false };

const REQUEST_TYPE_LABEL: Record<string, string> = {
  informacion_accesible: "Solicitud de información accesible",
  queja: "Queja por incumplimiento",
  reclamacion: "Reclamación",
  sugerencia: "Sugerencia de mejora",
};

const FORMAT_LABEL: Record<string, string> = {
  email: "Email",
  telefono: "Teléfono",
  correo_postal: "Correo postal",
  otro: "Otro (indicado en la descripción)",
};

const STATUS_META: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  received: { label: "Recibida", color: "bg-blue-500/15 text-blue-700", icon: Clock },
  in_review: { label: "En revisión", color: "bg-amber-500/15 text-amber-700", icon: Clock },
  resolved: { label: "Resuelta", color: "bg-emerald-500/15 text-emerald-700", icon: CheckCircle2 },
  rejected: { label: "Desestimada", color: "bg-rose-500/15 text-rose-700", icon: AlertCircle },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" });

const AccesibilidadEstado = () => {
  const [params, setParams] = useSearchParams();
  const [reference, setReference] = useState(params.get("ref") ?? "");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);

  useEffect(() => {
    document.title = "Estado de solicitud de accesibilidad · Grupo Warranty Global";
    const desc =
      "Consulta el estado de tu solicitud de accesibilidad usando la referencia y tu email.";
    let m = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", desc);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ reference, email });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        if (i.path[0]) fe[i.path[0] as string] = i.message;
      });
      setErrors(fe);
      return;
    }
    setErrors({});
    setLoading(true);
    setResult(null);

    // Reflejar la referencia en la URL para poder compartir el enlace
    setParams({ ref: parsed.data.reference.toUpperCase() }, { replace: true });

    try {
      const url = new URL(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/submit-accessibility-request`,
      );
      url.searchParams.set("reference", parsed.data.reference.toUpperCase());
      url.searchParams.set("email", parsed.data.email);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        if (data?.error === "invalid_lookup") {
          toast.error("Comprueba el formato de la referencia y el email.");
        } else {
          toast.error("No hemos podido consultar el estado. Inténtalo más tarde.");
        }
        return;
      }
      setResult(data as LookupResult);
    } catch (err) {
      console.error("[accessibility-status] lookup error", err);
      toast.error("No hemos podido consultar el estado. Inténtalo más tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SimplePage
      eyebrow="Accesibilidad"
      title="Consultar estado de tu solicitud"
      intro="Introduce el número de referencia que recibiste al enviar el formulario y el email asociado para ver el estado actual."
    >
      <div className="max-w-2xl space-y-8">
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-label="Consulta de estado de solicitud"
          className="rounded-2xl border border-border bg-background p-6 sm:p-8 space-y-5"
        >
          <div className="space-y-1.5">
            <Label htmlFor="lookup-ref">
              Número de referencia <span aria-hidden="true" className="text-destructive">*</span>
            </Label>
            <Input
              id="lookup-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="ACC-XXXXXXXX"
              autoComplete="off"
              aria-invalid={!!errors.reference}
              aria-describedby={errors.reference ? "lookup-ref-err" : "lookup-ref-hint"}
              required
              className="font-mono"
            />
            <p id="lookup-ref-hint" className="text-xs text-muted-foreground">
              Lo recibiste tras enviar el formulario de accesibilidad.
            </p>
            {errors.reference && (
              <p id="lookup-ref-err" className="text-xs text-destructive" role="alert">
                {errors.reference}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lookup-email">
              Email indicado en la solicitud{" "}
              <span aria-hidden="true" className="text-destructive">*</span>
            </Label>
            <Input
              id="lookup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "lookup-email-err" : undefined}
              required
            />
            {errors.email && (
              <p id="lookup-email-err" className="text-xs text-destructive" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
                Consultando...
              </>
            ) : (
              "Consultar estado"
            )}
          </Button>
        </form>

        {result && !result.found && (
          <div
            className="rounded-2xl border border-border bg-muted/20 p-6 text-center space-y-3"
            role="status"
          >
            <SearchX className="h-8 w-8 mx-auto text-muted-foreground" aria-hidden="true" />
            <h2 className="font-display text-xl text-ink">No hemos encontrado coincidencias</h2>
            <p className="text-sm text-ink-soft max-w-md mx-auto">
              Comprueba que la referencia y el email son correctos. Si necesitas ayuda, escríbenos
              a{" "}
              <a href="mailto:info@grupowg.com" className="underline hover:text-ink">
                info@grupowg.com
              </a>
              .
            </p>
          </div>
        )}

        {result && result.found && (
          <article
            className="rounded-2xl border border-border bg-background p-6 sm:p-8 space-y-5"
            aria-label="Detalle del estado de la solicitud"
          >
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Referencia</p>
                <p className="font-mono text-lg text-ink">{result.reference}</p>
              </div>
              <StatusBadge status={result.status} />
            </header>

            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Tipo de comunicación
                </dt>
                <dd className="text-ink mt-1">
                  {REQUEST_TYPE_LABEL[result.request_type] ?? result.request_type}
                </dd>
              </div>
              {result.preferred_format && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Formato de respuesta
                  </dt>
                  <dd className="text-ink mt-1">
                    {FORMAT_LABEL[result.preferred_format] ?? result.preferred_format}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Recibida</dt>
                <dd className="text-ink mt-1">{formatDate(result.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Última actualización
                </dt>
                <dd className="text-ink mt-1">{formatDate(result.updated_at)}</dd>
              </div>
            </dl>

            {result.admin_notes && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Nota del equipo
                </p>
                <p className="text-sm text-ink whitespace-pre-line">{result.admin_notes}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Plazo máximo de respuesta: veinte días hábiles desde la fecha de recepción
              (art. 12 RD 1112/2018).
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild variant="default">
                <a
                  href={`mailto:info@grupowg.com?subject=${encodeURIComponent(
                    `Consulta sobre solicitud ${result.reference}`,
                  )}`}
                >
                  <Mail className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  Contactar con el equipo
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link to="/legal/accesibilidad#formulario">Enviar otra solicitud</Link>
              </Button>
            </div>
          </article>
        )}
      </div>
    </SimplePage>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const meta = STATUS_META[status] ?? {
    label: status,
    color: "bg-muted text-ink",
    icon: Clock,
  };
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.color}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
};

export default AccesibilidadEstado;
