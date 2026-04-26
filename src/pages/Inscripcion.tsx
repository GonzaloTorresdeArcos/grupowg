import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Upload, X, Loader2, AlertCircle, FileText, RefreshCw, Eye, Save, Mail } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDraft } from "@/hooks/useDraft";
import { CifInput } from "@/components/inscripcion/CifInput";
import { OtpVerification } from "@/components/inscripcion/OtpVerification";
import { CoverageMap } from "@/components/inscripcion/CoverageMap";
import { SignaturePad } from "@/components/inscripcion/SignaturePad";
import { ScoringBadge } from "@/components/inscripcion/ScoringBadge";
import { computeScoring } from "@/lib/scoring";
import { generateAndUploadAgreement } from "@/lib/agreement-pdf";
import { validateSpanishDoc } from "@/lib/cif-validation";
import { provinciaByCode, PROVINCIAS } from "@/lib/spain-provinces";
import { COUNTRIES, countryFromPostalCode, composeE164, sanitizeLocalNumber, type CountryPhone } from "@/lib/phone-prefix";
import { ErrorLogger } from "@/components/site/ErrorLogger";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const familias = ["Gama blanca", "Gama marrón", "PAE", "Confort", "Movilidad", "Electrónica", "Repuestos", "Otros"];
const servicios = ["Reparación en domicilio", "Reparación en taller", "Instalación", "Recogida / entrega", "Diagnóstico técnico"];
const tipos = ["SAT", "Instalador", "Autónomo", "Empresa", "Proveedor técnico"];

const coberturasOpts = [
  { id: "seguros_colectivos", label: "Seguros colectivos" },
  { id: "salud", label: "Salud" },
  { id: "vida", label: "Vida" },
  { id: "proteccion_juridica", label: "Protección jurídica" },
  { id: "proteccion_ingresos", label: "Protección de ingresos" },
  { id: "ahorro", label: "Planes de ahorro" },
  { id: "prl", label: "PRL" },
  { id: "documentacion", label: "Documentación" },
  { id: "producto_nuevo", label: "Producto nuevo" },
  { id: "repuestos_coste", label: "Repuestos a coste" },
  { id: "activaciones", label: "Activaciones comerciales" },
];

const docTypes = [
  "Certificado AEAT", "Certificado TGSS", "CIF / DNI / Modelo censal",
  "Escritura de sociedad", "Contrato mercantil", "Condiciones generales proveedor",
  "Acuerdo de confidencialidad", "RGPD / LOPD", "Seguro RC", "PRL",
  "Formación técnica", "Licencias", "Certificaciones / habilitaciones",
];

const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const step1Schema = z.object({
  razon_social: z.string().trim().min(1, "Requerido").max(200),
  nombre_comercial: z.string().trim().max(200).optional(),
  cif_nif: z.string().trim().min(1, "Requerido").max(20),
  tipo_colaborador: z.string().min(1, "Selecciona un tipo"),
  persona_contacto: z.string().trim().min(1, "Requerido").max(200),
  email: z.string().trim().email("Email no válido").max(255),
  telefono: z.string().trim().min(6, "Teléfono no válido").max(20),
  direccion_fiscal: z.string().trim().max(300).optional(),
  codigo_postal: z.string().trim().regex(/^\d{5}$/, "CP de 5 dígitos").optional().or(z.literal("")),
  localidad: z.string().trim().max(120).optional(),
  provincia_fiscal: z.string().trim().max(120).optional(),
});

