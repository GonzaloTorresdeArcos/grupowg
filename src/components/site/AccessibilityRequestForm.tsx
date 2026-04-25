import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Copy, Loader2, Mail, ShieldCheck } from "lucide-react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          size?: "normal" | "compact" | "invisible";
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          "timeout-callback"?: () => void;
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.turnstile) return resolve();
    if (document.getElementById(TURNSTILE_SCRIPT_ID)) {
      const check = setInterval(() => {
        if (window.turnstile) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      return;
    }
    const cbName = `cfTurnstileLoad_${Math.random().toString(36).slice(2)}`;
    (window as any)[cbName] = () => resolve();
    const s = document.createElement("script");
    s.id = TURNSTILE_SCRIPT_ID;
    s.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?onload=${cbName}&render=explicit`;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  });
}

const schema = z.object({
  request_type: z.enum(["informacion_accesible", "queja", "reclamacion", "sugerencia"], {
    errorMap: () => ({ message: "Selecciona el tipo de comunicación" }),
  }),
  full_name: z.string().trim().min(2, "Indica tu nombre completo").max(120),
  email: z.string().trim().email("Email no válido").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  organization: z.string().trim().max(160).optional().or(z.literal("")),
  page_url: z.string().trim().max(500).optional().or(z.literal("")),
  preferred_format: z.enum(["email", "telefono", "correo_postal", "otro"]),
  postal_address: z.string().trim().max(300).optional().or(z.literal("")),
  description: z
    .string()
    .trim()
    .min(20, "Describe la situación con al menos 20 caracteres")
    .max(4000, "Máximo 4000 caracteres"),
  assistive_tech: z.string().trim().max(200).optional().or(z.literal("")),
  consent_given: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar el tratamiento de tus datos" }),
  }),
});

type FormState = {
  request_type: "informacion_accesible" | "queja" | "reclamacion" | "sugerencia" | "";
  full_name: string;
  email: string;
  phone: string;
  organization: string;
  page_url: string;
  preferred_format: "email" | "telefono" | "correo_postal" | "otro";
  postal_address: string;
  description: string;
  assistive_tech: string;
  consent_given: boolean;
};

const initial: FormState = {
  request_type: "",
  full_name: "",
  email: "",
  phone: "",
  organization: "",
  page_url: "",
  preferred_format: "email",
  postal_address: "",
  description: "",
  assistive_tech: "",
  consent_given: false,
};

export const AccessibilityRequestForm = () => {
  const location = useLocation();
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenResolverRef = useRef<((token: string | null) => void) | null>(null);

  // Cargar site key + script Turnstile y renderizar widget invisible
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("submit-accessibility-request", {
          method: "GET",
        });
        if (error) throw error;
        const key = (data as any)?.site_key as string | undefined;
        if (!key) throw new Error("missing_site_key");
        if (cancelled) return;
        setSiteKey(key);
        await loadTurnstileScript();
        if (cancelled || !widgetRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(widgetRef.current, {
          sitekey: key,
          size: "invisible",
          appearance: "interaction-only",
          callback: (token: string) => {
            tokenResolverRef.current?.(token);
            tokenResolverRef.current = null;
          },
          "error-callback": () => {
            tokenResolverRef.current?.(null);
            tokenResolverRef.current = null;
          },
          "expired-callback": () => {
            if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
          },
        });
      } catch (err) {
        console.error("[accessibility-form] turnstile init failed", err);
      }
    })();
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* noop */ }
      }
    };
  }, []);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key as string]) {
      setErrors((e) => {
        const n = { ...e };
        delete n[key as string];
        return n;
      });
    }
  };

  const getCaptchaToken = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!widgetIdRef.current || !window.turnstile) return resolve(null);
      tokenResolverRef.current = resolve;
      try {
        window.turnstile.reset(widgetIdRef.current);
        window.turnstile.execute(widgetIdRef.current);
      } catch {
        resolve(null);
      }
      // Timeout de seguridad
      setTimeout(() => {
        if (tokenResolverRef.current === resolve) {
          tokenResolverRef.current = null;
          resolve(null);
        }
      }, 30000);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        if (i.path[0]) fieldErrors[i.path[0] as string] = i.message;
      });
      setErrors(fieldErrors);
      toast.error("Revisa los campos marcados");
      return;
    }

    if (!siteKey) {
      toast.error("Verificación de seguridad no disponible. Recarga la página.");
      return;
    }

    setSubmitting(true);
    try {
      const captchaToken = await getCaptchaToken();
      if (!captchaToken) {
        toast.error("No hemos podido verificar tu navegador. Inténtalo de nuevo.");
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("submit-accessibility-request", {
        body: {
          request_type: parsed.data.request_type,
          full_name: parsed.data.full_name,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          organization: parsed.data.organization || null,
          page_url: parsed.data.page_url || `${window.location.origin}${location.pathname}`,
          preferred_format: parsed.data.preferred_format,
          postal_address: parsed.data.postal_address || null,
          description: parsed.data.description,
          assistive_tech: parsed.data.assistive_tech || null,
          consent_given: true,
          turnstile_token: captchaToken,
        },
      });

      if (error || (data as any)?.error) {
        const code = (data as any)?.error ?? "unknown";
        if (code === "captcha_failed") {
          toast.error("La verificación de seguridad ha fallado. Inténtalo de nuevo.");
        } else if (code === "validation_failed") {
          toast.error("Algunos datos no son válidos. Revisa el formulario.");
        } else {
          toast.error("No hemos podido enviar tu solicitud. Inténtalo de nuevo.");
        }
        return;
      }

      setSuccess(true);
      setForm(initial);
      toast.success("Solicitud enviada correctamente");
    } catch (err: any) {
      console.error("[accessibility-form] submit error", err);
      toast.error("No hemos podido enviar tu solicitud. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-border bg-muted/20 p-8 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-teal/15 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-teal" aria-hidden="true" />
        </div>
        <h3 className="font-display text-2xl text-ink">Hemos recibido tu solicitud</h3>
        <p className="text-sm text-ink-soft max-w-md mx-auto">
          Te responderemos en el plazo máximo de <strong className="text-ink">veinte días hábiles</strong>{" "}
          conforme al artículo 12 del RD 1112/2018, en el formato que has indicado.
        </p>
        <Button variant="outline" onClick={() => setSuccess(false)}>
          Enviar otra solicitud
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Formulario de comunicaciones de accesibilidad"
      className="rounded-2xl border border-border bg-background p-6 sm:p-8 space-y-6"
    >
      {/* Tipo de comunicación */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">
          Tipo de comunicación <span aria-hidden="true" className="text-destructive">*</span>
        </legend>
        <RadioGroup
          value={form.request_type}
          onValueChange={(v) => update("request_type", v as FormState["request_type"])}
          className="grid sm:grid-cols-2 gap-2"
        >
          {[
            { v: "informacion_accesible", l: "Solicitud de información accesible" },
            { v: "queja", l: "Queja por incumplimiento" },
            { v: "reclamacion", l: "Reclamación" },
            { v: "sugerencia", l: "Sugerencia de mejora" },
          ].map((o) => (
            <label
              key={o.v}
              htmlFor={`rt-${o.v}`}
              className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40 transition-colors has-[:checked]:border-teal has-[:checked]:bg-teal/5"
            >
              <RadioGroupItem id={`rt-${o.v}`} value={o.v} className="mt-0.5" />
              <span className="text-sm text-ink leading-tight">{o.l}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.request_type && (
          <p className="text-xs text-destructive" role="alert">{errors.request_type}</p>
        )}
      </fieldset>

      {/* Datos de contacto */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="ac-name">
            Nombre completo <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <Input
            id="ac-name"
            value={form.full_name}
            onChange={(e) => update("full_name", e.target.value)}
            autoComplete="name"
            aria-invalid={!!errors.full_name}
            aria-describedby={errors.full_name ? "ac-name-err" : undefined}
            required
          />
          {errors.full_name && (
            <p id="ac-name-err" className="text-xs text-destructive" role="alert">{errors.full_name}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ac-email">
            Email <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <Input
            id="ac-email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "ac-email-err" : undefined}
            required
          />
          {errors.email && (
            <p id="ac-email-err" className="text-xs text-destructive" role="alert">{errors.email}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ac-phone">Teléfono <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <Input
            id="ac-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            autoComplete="tel"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ac-org">Organización <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <Input
            id="ac-org"
            value={form.organization}
            onChange={(e) => update("organization", e.target.value)}
            autoComplete="organization"
          />
        </div>
      </div>

      {/* Página afectada */}
      <div className="space-y-1.5">
        <Label htmlFor="ac-page">Página o contenido afectado <span className="text-muted-foreground text-xs">(URL u descripción)</span></Label>
        <Input
          id="ac-page"
          value={form.page_url}
          onChange={(e) => update("page_url", e.target.value)}
          placeholder="https://grupowg.com/..."
        />
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <Label htmlFor="ac-desc">
          Describe la situación <span aria-hidden="true" className="text-destructive">*</span>
        </Label>
        <Textarea
          id="ac-desc"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="Indica los hechos: qué intentabas hacer, qué barrera encontraste, navegador o tecnología utilizada, etc."
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "ac-desc-err" : "ac-desc-hint"}
          required
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span id="ac-desc-hint">Mínimo 20 caracteres. {form.description.length}/4000</span>
        </div>
        {errors.description && (
          <p id="ac-desc-err" className="text-xs text-destructive" role="alert">{errors.description}</p>
        )}
      </div>

      {/* Tecnología de apoyo */}
      <div className="space-y-1.5">
        <Label htmlFor="ac-tech">Tecnología de apoyo utilizada <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Input
          id="ac-tech"
          value={form.assistive_tech}
          onChange={(e) => update("assistive_tech", e.target.value)}
          placeholder="Ej. NVDA, JAWS, VoiceOver, lupa, navegación por teclado..."
        />
      </div>

      {/* Formato preferido */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="ac-format">
            Formato preferido de respuesta <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <Select
            value={form.preferred_format}
            onValueChange={(v) => update("preferred_format", v as FormState["preferred_format"])}
          >
            <SelectTrigger id="ac-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="telefono">Teléfono</SelectItem>
              <SelectItem value="correo_postal">Correo postal</SelectItem>
              <SelectItem value="otro">Otro (indícalo en la descripción)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.preferred_format === "correo_postal" && (
          <div className="space-y-1.5">
            <Label htmlFor="ac-postal">Dirección postal</Label>
            <Input
              id="ac-postal"
              value={form.postal_address}
              onChange={(e) => update("postal_address", e.target.value)}
              autoComplete="street-address"
            />
          </div>
        )}
      </div>

      {/* Consentimiento */}
      <div className="rounded-lg bg-muted/30 p-4">
        <label htmlFor="ac-consent" className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            id="ac-consent"
            checked={form.consent_given}
            onCheckedChange={(c) => update("consent_given", c === true)}
            aria-describedby={errors.consent_given ? "ac-consent-err" : undefined}
            className="mt-0.5"
          />
          <span className="text-xs text-ink-soft leading-relaxed">
            He leído y acepto la{" "}
            <a href="/legal/privacidad" className="underline hover:text-ink">
              Política de privacidad
            </a>
            . Mis datos serán tratados por Grupo Warranty Global con la única finalidad de
            gestionar esta comunicación de accesibilidad y darle respuesta en el plazo legal
            de 20 días hábiles. <span aria-hidden="true" className="text-destructive">*</span>
          </span>
        </label>
        {errors.consent_given && (
          <p id="ac-consent-err" className="text-xs text-destructive mt-2" role="alert">
            {errors.consent_given}
          </p>
        )}
      </div>

      {/* Widget Turnstile invisible — no requiere interacción del usuario */}
      <div ref={widgetRef} aria-hidden="true" className="hidden" />

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Protegido por Cloudflare Turnstile
        </p>
        <Button type="submit" disabled={submitting || !siteKey} className="w-full sm:w-auto">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Enviando…
            </>
          ) : (
            "Enviar comunicación"
          )}
        </Button>
      </div>
    </form>
  );
};
