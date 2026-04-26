import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { PresenceMap } from "@/components/site/PresenceMap";
import { toast } from "sonner";

const MOTIVOS = [
  { value: "reparaciones", label: "Reparaciones" },
  { value: "instalaciones", label: "Instalaciones" },
  { value: "repuestos", label: "Repuestos" },
  { value: "movilidad", label: "Equipos" },
  { value: "garantias", label: "Garantías" },
  { value: "seguros", label: "Seguros" },
  { value: "wg-network", label: "Formulario WG Network" },
  { value: "otro", label: "Otro" },
] as const;

type MotivoValue = (typeof MOTIVOS)[number]["value"];
const motivoValues = MOTIVOS.map((m) => m.value) as [MotivoValue, ...MotivoValue[]];

const URGENCIAS = ["Estándar", "Alta", "Crítica"] as const;
const RAMOS = ["Hogar", "Decesos", "Salud", "Auto", "Comercio", "Otro"] as const;
const VEHICULOS = ["Turismo", "Furgoneta", "Industrial", "Moto", "Otro"] as const;

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const buildOptionalString = (max: number, t: TFunc) =>
  z
    .string()
    .trim()
    .max(max, t("form.errors.max", { n: max }))
    .optional()
    .or(z.literal(""));

const buildSchema = (t: TFunc) =>
  z.object({
    nombre: z
      .string()
      .trim()
      .min(1, t("form.errors.required"))
      .max(120, t("form.errors.max", { n: 120 })),
    empresa: buildOptionalString(200, t),
    email: z
      .string()
      .trim()
      .email(t("form.errors.email"))
      .max(255, t("form.errors.max", { n: 255 })),
    telefono: z
      .string()
      .trim()
      .max(20, t("form.errors.max", { n: 20 }))
      .regex(/^[+\d\s().-]*$/, t("form.errors.phone"))
      .optional()
      .or(z.literal("")),
    motivo: z.array(z.enum(motivoValues)).min(1, t("form.errors.motivoMin")),
    // Campos por motivo (todos opcionales en base; se requieren condicionalmente más abajo)
    marca: buildOptionalString(80, t),
    numeroSerie: buildOptionalString(60, t),
    producto: buildOptionalString(120, t),
    urgencia: z.enum(URGENCIAS).optional(),
    referencia: buildOptionalString(80, t),
    vehiculo: z.enum(VEHICULOS).optional(),
    matricula: buildOptionalString(15, t),
    ramo: z.enum(RAMOS).optional(),
    poliza: buildOptionalString(60, t),
    mensaje: z
      .string()
      .trim()
      .min(10, t("form.errors.min"))
      .max(2000, t("form.errors.max", { n: 2000 })),
    consentimiento: z.literal(true, {
      errorMap: () => ({ message: t("form.errors.consent") }),
    }),
  });

// Schema "neutral" (en español) usado solo para inferir el tipo `FormData`.
// Las validaciones reales pasan por `buildSchema(t)` dentro del componente.
const baseSchema = buildSchema(((k: string, o?: Record<string, unknown>) => {
  // Identidad: devuelve la clave para no romper inferencia
  return o ? `${k}` : k;
}) as TFunc);

type FormData = z.infer<typeof baseSchema>;

// Reglas condicionales por motivo (campos requeridos)
const requiredByMotivo: Partial<Record<MotivoValue, Array<keyof FormData>>> = {
  garantias: ["marca"],
  reparaciones: ["producto", "urgencia"],
  instalaciones: ["producto", "urgencia"],
  repuestos: ["referencia"],
  movilidad: ["vehiculo"],
  seguros: ["ramo"],
};

// Todos los campos visibles por motivo (requeridos + opcionales)
const fieldsByMotivo: Partial<Record<MotivoValue, Array<keyof FormData>>> = {
  garantias: ["marca", "numeroSerie"],
  reparaciones: ["producto", "urgencia"],
  instalaciones: ["producto", "urgencia"],
  repuestos: ["referencia"],
  movilidad: ["vehiculo", "matricula"],
  seguros: ["ramo", "poliza"],
};

// Todos los campos posibles condicionales (para limpieza al cambiar de motivo)
const ALL_CONDITIONAL_FIELDS: Array<keyof FormData> = [
  "marca",
  "numeroSerie",
  "producto",
  "urgencia",
  "referencia",
  "vehiculo",
  "matricula",
  "ramo",
  "poliza",
];

const getActiveFields = (motivos: MotivoValue[]): Set<string> => {
  const set = new Set<string>();
  motivos.forEach((m) => {
    (fieldsByMotivo[m] || []).forEach((f) => set.add(f as string));
  });
  return set;
};

const getRequiredFields = (motivos: MotivoValue[]): Array<keyof FormData> => {
  const out = new Set<keyof FormData>();
  motivos.forEach((m) => {
    (requiredByMotivo[m] || []).forEach((f) => out.add(f));
  });
  return Array.from(out);
};