const Inscripcion = () => {
  const { draft, loading: draftLoading, saving: draftSaving, save: saveDraft, refresh: refreshDraft, clear: clearDraft } = useDraft();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Step 1
  const [s1, setS1] = useState({
    razon_social: "", nombre_comercial: "", cif_nif: "", tipo_colaborador: "",
    persona_contacto: "", email: "", telefono: "",
    direccion_fiscal: "",
    codigo_postal: "", localidad: "", provincia_fiscal: "",
  });
  const [errs1, setErrs1] = useState<Record<string, string>>({});
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  // País telefónico (prefijo internacional). Se infiere automáticamente del CP
  // cuando es posible; el usuario puede cambiarlo manualmente.
  const [phoneCountry, setPhoneCountry] = useState<CountryPhone>(COUNTRIES.ES);
  const [phoneCountryAuto, setPhoneCountryAuto] = useState(true);

  // Step 2
  const [provinciaCodes, setProvinciaCodes] = useState<string[]>([]);
  const [familiasSel, setFamiliasSel] = useState<string[]>([]);
  const [marcas, setMarcas] = useState("");
  const [tecnicos, setTecnicos] = useState<string>("");
  const [serviciosSel, setServiciosSel] = useState<string[]>([]);
  const [horarios, setHorarios] = useState("");
  const [capacidad, setCapacidad] = useState("");

  // Step 3 — docs
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number | "done" | "error">>({});

  // Step 4
  const [coberturas, setCoberturas] = useState<string[]>([]);

  // Step 5 — datos por seguro
  const [datosSeguros, setDatosSeguros] = useState<Record<string, Record<string, string>>>({});

  // Step 6 (firma)
  const [signerName, setSignerName] = useState("");
  const [signerDni, setSignerDni] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Hidratar desde draft
  const hydrated = useRef(false);
  useEffect(() => {
    if (draftLoading || hydrated.current || !draft) return;
    const d = draft.form_data || {};
    if (d.s1) setS1(d.s1);
    if (d.provinciaCodes) setProvinciaCodes(d.provinciaCodes);
    if (d.familiasSel) setFamiliasSel(d.familiasSel);
    if (d.marcas) setMarcas(d.marcas);
    if (d.tecnicos) setTecnicos(d.tecnicos);
    if (d.serviciosSel) setServiciosSel(d.serviciosSel);
    if (d.horarios) setHorarios(d.horarios);
    if (d.capacidad) setCapacidad(d.capacidad);
    if (d.coberturas) setCoberturas(d.coberturas);
    if (d.datosSeguros) setDatosSeguros(d.datosSeguros);
    if (d.signerName) setSignerName(d.signerName);
    if (d.signerDni) setSignerDni(d.signerDni);
    setEmailVerified(draft.email_verified);
    setPhoneVerified(draft.phone_verified);
    setStep(Math.max(1, Math.min(7, draft.current_step)) as Step);
    hydrated.current = true;
    toast.success("Hemos recuperado tu progreso anterior");
  }, [draft, draftLoading]);

  // Auto-save (al cambiar datos clave o paso). Verification flags are server-side only.
  useEffect(() => {
    if (!s1.email) return;
    saveDraft({
      email: s1.email,
      current_step: step,
      form_data: {
        s1, provinciaCodes, familiasSel, marcas, tecnicos, serviciosSel, horarios, capacidad,
        coberturas, datosSeguros, signerName, signerDni,
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s1, provinciaCodes, familiasSel, marcas, tecnicos, serviciosSel, horarios, capacidad, coberturas, datosSeguros, signerName, signerDni, step]);

  // Autocompletado de localidad y provincia a partir del CP español.
  // Provincia se infiere de los 2 primeros dígitos (códigos 01-52 == PROVINCIAS).
  // Localidades se obtienen vía Zippopotam.us (gratuito, sin API key).
  // No autoseleccionamos: dejamos que el usuario elija de la lista devuelta.
  const [cpLookup, setCpLookup] = useState<"idle" | "loading" | "ok" | "notfound">("idle");
  const [cpLocalidades, setCpLocalidades] = useState<string[]>([]);

  useEffect(() => {
    const cp = s1.codigo_postal;
    if (!/^\d{5}$/.test(cp)) {
      setCpLookup("idle");
      setCpLocalidades([]);
      return;
    }

    // Provincia inmediata por prefijo
    const prefix = cp.slice(0, 2);
    const prov = provinciaByCode(prefix);
    if (prov && s1.provincia_fiscal !== prov.name) {
      setS1((p) => ({ ...p, provincia_fiscal: prov.name }));
    }

    const ctrl = new AbortController();
    setCpLookup("loading");
    fetch(`https://api.zippopotam.us/es/${cp}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const places: string[] = Array.isArray(data?.places)
          ? Array.from(new Set(data.places.map((p: any) => p["place name"]).filter(Boolean)))
          : [];
        if (places.length > 0) {
          setCpLocalidades(places);
          setCpLookup("ok");
          // Si solo hay una y el usuario aún no escribió nada, la sugerimos automáticamente.
          if (places.length === 1) {
            setS1((p) => (p.localidad ? p : { ...p, localidad: places[0] }));
          }
        } else {
          setCpLocalidades([]);
          setCpLookup("notfound");
        }
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          setCpLocalidades([]);
          setCpLookup("notfound");
        }
      });

    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s1.codigo_postal]);

  const toggle = (arr: string[], v: string, set: (x: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const updateSeguro = (key: string, field: string, value: string) => {
    setDatosSeguros((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  };

  const validateStep1 = () => {
    const r = step1Schema.safeParse(s1);
    const e: Record<string, string> = {};
    if (!r.success) r.error.issues.forEach((i) => { e[i.path[0] as string] = i.message; });

    // CIF también validado por algoritmo
    if (s1.cif_nif && !validateSpanishDoc(s1.cif_nif).valid) {
      e.cif_nif = "CIF/NIF/NIE no válido";
    }
    // [DEV] Verificación de email/móvil temporalmente opcional para poder
    // recorrer el resto del flujo sin bloquear el avance entre pasos.
    // if (!emailVerified) e.email = "Verifica tu email para continuar";

    // Validación cruzada CP ↔ provincia: la provincia indicada debe coincidir
    // con la inferida por los dos primeros dígitos del código postal.
    if (/^\d{5}$/.test(s1.codigo_postal) && s1.provincia_fiscal.trim()) {
      const inferred = provinciaByCode(s1.codigo_postal.slice(0, 2));
      if (inferred && inferred.name !== s1.provincia_fiscal) {
        e.provincia_fiscal = `La provincia no coincide con el código postal (esperado: ${inferred.name})`;
      }
    }

    setErrs1(e);
    return Object.keys(e).length === 0;
  };

  const showStep5 = coberturas.some((c) =>
    ["seguros_colectivos","salud","vida","proteccion_ingresos","proteccion_juridica","ahorro","prl","documentacion","producto_nuevo","repuestos_coste","activaciones"].includes(c)
  );

  // Steps visible flow:
  // 1 datos → 2 cobertura+capacidad → 3 docs → 4 coberturas → 5 (cond) → 6 firma+scoring
  const totalSteps = showStep5 ? 6 : 5;
  const visibleStep = (() => {
    if (step <= 4) return step;
    if (step === 5 && showStep5) return 5;
    if (step === 6) return showStep5 ? 6 : 5;
    return totalSteps;
  })();

  const next = () => {
    if (step === 1 && !validateStep1()) {
      toast.error("Revisa los campos obligatorios");
      return;
    }
    let target = (step + 1) as Step;
    if (step === 4 && !showStep5) target = 6;
    setStep(Math.min(target, 6) as Step);
  };
  const prev = () => {
    let target = (step - 1) as Step;
    if (step === 6 && !showStep5) target = 4;
    setStep(Math.max(target, 1) as Step);
  };

  // Scoring en vivo (paso 6)
  const scoring = useMemo(() => computeScoring({
    familias: familiasSel,
    servicios: serviciosSel,
    tecnicos: tecnicos ? parseInt(tecnicos) : 0,
    capacidadMensualText: capacidad,
    coberturas,
    documentosSubidos: Object.values(files).filter(Boolean).length,
    zonaCobertura: provinciaCodes.length,
    emailVerified,
    phoneVerified,
  }), [familiasSel, serviciosSel, tecnicos, capacidad, coberturas, files, provinciaCodes, emailVerified, phoneVerified]);

  const submit = async () => {
    if (!signatureData) {
      toast.error("Necesitas firmar el acuerdo");
      return;
    }
    if (!signerName.trim()) {
      toast.error("Indica el nombre del firmante");
      return;
    }
    if (!acceptTerms) {
      toast.error("Debes aceptar las condiciones");
      return;
    }
    if (!draft?.resume_token) {
      toast.error("No hemos podido recuperar tu solicitud. Recarga la página.");
      return;
    }

    setSubmitting(true);
    try {
      const provinciasText = provinciaCodes
        .map((c) => provinciaByCode(c)?.name)
        .filter(Boolean)
        .join(", ");

      // Submit application via secure edge function (server forces status=pending,
      // recomputes scoring, validates verification flags from the draft).
      const documentosSubidos = Object.values(files).filter(Boolean).length;
      const { data: submitData, error: submitError } = await supabase.functions.invoke(
        "submit-application",
        {
          body: {
            resume_token: draft.resume_token,
            application: {
              ...s1,
              provincias: provinciasText,
              provincias_codes: provinciaCodes,
              zona_cobertura: provinciasText,
              familias_producto: familiasSel,
              marcas_trabajadas: marcas,
              numero_tecnicos: tecnicos ? parseInt(tecnicos) : null,
              servicios_ofrecidos: serviciosSel,
              horarios,
              capacidad_mensual: capacidad,
              coberturas,
              datos_seguros: datosSeguros,
              documentosSubidos,
            },
          },
        },
      );

      if (submitError || !submitData?.ok) {
        const errCode = submitData?.error;
        if (errCode === "email_not_verified") {
          toast.error("Verifica tu email antes de enviar la solicitud");
        } else if (errCode === "missing_required_fields") {
          toast.error("Faltan campos obligatorios");
        } else {
          toast.error("No hemos podido enviar tu solicitud. Inténtalo de nuevo.");
        }
        setSubmitting(false);
        return;
      }

      const appId: string = submitData.application_id;

      // Upload de documentos (RLS sigue permitiendo INSERT en wg_network_documents
      // si el application_id existe).
      const uploads = Object.entries(files).filter(([, f]) => f);
      for (const [docType, file] of uploads) {
        if (!file) continue;
        setUploadProgress((p) => ({ ...p, [docType]: 10 }));
        const path = `${appId}/${Date.now()}-${file.name}`;
        const tick = setInterval(() => {
          setUploadProgress((p) => {
            const cur = p[docType];
            if (typeof cur === "number" && cur < 85) return { ...p, [docType]: cur + 15 };
            return p;
          });
        }, 200);
        const { error: upErr } = await supabase.storage.from("wg-documents").upload(path, file);
        clearInterval(tick);
        if (upErr) {
          setUploadProgress((p) => ({ ...p, [docType]: "error" }));
          continue;
        }
        await supabase.from("wg_network_documents").insert({
          application_id: appId,
          document_type: docType,
          file_path: path,
          file_name: file.name,
          file_size: file.size,
        });
        setUploadProgress((p) => ({ ...p, [docType]: "done" }));
      }

      // Generar PDF firmado y registrar la firma vía edge function (acción register_agreement)
      try {
        const { path: pdfPath } = await generateAndUploadAgreement({
          signerName,
          signerDni,
          signerEmail: s1.email,
          companyName: s1.razon_social,
          cif: s1.cif_nif,
          signatureDataUrl: signatureData,
          signedAt: new Date(),
          applicationId: appId,
          draftId: draft?.id,
        });

        await supabase.functions.invoke("submit-application", {
          body: {
            action: "register_agreement",
            resume_token: draft.resume_token,
            application_id: appId,
            signature: {
              signer_name: signerName,
              signer_dni: signerDni || null,
              signature_data_url: signatureData,
              pdf_path: pdfPath,
              user_agent: navigator.userAgent.slice(0, 500),
            },
          },
        });
      } catch (e) {
        console.error("Agreement PDF error", e);
      }

      // Email de confirmación de inscripción (silencioso si no hay infra de email)
      supabase.functions
        .invoke("send-transactional-email", {
          body: {
            templateName: "inscription-received",
            recipientEmail: s1.email,
            idempotencyKey: `inscription-received-${appId}`,
            templateData: {
              name: signerName,
              companyName: s1.razon_social,
              tier: submitData.scoring?.tier ?? scoring.tier,
            },
          },
        })
        .then(({ error: emailErr }) => {
          if (emailErr) console.warn("[email] no enviado:", emailErr.message);
        });

      clearDraft();
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      console.error(e);
      toast.error("No hemos podido enviar tu solicitud. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyResumeLink = () => {
    if (!draft) return;
    const url = `${window.location.origin}/wg-network/inscripcion?resume=${draft.resume_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Enlace copiado. Te servirá para retomar desde cualquier dispositivo.");
  };

  if (done) {
    return (
      <section className="min-h-[90svh] pt-40 pb-32 bg-bone flex items-center">
        <div className="container-tight max-w-3xl">
          <div className="h-16 w-16 rounded-full bg-teal flex items-center justify-center mb-10">
            <Check className="h-7 w-7 text-ink" />
          </div>
          <p className="eyebrow mb-4">Solicitud recibida</p>
          <h1 className="heading-display text-ink text-5xl md:text-7xl text-balance">
            Gracias por completar tu inscripción a WG Professional Network.
          </h1>
          <div className="mt-10 space-y-4 text-ink-soft text-lg leading-relaxed max-w-2xl">
            <p>Tu solicitud ha quedado registrada con nivel <span className="font-medium text-ink">{scoring.tier === "premium" ? "Premium" : scoring.tier === "advanced" ? "Avanzado" : "Básico"}</span>. Hemos generado y guardado el acuerdo firmado.</p>
            <p>Nuestro equipo lo revisará en las próximas 48h y contactará contigo.</p>
          </div>
          <Link to="/" className="btn-primary mt-12">Volver al inicio</Link>
        </div>
      </section>
    );
  }

  if (draftLoading) {
    return (
      <section className="min-h-[60svh] pt-40 pb-32 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </section>
    );
  }

  return (
    <section className="pt-32 md:pt-40 pb-24 bg-bone min-h-screen">
      <div className="container-tight max-w-4xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="eyebrow mb-4">WG Professional Network</p>
            <h1 className="heading-display text-ink text-4xl md:text-6xl text-balance mb-4">Únete a la red.</h1>
            <p className="text-muted-foreground text-lg max-w-2xl">Un único proceso para activar trabajo, protección y crecimiento.</p>
          </div>
          {draft && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-full px-3 py-1.5 shrink-0 mt-2">
              <Save className={cn("h-3 w-3", draftSaving && "animate-pulse text-teal-deep")} />
              {draftSaving ? "Guardando…" : "Borrador guardado"}
              <button type="button" onClick={copyResumeLink} className="ml-2 text-teal-deep hover:underline">Copiar enlace</button>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mt-12 mb-12">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <span>Paso {visibleStep} de {totalSteps}</span>
            <span>{Math.round((visibleStep / totalSteps) * 100)}%</span>
          </div>
          <div className="h-1 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-teal transition-all duration-500 ease-smooth" style={{ width: `${(visibleStep / totalSteps) * 100}%` }} />
          </div>
        </div>

        {/* STEP 1 — Datos generales + verificación */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-up">
            <h2 className="font-display text-3xl text-ink">Datos generales</h2>
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="CIF / NIF / DNI *" error={errs1.cif_nif}>
                <CifInput
                  value={s1.cif_nif}
                  onChange={(v) => setS1({ ...s1, cif_nif: v })}
                  onCompanyDetected={(name) => setS1((p) => ({ ...p, razon_social: p.razon_social || name }))}
                  error={errs1.cif_nif}
                />
              </Field>
              <Field label="Razón social *" error={errs1.razon_social}>
                <input className="input-base" value={s1.razon_social} onChange={(e) => setS1({ ...s1, razon_social: e.target.value })} />
              </Field>
              <Field label="Nombre comercial">
                <input className="input-base" value={s1.nombre_comercial} onChange={(e) => setS1({ ...s1, nombre_comercial: e.target.value })} />
              </Field>
              <Field label="Tipo de colaborador *" error={errs1.tipo_colaborador}>
                <select className="input-base" value={s1.tipo_colaborador} onChange={(e) => setS1({ ...s1, tipo_colaborador: e.target.value })}>
                  <option value="">Selecciona</option>
                  {tipos.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Persona de contacto *" error={errs1.persona_contacto}>
                <input className="input-base" value={s1.persona_contacto} onChange={(e) => setS1({ ...s1, persona_contacto: e.target.value })} />
              </Field>
              <Field label="Dirección fiscal">
                <input className="input-base" value={s1.direccion_fiscal} onChange={(e) => setS1({ ...s1, direccion_fiscal: e.target.value })} />
              </Field>
              <Field
                label="Código postal"
                error={errs1.codigo_postal}
                hint={
                  cpLookup === "loading"
                    ? "Buscando localidad…"
                    : cpLookup === "notfound" && /^\d{5}$/.test(s1.codigo_postal)
                      ? "No hemos podido autocompletar la localidad. Introdúcela manualmente."
                      : undefined
                }
              >
                <div className="relative">
                  <input
                    className="input-base pr-9"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="28001"
                    value={s1.codigo_postal}
                    onChange={(e) => setS1({ ...s1, codigo_postal: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                  />
                  {cpLookup === "loading" && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </Field>
              <Field
                label="Localidad"
                error={errs1.localidad}
                hint={
                  cpLocalidades.length > 1
                    ? `${cpLocalidades.length} localidades para este CP. Selecciona la correcta.`
                    : undefined
                }
              >
                {cpLocalidades.length > 1 ? (
                  <div className="space-y-2">
                    <select
                      className="input-base"
                      value={cpLocalidades.includes(s1.localidad) ? s1.localidad : (s1.localidad ? "__other__" : "")}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "__other__") {
                          setS1({ ...s1, localidad: "" });
                        } else {
                          setS1({ ...s1, localidad: v });
                        }
                      }}
                    >
                      <option value="">Selecciona localidad</option>
                      {cpLocalidades.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                      <option value="__other__">Otra…</option>
                    </select>
                    {!cpLocalidades.includes(s1.localidad) && (
                      <input
                        className="input-base"
                        placeholder="Escribe la localidad"
                        value={s1.localidad}
                        onChange={(e) => setS1({ ...s1, localidad: e.target.value })}
                      />
                    )}
                  </div>
                ) : (
                  <input
                    className="input-base"
                    value={s1.localidad}
                    onChange={(e) => setS1({ ...s1, localidad: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Provincia" error={errs1.provincia_fiscal}>
                <select
                  className="input-base"
                  value={s1.provincia_fiscal}
                  onChange={(e) => setS1({ ...s1, provincia_fiscal: e.target.value })}
                >
                  <option value="">Selecciona</option>
                  {PROVINCIAS.map((p) => (
                    <option key={p.code} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Email *" error={errs1.email}>
                <input
                  type="email"
                  className="input-base"
                  value={s1.email}
                  onChange={(e) => { setS1({ ...s1, email: e.target.value }); if (emailVerified) setEmailVerified(false); }}
                />
              </Field>
              <Field label="Teléfono *" error={errs1.telefono}>
                <input
                  className="input-base"
                  value={s1.telefono}
                  onChange={(e) => { setS1({ ...s1, telefono: e.target.value }); if (phoneVerified) setPhoneVerified(false); }}
                />
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <ErrorLogger context="OtpVerification:email">
                <OtpVerification
                  channel="email"
                  destination={s1.email}
                  verified={emailVerified}
                  resumeToken={draft?.resume_token}
                  onVerified={async () => {
                    setEmailVerified(true);
                    await refreshDraft();
                  }}
                />
              </ErrorLogger>
              <ErrorLogger context="OtpVerification:sms">
                <OtpVerification
                  channel="sms"
                  destination={s1.telefono}
                  verified={phoneVerified}
                  resumeToken={draft?.resume_token}
                  onVerified={async () => {
                    setPhoneVerified(true);
                    await refreshDraft();
                  }}
                />
              </ErrorLogger>
            </div>
          </div>
        )}

        {/* STEP 2 — Capacidad + mapa */}
        {step === 2 && (
          <div className="space-y-8 animate-fade-up">
            <h2 className="font-display text-3xl text-ink">Capacidad operativa y zona</h2>

            <div>
              <p className="block text-sm font-medium text-ink mb-3">Zona de cobertura</p>
              <CoverageMap selected={provinciaCodes} onChange={setProvinciaCodes} />
            </div>

            <Field label="Familias de producto atendidas">
              <ChipsMulti opts={familias} value={familiasSel} onChange={(v) => toggle(familiasSel, v, setFamiliasSel)} />
            </Field>
            <Field label="Marcas trabajadas">
              <textarea className="input-base min-h-24" value={marcas} onChange={(e) => setMarcas(e.target.value)} placeholder="Listado libre de marcas" />
            </Field>
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Número de técnicos">
                <input type="number" min="0" className="input-base" value={tecnicos} onChange={(e) => setTecnicos(e.target.value)} />
              </Field>
              <Field label="Capacidad mensual estimada">
                <input className="input-base" placeholder="Ej. 200 intervenciones/mes" value={capacidad} onChange={(e) => setCapacidad(e.target.value)} />
              </Field>
            </div>
            <Field label="Servicios ofrecidos">
              <ChipsMulti opts={servicios} value={serviciosSel} onChange={(v) => toggle(serviciosSel, v, setServiciosSel)} />
            </Field>
            <Field label="Horarios">
              <input className="input-base" placeholder="Ej. L-V 9:00-18:00" value={horarios} onChange={(e) => setHorarios(e.target.value)} />
            </Field>
          </div>
        )}

        {/* STEP 3 — Compliance */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-up">
            <h2 className="font-display text-3xl text-ink">Compliance documental</h2>
            <div className="rounded-xl border border-border bg-secondary p-4 flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 text-teal-deep shrink-0 mt-0.5" />
              <div className="text-sm text-ink-soft space-y-1">
                <p>Sin la documentación obligatoria no podrá completarse la activación operativa. Puedes subir lo que tengas ahora; el resto se completará en el alta.</p>
                <p className="text-xs text-muted-foreground">Formatos: PDF, JPG, PNG, WEBP · Máx 10 MB.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {docTypes.map((doc) => (
                <FileSlot
                  key={doc}
                  label={doc}
                  file={files[doc]}
                  progress={uploadProgress[doc]}
                  onChange={(f) => {
                    setFiles({ ...files, [doc]: f });
                    setUploadProgress((p) => { const { [doc]: _, ...rest } = p; return rest; });
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* STEP 4 — Coberturas */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-up">
            <h2 className="font-display text-3xl text-ink">Selección de coberturas</h2>
            <p className="text-muted-foreground">Marca las coberturas que te interesan. Te pediremos solo los datos necesarios.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {coberturasOpts.map((c) => {
                const checked = coberturas.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(coberturas, c.id, setCoberturas)}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-all",
                      checked ? "border-ink bg-ink text-bone" : "border-border bg-card hover:border-ink/40",
                    )}
                  >
                    <span className="text-sm font-medium">{c.label}</span>
                    <span className={cn("h-5 w-5 rounded-full border flex items-center justify-center", checked ? "bg-teal border-teal" : "border-border")}>
                      {checked && <Check className="h-3 w-3 text-ink" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5 — Conditional (datos por cobertura) */}
        {step === 5 && showStep5 && (
          <div className="space-y-10 animate-fade-up">
            <h2 className="font-display text-3xl text-ink">Datos para tus coberturas</h2>
            <p className="text-muted-foreground">Solo se muestran los bloques de las coberturas que has seleccionado.</p>

            {coberturas.includes("seguros_colectivos") && (
              <SeguroBlock title="Seguros colectivos">
                <Grid2>
                  <FieldS label="Número de empleados"><input className="input-base" value={datosSeguros.seguros_colectivos?.empleados || ""} onChange={(e) => updateSeguro("seguros_colectivos","empleados",e.target.value)} /></FieldS>
                  <FieldS label="CNAE"><input className="input-base" value={datosSeguros.seguros_colectivos?.cnae || ""} onChange={(e) => updateSeguro("seguros_colectivos","cnae",e.target.value)} /></FieldS>
                  <FieldS label="Asegurados"><input className="input-base" value={datosSeguros.seguros_colectivos?.asegurados || ""} onChange={(e) => updateSeguro("seguros_colectivos","asegurados",e.target.value)} /></FieldS>
                  <FieldS label="Cobertura geográfica"><input className="input-base" value={datosSeguros.seguros_colectivos?.cobertura_geo || ""} onChange={(e) => updateSeguro("seguros_colectivos","cobertura_geo",e.target.value)} /></FieldS>
                </Grid2>
              </SeguroBlock>
            )}

            {coberturas.includes("salud") && (
              <SeguroBlock title="Salud">
                <Grid2>
                  <FieldS label="Asegurados"><input className="input-base" value={datosSeguros.salud?.asegurados || ""} onChange={(e) => updateSeguro("salud","asegurados",e.target.value)} /></FieldS>
                  <FieldS label="Modalidad">
                    <select className="input-base" value={datosSeguros.salud?.modalidad || ""} onChange={(e) => updateSeguro("salud","modalidad",e.target.value)}>
                      <option value="">—</option><option>Con copago</option><option>Sin copago</option>
                    </select>
                  </FieldS>
                </Grid2>
              </SeguroBlock>
            )}

            {coberturas.includes("vida") && (
              <SeguroBlock title="Vida">
                <Grid2>
                  <FieldS label="Capital asegurado"><input className="input-base" placeholder="€" value={datosSeguros.vida?.capital || ""} onChange={(e) => updateSeguro("vida","capital",e.target.value)} /></FieldS>
                  <FieldS label="Beneficiarios"><input className="input-base" value={datosSeguros.vida?.beneficiarios || ""} onChange={(e) => updateSeguro("vida","beneficiarios",e.target.value)} /></FieldS>
                </Grid2>
              </SeguroBlock>
            )}

            {coberturas.includes("proteccion_ingresos") && (
              <SeguroBlock title="Protección de ingresos">
                <Grid2>
                  <FieldS label="Ingresos mensuales"><input className="input-base" placeholder="€" value={datosSeguros.proteccion_ingresos?.ingresos || ""} onChange={(e) => updateSeguro("proteccion_ingresos","ingresos",e.target.value)} /></FieldS>
                  <FieldS label="Base asegurada deseada"><input className="input-base" value={datosSeguros.proteccion_ingresos?.base || ""} onChange={(e) => updateSeguro("proteccion_ingresos","base",e.target.value)} /></FieldS>
                </Grid2>
              </SeguroBlock>
            )}

            {coberturas.includes("prl") && (
              <SeguroBlock title="PRL">
                <Grid2>
                  <FieldS label="Nº trabajadores"><input className="input-base" value={datosSeguros.prl?.trabajadores || ""} onChange={(e) => updateSeguro("prl","trabajadores",e.target.value)} /></FieldS>
                  <FieldS label="Centros de trabajo"><input className="input-base" value={datosSeguros.prl?.centros || ""} onChange={(e) => updateSeguro("prl","centros",e.target.value)} /></FieldS>
                </Grid2>
              </SeguroBlock>
            )}

            {(coberturas.includes("producto_nuevo") || coberturas.includes("repuestos_coste") || coberturas.includes("activaciones")) && (
              <SeguroBlock title="Producto, repuestos y negocio">
                <Grid2>
                  <FieldS label="Volumen mensual estimado"><input className="input-base" value={datosSeguros.negocio?.volumen || ""} onChange={(e) => updateSeguro("negocio","volumen",e.target.value)} /></FieldS>
                  <FieldS label="Tipología">
                    <select className="input-base" value={datosSeguros.negocio?.tipologia || ""} onChange={(e) => updateSeguro("negocio","tipologia",e.target.value)}>
                      <option value="">—</option>
                      <option>Gama blanca</option><option>Electrónica</option><option>Movilidad</option><option>PAE</option><option>Confort</option>
                    </select>
                  </FieldS>
                </Grid2>
              </SeguroBlock>
            )}
          </div>
        )}

        {/* STEP 6 — Scoring + Firma + Envío */}
        {step === 6 && (
          <div className="space-y-8 animate-fade-up">
            <div>
              <h2 className="font-display text-3xl text-ink">Tu valoración</h2>
              <p className="text-muted-foreground mt-2">Calculamos tu nivel de idoneidad en función de los datos aportados.</p>
            </div>

            <ScoringBadge scoring={scoring} />

            <div>
              <h2 className="font-display text-3xl text-ink mt-8">Acuerdo de colaboración</h2>
              <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
                Firma manuscrita del compromiso inicial de incorporación a WG Professional Network. Generaremos un PDF firmado que quedará registrado.
              </p>
            </div>

            <SignaturePad
              signerName={signerName}
              onSignerNameChange={setSignerName}
              signerDni={signerDni}
              onSignerDniChange={setSignerDni}
              onChange={setSignatureData}
            />

            <label className="flex items-start gap-3 text-sm text-ink-soft cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border accent-teal"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <span>
                Acepto las{" "}
                <Link to="/legal/privacidad" className="text-teal-deep hover:underline" target="_blank">condiciones de privacidad</Link>{" "}
                y declaro que los datos aportados son veraces.
              </span>
            </label>
          </div>
        )}

        {/* Nav */}
        <div className="mt-12 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <button onClick={prev} disabled={step === 1 || submitting} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-ink disabled:opacity-30 disabled:pointer-events-none">
            <ArrowLeft className="h-4 w-4" /> Atrás
          </button>

          {step === 6 ? (
            <button onClick={submit} disabled={submitting || !signatureData || !acceptTerms} className="btn-primary disabled:opacity-50">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Firmar y enviar
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          ) : (
            <button onClick={next} className="btn-primary">
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Recordatorio email */}
        {!draft && step >= 2 && (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card/60 p-4 flex gap-3 items-start">
            <Mail className="h-4 w-4 text-teal-deep mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Introduce tu email en el primer paso para guardar automáticamente tu progreso y poder retomarlo más tarde.
            </p>
          </div>
        )}
      </div>

      <style>{`
        .input-base {
          width: 100%;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card));
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          color: hsl(var(--foreground));
          transition: all 0.2s;
        }
        .input-base:focus {
          outline: none;
          border-color: hsl(var(--ink));
          box-shadow: 0 0 0 3px hsl(var(--teal) / 0.2);
        }
      `}</style>
    </section>
  );
};

const Field = ({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-sm font-medium text-ink mb-2">{label}</span>
    {children}
    {hint && !error && <span className="block text-xs text-muted-foreground mt-1.5">{hint}</span>}
    {error && <span className="block text-xs text-destructive mt-1.5">{error}</span>}
  </label>
);

const FieldS = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-sm font-medium text-ink mb-2">{label}</span>
    {children}
  </label>
);

const Grid2 = ({ children }: { children: React.ReactNode }) => (
  <div className="grid md:grid-cols-2 gap-5">{children}</div>
);

const SeguroBlock = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-5">
    <h3 className="font-display text-xl text-ink border-b border-border pb-3">{title}</h3>
    {children}
  </div>
);

const ChipsMulti = ({ opts, value, onChange }: { opts: string[]; value: string[]; onChange: (v: string) => void }) => (
  <div className="flex flex-wrap gap-2">
    {opts.map((o) => {
      const on = value.includes(o);
      return (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={cn(
            "rounded-full px-4 py-2 text-sm border transition-all",
            on ? "bg-ink text-bone border-ink" : "bg-card border-border text-ink hover:border-ink/40",
          )}>{o}</button>
      );
    })}
  </div>
);

const FileSlot = ({
  label, file, progress, onChange,
}: {
  label: string;
  file: File | null | undefined;
  progress?: number | "done" | "error";
  onChange: (f: File | null) => void;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  const handleFiles = (f: File | null) => {
    setError(null);
    if (!f) { onChange(null); return; }
    const okType = ACCEPTED_MIME.includes(f.type) || /\.(pdf|jpe?g|png|webp)$/i.test(f.name);
    if (!okType) { setError("Formato no permitido."); return; }
    if (f.size > MAX_FILE_BYTES) { setError(`Demasiado grande (${formatBytes(f.size)}).`); return; }
    onChange(f);
  };

  const isImage = file?.type.startsWith("image/");
  const uploading = typeof progress === "number";
  const uploaded = progress === "done";
  const uploadErr = progress === "error";

  return (
    <div className={cn("rounded-xl border bg-card p-4 transition-colors", uploadErr || error ? "border-destructive/60" : "border-border")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
            {isImage && previewUrl ? <img src={previewUrl} alt={file!.name} className="h-full w-full object-cover" />
              : file ? <FileText className="h-5 w-5 text-ink-soft" />
              : <Upload className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink truncate">{label}</p>
            {file ? (
              <p className="text-xs text-muted-foreground truncate" title={file.name}>{file.name} · {formatBytes(file.size)}</p>
            ) : (
              <p className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP · máx 10 MB</p>
            )}
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            {uploadErr && <p className="text-xs text-destructive mt-1">Error al subir.</p>}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1">
          {file && isImage && previewUrl && (
            <a href={previewUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-ink p-1.5 rounded-md hover:bg-secondary" aria-label="Ver" title="Ver">
              <Eye className="h-4 w-4" />
            </a>
          )}
          {file && !uploading && !uploaded && (
            <button type="button" onClick={() => inputRef.current?.click()} className="text-muted-foreground hover:text-ink p-1.5 rounded-md hover:bg-secondary" aria-label="Reemplazar" title="Reemplazar">
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          {file && !uploading && (
            <button type="button" onClick={() => onChange(null)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-secondary" aria-label="Eliminar" title="Eliminar">
              <X className="h-4 w-4" />
            </button>
          )}
          {!file && (
            <button type="button" onClick={() => inputRef.current?.click()} className="text-xs font-medium text-teal-deep hover:underline px-2 py-1.5">
              Subir
            </button>
          )}
        </div>
      </div>

      {uploading && (
        <div className="mt-3 h-1 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-teal transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}
      {uploaded && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-teal-deep">
          <Check className="h-3 w-3" /> Subido
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files?.[0] || null)}
      />
    </div>
  );
};

export default Inscripcion;