const buildValidator = (t: TFunc) => {
  const schema = buildSchema(t);
  return (data: FormData) => {
    const r = schema.safeParse(data);
    const errors: Record<string, string> = {};
    const motivos = (data.motivo || []) as MotivoValue[];
    const activeFields = getActiveFields(motivos);

    if (!r.success) {
      r.error.issues.forEach((i) => {
        const key = i.path[0] as string;
        if (ALL_CONDITIONAL_FIELDS.includes(key as keyof FormData) && !activeFields.has(key)) {
          return;
        }
        errors[key] = i.message;
      });
    }
    getRequiredFields(motivos).forEach((field) => {
      const v = (data as Record<string, unknown>)[field];
      const isEmpty = !v || (typeof v === "string" && v.trim() === "");
      if (!isEmpty) return;
      const motivosForField = motivos.filter((m) =>
        (requiredByMotivo[m] || []).includes(field),
      );
      const motivoLabels = motivosForField
        .map((m) => t(`form.motivos.${m}`, { defaultValue: m }))
        .join(" / ");
      errors[field as string] = motivoLabels
        ? t("form.errors.requiredForMotivo", { motivos: motivoLabels })
        : t("form.errors.required");
    });
    return errors;
  };
};

const initialForm: FormData = {
  nombre: "",
  empresa: "",
  email: "",
  telefono: "",
  motivo: [] as MotivoValue[],
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
  consentimiento: false as unknown as true,
};

const DRAFT_KEY = "wg:contacto:draft:v1";
const DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

// ============= i18n para la vista previa de campos =============
type PreviewLang = "es" | "en" | "pt" | "fr";

const PREVIEW_I18N: Record<PreviewLang, {
  title: string;
  required: string;
  langLabel: string;
  motivoLabels: Partial<Record<MotivoValue, string>>;
  fieldLabels: Record<string, string>;
}> = {
  es: {
    title: "Información adicional que te pediremos",
    required: "Campos obligatorios",
    langLabel: "Idioma",
    motivoLabels: {
      reparaciones: "Reparaciones",
      instalaciones: "Instalaciones",
      repuestos: "Repuestos",
      movilidad: "Equipos",
      garantias: "Garantías",
      seguros: "Seguros",
      "wg-network": "Formulario WG Network",
      otro: "Otro",
    },
    fieldLabels: {
      marca: "Marca",
      numeroSerie: "Nº de serie",
      producto: "Producto",
      urgencia: "Urgencia",
      referencia: "Referencia",
      vehiculo: "Tipo de equipo",
      matricula: "Identificador",
      ramo: "Ramo",
      poliza: "Póliza",
    },
  },
  en: {
    title: "Additional information we'll ask for",
    required: "Required fields",
    langLabel: "Language",
    motivoLabels: {
      reparaciones: "Repairs",
      instalaciones: "Installations",
      repuestos: "Spare parts",
      movilidad: "Equipment",
      garantias: "Warranties",
      seguros: "Insurance",
      "wg-network": "WG Network form",
      otro: "Other",
    },
    fieldLabels: {
      marca: "Brand",
      numeroSerie: "Serial number",
      producto: "Product",
      urgencia: "Urgency",
      referencia: "Reference",
      vehiculo: "Equipment type",
      matricula: "Identifier",
      ramo: "Insurance line",
      poliza: "Policy",
    },
  },
  pt: {
    title: "Informação adicional que iremos pedir-te",
    required: "Campos obrigatórios",
    langLabel: "Idioma",
    motivoLabels: {
      reparaciones: "Reparações",
      instalaciones: "Instalações",
      repuestos: "Peças sobressalentes",
      movilidad: "Equipamentos",
      garantias: "Garantias",
      seguros: "Seguros",
      "wg-network": "Formulário WG Network",
      otro: "Outro",
    },
    fieldLabels: {
      marca: "Marca",
      numeroSerie: "Nº de série",
      producto: "Produto",
      urgencia: "Urgência",
      referencia: "Referência",
      vehiculo: "Tipo de equipamento",
      matricula: "Identificador",
      ramo: "Ramo",
      poliza: "Apólice",
    },
  },
  fr: {
    title: "Informations supplémentaires que nous vous demanderons",
    required: "Champs obligatoires",
    langLabel: "Langue",
    motivoLabels: {
      reparaciones: "Réparations",
      instalaciones: "Installations",
      repuestos: "Pièces détachées",
      movilidad: "Équipements",
      garantias: "Garanties",
      seguros: "Assurances",
      "wg-network": "Formulaire WG Network",
      otro: "Autre",
    },
    fieldLabels: {
      marca: "Marque",
      numeroSerie: "Nº de série",
      producto: "Produit",
      urgencia: "Urgence",
      referencia: "Référence",
      vehiculo: "Type d'équipement",
      matricula: "Identifiant",
      ramo: "Branche",
      poliza: "Police",
    },
  },
};

type DraftPayload = {
  form: FormData;
  step: "form" | "review";
  savedAt: number;
  consentAt?: number | null;
};

const loadDraft = (): DraftPayload | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const isDraftMeaningful = (f: FormData) =>
  !!(
    f.nombre?.trim() ||
    f.empresa?.trim() ||
    f.email?.trim() ||
    f.telefono?.trim() ||
    (f.motivo && f.motivo.length > 0) ||
    f.mensaje?.trim()
  );

const Contacto = () => {
  const { t, i18n } = useTranslation("contacto");
  const validateAll = useMemo(
    () => buildValidator(t as TFunc),
    // re-crea el validador cuando cambia el idioma
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n.language],
  );
  const [form, setForm] = useState<FormData>(initialForm);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState<"form" | "review">("form");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [restored, setRestored] = useState<Date | null>(null);
  const [consentAt, setConsentAt] = useState<Date | null>(null);
  const [previewLang, setPreviewLang] = useState<PreviewLang>(
    (i18n.resolvedLanguage?.split("-")[0] as PreviewLang) || "es",
  );

  // Hidratar borrador desde localStorage al montar
  useEffect(() => {
    const draft = loadDraft();
    if (draft && isDraftMeaningful(draft.form)) {
      // Normaliza motivo: drafts antiguos pueden tener un string en vez de array
      const rawMotivo = (draft.form as unknown as { motivo?: unknown }).motivo;
      const normalizedMotivo: MotivoValue[] = Array.isArray(rawMotivo)
        ? (rawMotivo as MotivoValue[])
        : typeof rawMotivo === "string" && rawMotivo
          ? [rawMotivo as MotivoValue]
          : [];
      setForm({ ...draft.form, motivo: normalizedMotivo });
      setStep(draft.step ?? "form");
      setRestored(new Date(draft.savedAt));
      if (draft.consentAt && draft.form.consentimiento) {
        setConsentAt(new Date(draft.consentAt));
      }
    }
    setHydrated(true);
  }, []);

  // Autoguardado con debounce
  useEffect(() => {
    if (!hydrated || sent) return;
    if (typeof window === "undefined") return;
    if (!isDraftMeaningful(form)) {
      window.localStorage.removeItem(DRAFT_KEY);
      return;
    }
    const id = window.setTimeout(() => {
      try {
        const payload: DraftPayload = {
          form,
          step,
          savedAt: Date.now(),
          consentAt: consentAt ? consentAt.getTime() : null,
        };
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      } catch {
        // noop (quota, modo privado, etc.)
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [form, step, hydrated, sent, consentAt]);

  const clearDraft = () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
    setRestored(null);
  };

  const discardDraft = () => {
    clearDraft();
    setForm(initialForm);
    setErrs({});
    setTouched({});
    setStep("form");
    setConsentAt(null);
    toast.success(t("form.discardDraft"));
  };

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

  // Defaults sensatos al marcar un motivo (solo se aplican si el campo está vacío)
  const defaultsByMotivo: Partial<Record<MotivoValue, Partial<FormData>>> = {
    reparaciones: { urgencia: "Estándar" },
    instalaciones: { urgencia: "Estándar" },
    movilidad: { vehiculo: "Turismo" },
    seguros: { ramo: "Hogar" },
  };

  // Toggle de motivo (multi-selección): añade/quita, limpia huérfanos y prerrellena defaults
  const toggleMotivo = (value: MotivoValue) => {
    setForm((f) => {
      const current = (f.motivo || []) as MotivoValue[];
      const isAdding = !current.includes(value);
      const next = isAdding ? [...current, value] : current.filter((v) => v !== value);
      const activeFields = getActiveFields(next);
      // Limpia valores de campos condicionales que ya no aplican a ningún motivo activo
      const cleaned: Partial<FormData> = {};
      ALL_CONDITIONAL_FIELDS.forEach((field) => {
        if (!activeFields.has(field as string)) {
          (cleaned as Record<string, unknown>)[field as string] =
            field === "urgencia" || field === "vehiculo" || field === "ramo" ? undefined : "";
        }
      });
      // Prerrellena defaults del motivo recién marcado (sin pisar valores existentes)
      const prefilled: Partial<FormData> = {};
      if (isAdding) {
        const defs = defaultsByMotivo[value] || {};
        Object.entries(defs).forEach(([k, v]) => {
          const currentVal = (f as Record<string, unknown>)[k];
          const isEmpty =
            currentVal === undefined || currentVal === null || currentVal === "";
          if (isEmpty) (prefilled as Record<string, unknown>)[k] = v;
        });
      }
      return { ...f, ...cleaned, ...prefilled, motivo: next };
    });
    markTouched("motivo");
    const nextActive = getActiveFields(
      ((form.motivo || []) as MotivoValue[]).includes(value)
        ? ((form.motivo || []) as MotivoValue[]).filter((v) => v !== value)
        : [...((form.motivo || []) as MotivoValue[]), value],
    );
    setTouched((t) => {
      const next = { ...t };
      ALL_CONDITIONAL_FIELDS.forEach((field) => {
        if (!nextActive.has(field as string)) delete next[field as string];
      });
      return next;
    });
    setErrs((e) => {
      const next = { ...e };
      ALL_CONDITIONAL_FIELDS.forEach((field) => {
        if (!nextActive.has(field as string)) delete next[field as string];
      });
      return next;
    });
  };

  useEffect(() => {
    const TITLE = t("seo.title");
    const DESC = t("seo.description");
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
  }, [t]);

  // Orden visual de los campos para focus al primer error
  const FIELD_ORDER: Array<keyof FormData> = [
    "nombre", "empresa", "email", "telefono", "motivo",
    "marca", "numeroSerie", "producto", "urgencia", "referencia",
    "vehiculo", "matricula", "ramo", "poliza", "mensaje", "consentimiento",
  ];

  // Etiquetas legibles para el resumen de errores
  const FIELD_LABELS: Record<string, string> = {
    nombre: "Nombre",
    empresa: "Empresa",
    email: "Email",
    telefono: "Teléfono",
    motivo: "Motivo de contacto",
    marca: "Marca",
    numeroSerie: "Nº de serie",
    producto: "Producto",
    urgencia: "Urgencia",
    referencia: "Referencia",
    vehiculo: "Tipo de vehículo",
    matricula: "Matrícula",
    ramo: "Ramo",
    poliza: "Póliza",
    mensaje: "Mensaje",
    consentimiento: "Consentimiento",
  };

  const scrollToField = (field: string) => {
    if (typeof document === "undefined") return;
    const wrapper = document.querySelector<HTMLElement>(`[data-field="${field}"]`);
    if (!wrapper) return;
    wrapper.setAttribute("data-shake", "true");
    window.setTimeout(() => wrapper.removeAttribute("data-shake"), 500);
    wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
    const control = wrapper.querySelector<HTMLElement>(
      "input, select, textarea, button",
    );
    window.setTimeout(() => control?.focus({ preventScroll: true }), 250);
  };

  // Lista ordenada de errores visibles (para resumen en cabecera)
  const orderedErrorList = useMemo(() => {
    return FIELD_ORDER.filter((k) => allErrors[k as string]).map((k) => ({
      key: k as string,
      label: FIELD_LABELS[k as string] ?? (k as string),
      message: allErrors[k as string],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allErrors]);

  const focusFirstError = (errors: Record<string, string>) => {
    if (typeof document === "undefined") return;
    const firstKey = FIELD_ORDER.find((k) => errors[k as string]);
    if (!firstKey) return;
    // Espera al render para que data-invalid esté aplicado
    requestAnimationFrame(() => {
      const wrapper = document.querySelector<HTMLElement>(
        `[data-field="${firstKey}"]`,
      );
      if (!wrapper) return;
      // Animación de shake
      wrapper.setAttribute("data-shake", "true");
      window.setTimeout(() => wrapper.removeAttribute("data-shake"), 500);
      // Scroll suave al campo
      wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
      // Focus al control interactivo
      const control = wrapper.querySelector<HTMLElement>(
        "input, select, textarea, button",
      );
      window.setTimeout(() => control?.focus({ preventScroll: true }), 250);
    });
  };

  const goReview = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateAll(form);
    if (Object.keys(errors).length > 0) {
      setErrs(errors);
      // marca todos como touched para mostrar errores
      const tk: Record<string, boolean> = {};
      Object.keys(errors).forEach((k) => (tk[k] = true));
      setTouched((prev) => ({ ...prev, ...tk }));
      toast.error(t("form.errors.reviewToast"));
      focusFirstError(errors);
      return;
    }
    setErrs({});
    setStep("review");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmSend = async () => {
    // Defensa extra: revalidar antes del envío real por si se manipuló el estado
    const errors = validateAll(form);
    if (Object.keys(errors).length > 0) {
      setErrs(errors);
      const tk: Record<string, boolean> = {};
      Object.keys(errors).forEach((k) => (tk[k] = true));
      setTouched((prev) => ({ ...prev, ...tk }));
      setStep("form");
      toast.error(t("form.errors.sendToast"));
      requestAnimationFrame(() => {
        const firstKey = FIELD_ORDER.find((k) => errors[k as string]);
        if (firstKey) scrollToField(firstKey as string);
      });
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setSent(true);
    clearDraft();
    toast.success(t("form.success.title"));
  };

  const motivoLabel =
    (form.motivo || []).length === 0
      ? "—"
      : (form.motivo || [])
          .map((m) => t(`form.motivos.${m}`, { defaultValue: m }))
          .join(", ");

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
            ) : step === "review" ? (
              <Reveal>
                <div className="rounded-3xl bg-card border border-border p-6 sm:p-8 md:p-10 shadow-sm">
                  <p className="eyebrow-mono mb-3">Paso 2 de 2 · Revisión</p>
                  <h2 className="font-display text-2xl md:text-3xl text-ink mb-6">
                    Revisa antes de enviar
                  </h2>
                  <dl className="divide-y divide-border text-sm">
                    <ReviewRow label="Nombre" value={form.nombre} />
                    {form.empresa && <ReviewRow label="Empresa" value={form.empresa} />}
                    <ReviewRow label="Email" value={form.email} />
                    {form.telefono && <ReviewRow label="Teléfono" value={form.telefono} />}
                    <ReviewRow label="Motivo" value={motivoLabel} />
                    {form.marca && <ReviewRow label="Marca" value={form.marca} />}
                    {form.numeroSerie && (
                      <ReviewRow label="Nº de serie" value={form.numeroSerie} />
                    )}
                    {form.producto && <ReviewRow label="Producto" value={form.producto} />}
                    {form.urgencia && <ReviewRow label="Urgencia" value={form.urgencia} />}
                    {form.referencia && (
                      <ReviewRow label="Referencia" value={form.referencia} />
                    )}
                    {form.vehiculo && <ReviewRow label="Vehículo" value={form.vehiculo} />}
                    {form.matricula && <ReviewRow label="Matrícula" value={form.matricula} />}
                    {form.ramo && <ReviewRow label="Ramo" value={form.ramo} />}
                    {form.poliza && <ReviewRow label="Póliza" value={form.poliza} />}
                    <ReviewRow label="Mensaje" value={form.mensaje} multiline />
                  </dl>

                  <div className="mt-6 rounded-xl border border-teal/30 bg-teal/5 px-4 py-3 flex items-start gap-3">
                    <Check className="h-4 w-4 text-teal mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-medium text-ink">
                        Consentimiento aceptado
                      </p>
                      <p className="mt-0.5 text-muted-foreground leading-relaxed">
                        Aceptaste el tratamiento de datos conforme a la{" "}
                        <a href="/privacidad" className="underline hover:text-ink">
                          política de privacidad
                        </a>{" "}
                        el{" "}
                        <span className="text-ink font-medium">
                          {(consentAt ?? new Date()).toLocaleString("es-ES", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setStep("form")}
                      disabled={loading}
                      className="btn-on-light w-full sm:w-auto justify-center"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Volver y editar
                    </button>
                    <button
                      type="button"
                      onClick={confirmSend}
                      disabled={loading}
                      className="btn-primary disabled:opacity-50 w-full sm:flex-1 justify-center"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Confirmar y enviar
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Reveal>
            ) : (
              <Reveal delay={80}>
                <form
                  onSubmit={goReview}
                  className="space-y-5 rounded-3xl bg-card border border-border p-6 sm:p-8 md:p-10 shadow-sm"
                  noValidate
                >
                  <p className="eyebrow-mono">Paso 1 de 2 · Datos</p>
                  {restored && (
                    <div className="rounded-xl border border-teal/30 bg-teal/5 px-4 py-3 flex items-start gap-3">
                      <Check className="h-4 w-4 text-teal mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0 text-xs text-ink/80">
                        <p className="font-medium text-ink">Borrador restaurado</p>
                        <p className="mt-0.5 text-muted-foreground">
                          Recuperamos tus datos guardados el{" "}
                          {restored.toLocaleString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          .
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={discardDraft}
                        className="text-xs font-medium text-ink/70 hover:text-ink underline underline-offset-2 flex-shrink-0"
                      >
                        Descartar
                      </button>
                    </div>
                  )}
                  {Object.keys(errs).length > 0 && orderedErrorList.length > 0 && (
                    <div
                      role="alert"
                      aria-live="polite"
                      className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3"
                    >
                      <p className="text-sm font-medium text-destructive">
                        Faltan {orderedErrorList.length}{" "}
                        {orderedErrorList.length === 1 ? "campo" : "campos"} por completar
                      </p>
                      <ul className="mt-2 space-y-1 text-xs">
                        {orderedErrorList.map((err) => (
                          <li key={err.key} className="text-ink/80">
                            <button
                              type="button"
                              onClick={() => scrollToField(err.key)}
                              className="font-medium text-destructive underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 rounded"
                            >
                              {err.label}
                            </button>
                            <span className="text-muted-foreground"> — {err.message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-5">
                    <Field name="nombre" label="Nombre *" error={visibleErrs.nombre}>
                      <input
                        className="input-base"
                        value={form.nombre}
                        onChange={(e) => update("nombre", e.target.value)}
                        onBlur={() => markTouched("nombre")}
                        maxLength={120}
                        autoComplete="name"
                      />
                    </Field>
                    <Field name="empresa" label="Empresa" error={visibleErrs.empresa}>
                      <input
                        className="input-base"
                        value={form.empresa ?? ""}
                        onChange={(e) => update("empresa", e.target.value)}
                        onBlur={() => markTouched("empresa")}
                        maxLength={200}
                        autoComplete="organization"
                      />
                    </Field>
                    <Field name="email" label="Email *" error={visibleErrs.email}>
                      <input
                        type="email"
                        className="input-base"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        onBlur={() => markTouched("email")}
                        maxLength={255}
                        autoComplete="email"
                        inputMode="email"
                      />
                    </Field>
                    <Field name="telefono" label="Teléfono" error={visibleErrs.telefono}>
                      <input
                        className="input-base"
                        value={form.telefono ?? ""}
                        onChange={(e) => update("telefono", e.target.value)}
                        onBlur={() => markTouched("telefono")}
                        maxLength={20}
                        autoComplete="tel"
                        inputMode="tel"
                      />
                    </Field>
                  </div>

                  <Field name="motivo" label="Motivo de contacto *" error={visibleErrs.motivo}>
                    <div className="flex flex-wrap gap-2">
                      {MOTIVOS.map((m) => {
                        const active = (form.motivo || []).includes(m.value);
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => toggleMotivo(m.value)}
                            className={
                              "px-3.5 py-2 rounded-full text-xs font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card " +
                              (active
                                ? "bg-ink text-bone border-ink shadow-sm hover:bg-ink/90"
                                : "bg-card text-card-foreground border-border hover:border-teal hover:bg-teal/10")
                            }
                            aria-pressed={active}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  {/* Vista previa: campos que se activan según los motivos seleccionados */}
                  {(form.motivo || []).length > 0 && (() => {
                    const selected = (form.motivo || []) as MotivoValue[];
                    const t = PREVIEW_I18N[previewLang];
                    const groups = selected
                      .map((m) => {
                        const fields = fieldsByMotivo[m] || [];
                        const required = new Set<string>(
                          (requiredByMotivo[m] || []).map((f) => f as string),
                        );
                        if (fields.length === 0) return null;
                        const label =
                          t.motivoLabels[m] ??
                          MOTIVOS.find((o) => o.value === m)?.label ??
                          m;
                        return { motivo: m, label, fields, required };
                      })
                      .filter((g): g is NonNullable<typeof g> => g !== null);

                    if (groups.length === 0) return null;

                    return (
                      <div
                        className="rounded-2xl border border-teal/30 bg-teal/5 px-4 py-3.5"
                        lang={previewLang}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-xs font-medium text-ink flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-teal" aria-hidden="true" />
                            {t.title}
                          </p>
                          <div
                            className="inline-flex rounded-full border border-border bg-card p-0.5"
                            role="group"
                            aria-label={t.langLabel}
                          >
                            {(["es", "en", "pt", "fr"] as const).map((lng) => {
                              const active = previewLang === lng;
                              return (
                                <button
                                  key={lng}
                                  type="button"
                                  onClick={() => setPreviewLang(lng)}
                                  aria-pressed={active}
                                  className={
                                    "px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide transition-colors " +
                                    (active
                                      ? "bg-ink text-bone"
                                      : "text-ink/60 hover:text-ink")
                                  }
                                >
                                  {lng}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <ul className="space-y-1.5 text-xs text-ink/80">
                          {groups.map((g) => (
                            <li key={g.motivo} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <span className="font-medium text-ink">{g.label}:</span>
                              <span className="flex flex-wrap gap-1">
                                {g.fields.map((f, i) => (
                                  <span key={f as string}>
                                    {t.fieldLabels[f as string] ??
                                      FIELD_LABELS[f as string] ??
                                      (f as string)}
                                    {g.required.has(f as string) && <span className="text-teal"> *</span>}
                                    {i < g.fields.length - 1 && <span className="text-ink/40">,</span>}
                                  </span>
                                ))}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          <span className="text-teal">*</span> {t.required}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Campos por motivo */}
                  {(form.motivo || []).includes("garantias") && (
                    <div className="grid md:grid-cols-2 gap-5">
                      <Field name="marca" label="Marca *" error={visibleErrs.marca}>
                        <input
                          className="input-base"
                          value={form.marca ?? ""}
                          onChange={(e) => update("marca", e.target.value)}
                          onBlur={() => markTouched("marca")}
                          maxLength={80}
                        />
                      </Field>
                      <Field name="numeroSerie" label="Nº de serie" error={visibleErrs.numeroSerie}>
                        <input
                          className="input-base"
                          value={form.numeroSerie ?? ""}
                          onChange={(e) => update("numeroSerie", e.target.value)}
                          onBlur={() => markTouched("numeroSerie")}
                          maxLength={60}
                        />
                      </Field>
                    </div>
                  )}

                  {((form.motivo || []).includes("reparaciones") || (form.motivo || []).includes("instalaciones")) && (
                    <div className="grid md:grid-cols-2 gap-5">
                      <Field name="producto" label="Producto *" error={visibleErrs.producto}>
                        <input
                          className="input-base"
                          value={form.producto ?? ""}
                          onChange={(e) => update("producto", e.target.value)}
                          onBlur={() => markTouched("producto")}
                          maxLength={120}
                        />
                      </Field>
                      <Field name="urgencia" label="Urgencia *" error={visibleErrs.urgencia}>
                        <select
                          className="input-base"
                          value={form.urgencia ?? ""}
                          onChange={(e) =>
                            update("urgencia", e.target.value as FormData["urgencia"])
                          }
                          onBlur={() => markTouched("urgencia")}
                        >
                          <option value="">Selecciona…</option>
                          {URGENCIAS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  )}

                  {(form.motivo || []).includes("repuestos") && (
                    <Field name="referencia" label="Referencia o código de pieza *" error={visibleErrs.referencia}>
                      <input
                        className="input-base"
                        value={form.referencia ?? ""}
                        onChange={(e) => update("referencia", e.target.value)}
                        onBlur={() => markTouched("referencia")}
                        maxLength={80}
                      />
                    </Field>
                  )}

                  {(form.motivo || []).includes("movilidad") && (
                    <div className="grid md:grid-cols-2 gap-5">
                      <Field name="vehiculo" label="Tipo de vehículo *" error={visibleErrs.vehiculo}>
                        <select
                          className="input-base"
                          value={form.vehiculo ?? ""}
                          onChange={(e) =>
                            update("vehiculo", e.target.value as FormData["vehiculo"])
                          }
                          onBlur={() => markTouched("vehiculo")}
                        >
                          <option value="">Selecciona…</option>
                          {VEHICULOS.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field name="matricula" label="Matrícula" error={visibleErrs.matricula}>
                        <input
                          className="input-base"
                          value={form.matricula ?? ""}
                          onChange={(e) => update("matricula", e.target.value.toUpperCase())}
                          onBlur={() => markTouched("matricula")}
                          maxLength={15}
                        />
                      </Field>
                    </div>
                  )}

                  {(form.motivo || []).includes("seguros") && (
                    <div className="grid md:grid-cols-2 gap-5">
                      <Field name="ramo" label="Ramo *" error={visibleErrs.ramo}>
                        <select
                          className="input-base"
                          value={form.ramo ?? ""}
                          onChange={(e) => update("ramo", e.target.value as FormData["ramo"])}
                          onBlur={() => markTouched("ramo")}
                        >
                          <option value="">Selecciona…</option>
                          {RAMOS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field name="poliza" label="Nº de póliza" error={visibleErrs.poliza}>
                        <input
                          className="input-base"
                          value={form.poliza ?? ""}
                          onChange={(e) => update("poliza", e.target.value)}
                          onBlur={() => markTouched("poliza")}
                          maxLength={60}
                        />
                      </Field>
                    </div>
                  )}

                  <Field name="mensaje" label="¿En qué podemos ayudarte? *" error={visibleErrs.mensaje}>
                    <textarea
                      className="input-base min-h-32"
                      value={form.mensaje}
                      onChange={(e) => update("mensaje", e.target.value)}
                      onBlur={() => markTouched("mensaje")}
                      maxLength={2000}
                    />
                    <span className="block text-[11px] text-muted-foreground mt-1.5 text-right">
                      {form.mensaje.length}/2000
                    </span>
                  </Field>

                  <div
                    className={
                      "pt-2 rounded-xl border p-4 transition-colors " +
                      (visibleErrs.consentimiento
                        ? "border-destructive/50 bg-destructive/5"
                        : form.consentimiento
                          ? "border-teal/40 bg-teal/5"
                          : "border-border bg-muted/30")
                    }
                    data-field="consentimiento"
                    data-invalid={visibleErrs.consentimiento ? "true" : undefined}
                  >
                    <label
                      htmlFor="consentimiento-input"
                      className="flex items-start gap-3 cursor-pointer group"
                    >
                      <input
                        id="consentimiento-input"
                        type="checkbox"
                        checked={!!form.consentimiento}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          update("consentimiento", checked as unknown as true);
                          setConsentAt(checked ? new Date() : null);
                          markTouched("consentimiento");
                        }}
                        onBlur={() => markTouched("consentimiento")}
                        className={
                          "mt-0.5 h-4 w-4 rounded border-border accent-ink cursor-pointer flex-shrink-0 " +
                          (visibleErrs.consentimiento ? "ring-2 ring-destructive ring-offset-2" : "")
                        }
                        aria-invalid={!!visibleErrs.consentimiento}
                        aria-required="true"
                        aria-describedby={
                          visibleErrs.consentimiento ? "consentimiento-error" : "consentimiento-hint"
                        }
                      />
                      <span
                        id="consentimiento-hint"
                        className="text-xs text-muted-foreground leading-relaxed"
                      >
                        He leído y acepto el tratamiento de mis datos conforme a la{" "}
                        <a href="/privacidad" className="underline hover:text-ink">
                          política de privacidad
                        </a>
                        . Mis datos se usarán únicamente para responder a esta solicitud.{" "}
                        <span className="text-destructive" aria-hidden="true">*</span>
                        <span className="sr-only">(obligatorio)</span>
                      </span>
                    </label>
                    <span
                      id="consentimiento-error"
                      role="alert"
                      aria-live="polite"
                      className={
                        "block text-xs mt-2 ml-7 transition-opacity " +
                        (visibleErrs.consentimiento
                          ? "text-destructive opacity-100"
                          : "opacity-0 h-0 overflow-hidden")
                      }
                    >
                      {visibleErrs.consentimiento || ""}
                    </span>
                  </div>

                  {(() => {
                    const errorCount = Object.keys(allErrors).length;
                    const visibleCount = Object.keys(visibleErrs).length;
                    const isValid = errorCount === 0;
                    return (
                      <>
                        <div
                          role="status"
                          aria-live="polite"
                          className={
                            "rounded-xl border px-4 py-3 text-sm transition-colors " +
                            (isValid
                              ? "border-teal/40 bg-teal/10 text-teal"
                              : visibleCount > 0
                                ? "border-destructive/40 bg-destructive/10 text-destructive"
                                : "border-border bg-muted/40 text-muted-foreground")
                          }
                        >
                          {isValid ? (
                            <span className="flex items-center gap-2">
                              <Check className="h-4 w-4" />
                              Todo correcto. Puedes continuar a la revisión.
                            </span>
                          ) : visibleCount > 0 ? (
                            `Revisa ${visibleCount} ${visibleCount === 1 ? "campo" : "campos"} con errores antes de continuar.`
                          ) : (
                            `Faltan ${errorCount} ${errorCount === 1 ? "campo obligatorio" : "campos obligatorios"} por completar.`
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={!isValid}
                          aria-disabled={!isValid}
                          className="btn-primary w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Continuar a revisión
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </>
                    );
                  })()}
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
              Operamos en <span className="text-teal italic">toda España y Portugal</span>.
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl text-pretty">
              Sede central en Madrid y presencia operativa en Barcelona, Valencia y Canarias. Red de colaboradores cualificados en la Península Ibérica.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-10 relative rounded-2xl md:rounded-3xl overflow-hidden border border-border shadow-sm h-[260px] sm:h-[340px] md:h-auto md:aspect-[21/9] bg-muted">
              <PresenceMap />
              <div className="absolute bottom-3 left-3 z-[400] bg-card/95 backdrop-blur rounded-lg border border-border px-3 py-2 text-xs text-ink-soft pointer-events-none space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-deep ring-2 ring-teal/40" />
                  <span>Sede central · Madrid</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-teal" />
                  <span>Sedes operativas · Barcelona, Valencia, Canarias</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-3.5 rounded-sm bg-teal/20 border border-teal-deep/60" />
                  <span>Cobertura España y Portugal</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* SEO CONTENT — direcciones, horarios, áreas de servicio */}
      <section className="theme-light bg-bone border-t border-foreground/5">
        <div className="container-tight py-16 md:py-24">
          <Reveal>
            <p className="eyebrow-mono mb-3">Información de contacto</p>
            <h2 className="heading-display text-ink text-3xl md:text-5xl text-balance max-w-3xl">
              Cómo y cuándo <span className="text-teal italic">trabajamos contigo</span>.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Reveal>
              <article className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-7 h-full">
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
              <article className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-7 h-full">
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
              <article className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-7 h-full">
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
        [data-invalid="true"] .input-base,
        .input-base[aria-invalid="true"] {
          border-color: hsl(var(--destructive));
          background: hsl(var(--destructive) / 0.04);
          box-shadow: 0 0 0 3px hsl(var(--destructive) / 0.12);
        }
        [data-invalid="true"] .input-base:focus,
        .input-base[aria-invalid="true"]:focus {
          box-shadow: 0 0 0 3px hsl(var(--destructive) / 0.25);
        }
        @keyframes wg-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(2px); }
        }
        [data-shake="true"] {
          animation: wg-shake 0.4s ease-in-out;
        }
        @media (prefers-reduced-motion: reduce) {
          [data-shake="true"] { animation: none; }
        }
      `}</style>
    </>
  );
};

const Field = ({
  name,
  label,
  error,
  children,
}: {
  name?: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <label
    className="block"
    data-field={name}
    data-invalid={error ? "true" : undefined}
  >
    <span className="block text-sm font-semibold text-teal mb-2">{label}</span>
    {children}
    <span
      role={error ? "alert" : undefined}
      aria-live="polite"
      className={
        "block text-xs mt-1.5 transition-opacity " +
        (error ? "text-destructive opacity-100" : "opacity-0 h-0 overflow-hidden")
      }
    >
      {error || ""}
    </span>
  </label>
);

const ReviewRow = ({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) => (
  <div className="py-3 grid grid-cols-3 gap-4">
    <dt className="text-xs uppercase tracking-wider text-muted-foreground col-span-1">
      {label}
    </dt>
    <dd
      className={
        "text-ink col-span-2 " + (multiline ? "whitespace-pre-wrap" : "truncate")
      }
    >
      {value}
    </dd>
  </div>
);

export default Contacto;
