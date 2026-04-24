import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Upload, X, Loader2, AlertCircle, FileText, Image as ImageIcon, RefreshCw, Eye } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

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
const ACCEPTED_EXT = ".pdf,.jpg,.jpeg,.png,.webp";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

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
  zona_cobertura: z.string().trim().max(300).optional(),
  provincias: z.string().trim().max(500).optional(),
});

const Inscripcion = () => {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Step 1
  const [s1, setS1] = useState({
    razon_social: "", nombre_comercial: "", cif_nif: "", tipo_colaborador: "",
    persona_contacto: "", email: "", telefono: "",
    direccion_fiscal: "", zona_cobertura: "", provincias: "",
  });
  const [errs1, setErrs1] = useState<Record<string, string>>({});

  // Step 2
  const [familiasSel, setFamiliasSel] = useState<string[]>([]);
  const [marcas, setMarcas] = useState("");
  const [tecnicos, setTecnicos] = useState<string>("");
  const [serviciosSel, setServiciosSel] = useState<string[]>([]);
  const [horarios, setHorarios] = useState("");
  const [capacidad, setCapacidad] = useState("");

  // Step 3 — docs
  const [files, setFiles] = useState<Record<string, File | null>>({});
  // Per-document upload progress: 0–100, or 'done', or 'error'
  const [uploadProgress, setUploadProgress] = useState<Record<string, number | "done" | "error">>({});

  // Step 4
  const [coberturas, setCoberturas] = useState<string[]>([]);

  // Step 5 — datos por seguro
  const [datosSeguros, setDatosSeguros] = useState<Record<string, Record<string, string>>>({});

  const toggle = (arr: string[], v: string, set: (x: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const updateSeguro = (key: string, field: string, value: string) => {
    setDatosSeguros((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  };

  const validateStep1 = () => {
    const r = step1Schema.safeParse(s1);
    if (!r.success) {
      const e: Record<string, string> = {};
      r.error.issues.forEach((i) => { e[i.path[0] as string] = i.message; });
      setErrs1(e);
      return false;
    }
    setErrs1({});
    return true;
  };

  const showStep5 = coberturas.some((c) =>
    ["seguros_colectivos","salud","vida","proteccion_ingresos","proteccion_juridica","ahorro","prl","documentacion","producto_nuevo","repuestos_coste","activaciones"].includes(c)
  );

  const next = () => {
    if (step === 1 && !validateStep1()) {
      toast.error("Revisa los campos obligatorios");
      return;
    }
    const target = step === 4 && !showStep5 ? 6 : (step + 1) as Step;
    setStep(Math.min(target, 6) as Step);
  };
  const prev = () => {
    const target = step === 6 && !showStep5 ? 4 : (step - 1) as Step;
    setStep(Math.max(target, 1) as Step);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data: app, error } = await supabase
        .from("wg_network_applications")
        .insert({
          ...s1,
          familias_producto: familiasSel,
          marcas_trabajadas: marcas,
          numero_tecnicos: tecnicos ? parseInt(tecnicos) : null,
          servicios_ofrecidos: serviciosSel,
          horarios,
          capacidad_mensual: capacidad,
          coberturas,
          datos_seguros: datosSeguros,
        })
        .select("id")
        .single();
      if (error) throw error;

      // upload files
      const appId = app.id;
      const uploads = Object.entries(files).filter(([, f]) => f);
      for (const [docType, file] of uploads) {
        if (!file) continue;
        const path = `${appId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("wg-documents").upload(path, file);
        if (upErr) {
          console.error("Upload error", docType, upErr);
          continue;
        }
        await supabase.from("wg_network_documents").insert({
          application_id: appId,
          document_type: docType,
          file_path: path,
          file_name: file.name,
          file_size: file.size,
        });
      }

      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      console.error(e);
      toast.error("No hemos podido enviar tu solicitud. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
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
            <p>Nuestro equipo revisará la información y contactará contigo para confirmar:</p>
            <ul className="space-y-2 pl-6 list-disc text-base text-muted-foreground">
              <li>Documentación pendiente</li>
              <li>Nivel de participación</li>
              <li>Acceso a repuestos y producto</li>
              <li>Coberturas seleccionadas</li>
              <li>Próximos pasos</li>
            </ul>
          </div>
          <p className="mt-12 font-display italic text-2xl text-teal">
            El futuro no se construye solo. Se construye juntos.
          </p>
          <Link to="/" className="btn-primary mt-12">Volver al inicio</Link>
        </div>
      </section>
    );
  }

  const totalSteps = showStep5 ? 6 : 5;
  const visibleStep = step === 6 && !showStep5 ? 5 : step;

  return (
    <section className="pt-32 md:pt-40 pb-24 bg-bone min-h-screen">
      <div className="container-tight max-w-4xl">
        <p className="eyebrow mb-4">WG Professional Network</p>
        <h1 className="heading-display text-ink text-4xl md:text-6xl text-balance mb-4">
          Únete a la red.
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Un único proceso para activar trabajo, protección y crecimiento.
        </p>

        {/* Progress */}
        <div className="mt-12 mb-12">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <span>Paso {visibleStep} de {totalSteps}</span>
            <span>{Math.round((visibleStep / totalSteps) * 100)}%</span>
          </div>
          <div className="h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-teal transition-all duration-500 ease-smooth"
              style={{ width: `${(visibleStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-up">
            <h2 className="font-display text-3xl text-ink">Datos generales</h2>
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Razón social *" error={errs1.razon_social}>
                <input className="input-base" value={s1.razon_social} onChange={(e) => setS1({ ...s1, razon_social: e.target.value })} />
              </Field>
              <Field label="Nombre comercial">
                <input className="input-base" value={s1.nombre_comercial} onChange={(e) => setS1({ ...s1, nombre_comercial: e.target.value })} />
              </Field>
              <Field label="CIF / NIF / DNI *" error={errs1.cif_nif}>
                <input className="input-base" value={s1.cif_nif} onChange={(e) => setS1({ ...s1, cif_nif: e.target.value })} />
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
              <Field label="Email *" error={errs1.email}>
                <input type="email" className="input-base" value={s1.email} onChange={(e) => setS1({ ...s1, email: e.target.value })} />
              </Field>
              <Field label="Teléfono *" error={errs1.telefono}>
                <input className="input-base" value={s1.telefono} onChange={(e) => setS1({ ...s1, telefono: e.target.value })} />
              </Field>
              <Field label="Dirección fiscal">
                <input className="input-base" value={s1.direccion_fiscal} onChange={(e) => setS1({ ...s1, direccion_fiscal: e.target.value })} />
              </Field>
              <Field label="Zona de cobertura" hint="Provincias o áreas geográficas">
                <input className="input-base" value={s1.zona_cobertura} onChange={(e) => setS1({ ...s1, zona_cobertura: e.target.value })} />
              </Field>
              <Field label="Provincias / códigos postales">
                <input className="input-base" value={s1.provincias} onChange={(e) => setS1({ ...s1, provincias: e.target.value })} />
              </Field>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-8 animate-fade-up">
            <h2 className="font-display text-3xl text-ink">Capacidad operativa</h2>
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
              <p className="text-sm text-ink-soft">
                Sin la documentación obligatoria no podrá completarse la activación operativa.
                Puedes subir lo que tengas ahora; el resto se completará en el alta.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {docTypes.map((doc) => (
                <FileSlot key={doc} label={doc} file={files[doc]} onChange={(f) => setFiles({ ...files, [doc]: f })} />
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
                      checked
                        ? "border-ink bg-ink text-bone"
                        : "border-border bg-card hover:border-ink/40"
                    )}
                  >
                    <span className="text-sm font-medium">{c.label}</span>
                    <span className={cn(
                      "h-5 w-5 rounded-full border flex items-center justify-center",
                      checked ? "bg-teal border-teal" : "border-border"
                    )}>
                      {checked && <Check className="h-3 w-3 text-ink" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5 — Conditional */}
        {step === 5 && showStep5 && (
          <div className="space-y-10 animate-fade-up">
            <h2 className="font-display text-3xl text-ink">Datos para tus coberturas</h2>
            <p className="text-muted-foreground">Solo se muestran los bloques de las coberturas que has seleccionado.</p>

            {coberturas.includes("seguros_colectivos") && (
              <SeguroBlock title="Seguros colectivos">
                <Grid2>
                  <FieldS label="Número de empleados"><input className="input-base" onChange={(e) => updateSeguro("seguros_colectivos","empleados",e.target.value)} /></FieldS>
                  <FieldS label="Tipo de actividad"><input className="input-base" onChange={(e) => updateSeguro("seguros_colectivos","actividad",e.target.value)} /></FieldS>
                  <FieldS label="CNAE"><input className="input-base" onChange={(e) => updateSeguro("seguros_colectivos","cnae",e.target.value)} /></FieldS>
                  <FieldS label="Número de asegurados"><input className="input-base" onChange={(e) => updateSeguro("seguros_colectivos","asegurados",e.target.value)} /></FieldS>
                  <FieldS label="Edad media"><input className="input-base" onChange={(e) => updateSeguro("seguros_colectivos","edad_media",e.target.value)} /></FieldS>
                  <FieldS label="Rango de edades"><input className="input-base" placeholder="Ej. 25-55" onChange={(e) => updateSeguro("seguros_colectivos","rango_edades",e.target.value)} /></FieldS>
                  <FieldS label="Titular / cónyuge / hijos">
                    <select className="input-base" onChange={(e) => updateSeguro("seguros_colectivos","perfil_familiar",e.target.value)}>
                      <option value="">—</option>
                      <option>Solo titular</option>
                      <option>Titular + cónyuge</option>
                      <option>Titular + hijos</option>
                      <option>Familia completa</option>
                    </select>
                  </FieldS>
                  <FieldS label="Cobertura geográfica"><input className="input-base" onChange={(e) => updateSeguro("seguros_colectivos","cobertura_geo",e.target.value)} /></FieldS>
                </Grid2>
                <FieldS label="Cobertura deseada"><textarea className="input-base min-h-20" placeholder="Describe el alcance de cobertura que buscas" onChange={(e) => updateSeguro("seguros_colectivos","cobertura_deseada",e.target.value)} /></FieldS>
              </SeguroBlock>
            )}

            {coberturas.includes("salud") && (
              <SeguroBlock title="Salud">
                <Grid2>
                  <FieldS label="Nombre y apellidos"><input className="input-base" onChange={(e) => updateSeguro("salud","nombre",e.target.value)} /></FieldS>
                  <FieldS label="DNI"><input className="input-base" onChange={(e) => updateSeguro("salud","dni",e.target.value)} /></FieldS>
                  <FieldS label="Fecha de nacimiento"><input type="date" className="input-base" onChange={(e) => updateSeguro("salud","fnac",e.target.value)} /></FieldS>
                  <FieldS label="Sexo">
                    <select className="input-base" onChange={(e) => updateSeguro("salud","sexo",e.target.value)}>
                      <option value="">—</option><option>Femenino</option><option>Masculino</option><option>Otro</option>
                    </select>
                  </FieldS>
                  <FieldS label="Modalidad">
                    <select className="input-base" onChange={(e) => updateSeguro("salud","modalidad",e.target.value)}>
                      <option value="">—</option><option>Con copago</option><option>Sin copago</option>
                    </select>
                  </FieldS>
                  <FieldS label="Asegurados"><input type="number" className="input-base" onChange={(e) => updateSeguro("salud","asegurados",e.target.value)} /></FieldS>
                  <FieldS label="Dental">
                    <select className="input-base" onChange={(e) => updateSeguro("salud","dental",e.target.value)}><option value="">—</option><option>Sí</option><option>No</option></select>
                  </FieldS>
                  <FieldS label="Hospitalización">
                    <select className="input-base" onChange={(e) => updateSeguro("salud","hosp",e.target.value)}><option value="">—</option><option>Sí</option><option>No</option></select>
                  </FieldS>
                </Grid2>
                <Grid2>
                  <FieldS label="Declaración básica de salud">
                    <select className="input-base" onChange={(e) => updateSeguro("salud","declaracion",e.target.value)}>
                      <option value="">—</option>
                      <option>Sin patologías relevantes</option>
                      <option>Patologías leves controladas</option>
                      <option>Patologías relevantes (detallar)</option>
                    </select>
                  </FieldS>
                  <FieldS label="Preexistencias (si aplica)"><input className="input-base" onChange={(e) => updateSeguro("salud","preexistencias",e.target.value)} /></FieldS>
                </Grid2>
              </SeguroBlock>
            )}

            {coberturas.includes("vida") && (
              <SeguroBlock title="Vida">
                <Grid2>
                  <FieldS label="Edad"><input type="number" className="input-base" onChange={(e) => updateSeguro("vida","edad",e.target.value)} /></FieldS>
                  <FieldS label="Profesión"><input className="input-base" onChange={(e) => updateSeguro("vida","profesion",e.target.value)} /></FieldS>
                  <FieldS label="Estado civil"><input className="input-base" onChange={(e) => updateSeguro("vida","civil",e.target.value)} /></FieldS>
                  <FieldS label="¿Hijos?">
                    <select className="input-base" onChange={(e) => updateSeguro("vida","hijos",e.target.value)}><option value="">—</option><option>Sí</option><option>No</option></select>
                  </FieldS>
                  <FieldS label="Capital asegurado"><input className="input-base" placeholder="€" onChange={(e) => updateSeguro("vida","capital",e.target.value)} /></FieldS>
                  <FieldS label="Beneficiarios"><input className="input-base" onChange={(e) => updateSeguro("vida","beneficiarios",e.target.value)} /></FieldS>
                  <FieldS label="Actividades de riesgo"><input className="input-base" placeholder="Ej. trabajo en altura, motor" onChange={(e) => updateSeguro("vida","riesgo",e.target.value)} /></FieldS>
                  <FieldS label="Declaración básica de salud">
                    <select className="input-base" onChange={(e) => updateSeguro("vida","declaracion",e.target.value)}>
                      <option value="">—</option>
                      <option>Sin patologías relevantes</option>
                      <option>Patologías leves controladas</option>
                      <option>Patologías relevantes (detallar)</option>
                    </select>
                  </FieldS>
                </Grid2>
              </SeguroBlock>
            )}

            {coberturas.includes("proteccion_ingresos") && (
              <SeguroBlock title="Protección de ingresos">
                <Grid2>
                  <FieldS label="Autónomo / Empresa">
                    <select className="input-base" onChange={(e) => updateSeguro("proteccion_ingresos","tipo",e.target.value)}><option value="">—</option><option>Autónomo</option><option>Empresa</option></select>
                  </FieldS>
                  <FieldS label="Ingresos mensuales medios"><input className="input-base" placeholder="€" onChange={(e) => updateSeguro("proteccion_ingresos","ingresos",e.target.value)} /></FieldS>
                  <FieldS label="Antigüedad en actividad"><input className="input-base" onChange={(e) => updateSeguro("proteccion_ingresos","antiguedad",e.target.value)} /></FieldS>
                  <FieldS label="Base asegurada deseada"><input className="input-base" onChange={(e) => updateSeguro("proteccion_ingresos","base",e.target.value)} /></FieldS>
                  <FieldS label="Periodo de carencia"><input className="input-base" onChange={(e) => updateSeguro("proteccion_ingresos","carencia",e.target.value)} /></FieldS>
                  <FieldS label="Duración de cobertura"><input className="input-base" onChange={(e) => updateSeguro("proteccion_ingresos","duracion",e.target.value)} /></FieldS>
                  <FieldS label="Profesión concreta"><input className="input-base" onChange={(e) => updateSeguro("proteccion_ingresos","profesion",e.target.value)} /></FieldS>
                  <FieldS label="Nivel de exposición física">
                    <select className="input-base" onChange={(e) => updateSeguro("proteccion_ingresos","exposicion",e.target.value)}>
                      <option value="">—</option>
                      <option>Bajo (oficina)</option>
                      <option>Medio (campo / desplazamientos)</option>
                      <option>Alto (manual / altura / riesgo)</option>
                    </select>
                  </FieldS>
                </Grid2>
              </SeguroBlock>
            )}

            {coberturas.includes("proteccion_juridica") && (
              <SeguroBlock title="Protección jurídica">
                <Grid2>
                  <FieldS label="Tipo de servicios prestados"><input className="input-base" onChange={(e) => updateSeguro("proteccion_juridica","servicios",e.target.value)} /></FieldS>
                  <FieldS label="Volumen anual aproximado"><input className="input-base" onChange={(e) => updateSeguro("proteccion_juridica","volumen",e.target.value)} /></FieldS>
                  <FieldS label="Intervenciones/año"><input className="input-base" onChange={(e) => updateSeguro("proteccion_juridica","intervenciones",e.target.value)} /></FieldS>
                  <FieldS label="Reclamaciones últimos 3 años"><input className="input-base" onChange={(e) => updateSeguro("proteccion_juridica","reclamaciones",e.target.value)} /></FieldS>
                </Grid2>
                <FieldS label="Tipología de conflictos habituales"><textarea className="input-base min-h-20" placeholder="Ej. impagos, garantía, daños, laborales…" onChange={(e) => updateSeguro("proteccion_juridica","tipologia_conflictos",e.target.value)} /></FieldS>
                <FieldS label="Ámbito deseado"><input className="input-base" placeholder="Civil, laboral, administrativo" onChange={(e) => updateSeguro("proteccion_juridica","ambito",e.target.value)} /></FieldS>
              </SeguroBlock>
            )}

            {coberturas.includes("ahorro") && (
              <SeguroBlock title="Planes de ahorro">
                <Grid2>
                  <FieldS label="Objetivo">
                    <select className="input-base" onChange={(e) => updateSeguro("ahorro","objetivo",e.target.value)}>
                      <option value="">—</option>
                      <option>Jubilación</option>
                      <option>Ahorro</option>
                      <option>Protección familiar</option>
                    </select>
                  </FieldS>
                  <FieldS label="Horizonte temporal"><input className="input-base" placeholder="Ej. 10 años" onChange={(e) => updateSeguro("ahorro","horizonte",e.target.value)} /></FieldS>
                  <FieldS label="Aportación inicial"><input className="input-base" placeholder="€" onChange={(e) => updateSeguro("ahorro","inicial",e.target.value)} /></FieldS>
                  <FieldS label="Aportación mensual"><input className="input-base" placeholder="€" onChange={(e) => updateSeguro("ahorro","mensual",e.target.value)} /></FieldS>
                  <FieldS label="Perfil de riesgo">
                    <select className="input-base" onChange={(e) => updateSeguro("ahorro","perfil",e.target.value)}><option value="">—</option><option>Conservador</option><option>Moderado</option><option>Dinámico</option></select>
                  </FieldS>
                  <FieldS label="Preferencia de liquidez">
                    <select className="input-base" onChange={(e) => updateSeguro("ahorro","liquidez",e.target.value)}>
                      <option value="">—</option>
                      <option>Alta (acceso inmediato)</option>
                      <option>Media (penalización corta)</option>
                      <option>Baja (largo plazo)</option>
                    </select>
                  </FieldS>
                </Grid2>
              </SeguroBlock>
            )}

            {coberturas.includes("prl") && (
              <SeguroBlock title="PRL">
                <Grid2>
                  <FieldS label="Nº trabajadores"><input className="input-base" onChange={(e) => updateSeguro("prl","trabajadores",e.target.value)} /></FieldS>
                  <FieldS label="Actividad"><input className="input-base" onChange={(e) => updateSeguro("prl","actividad",e.target.value)} /></FieldS>
                  <FieldS label="Centros de trabajo"><input className="input-base" onChange={(e) => updateSeguro("prl","centros",e.target.value)} /></FieldS>
                  <FieldS label="Tipo de intervenciones"><input className="input-base" placeholder="Reparación, instalación…" onChange={(e) => updateSeguro("prl","intervenciones",e.target.value)} /></FieldS>
                  <FieldS label="¿PRL existente?">
                    <select className="input-base" onChange={(e) => updateSeguro("prl","existente",e.target.value)}><option value="">—</option><option>Sí</option><option>No</option></select>
                  </FieldS>
                  <FieldS label="Formación vigente">
                    <select className="input-base" onChange={(e) => updateSeguro("prl","formacion",e.target.value)}><option value="">—</option><option>Sí</option><option>Parcial</option><option>No</option></select>
                  </FieldS>
                  <FieldS label="Fecha de vencimiento formación"><input type="date" className="input-base" onChange={(e) => updateSeguro("prl","vencimiento",e.target.value)} /></FieldS>
                </Grid2>
                <FieldS label="Riesgos asociados">
                  <ChipsMulti
                    opts={["Eléctrico", "Trabajo en altura", "Manipulación de cargas", "Desplazamiento", "Químico", "Mecánico"]}
                    value={(datosSeguros.prl?.riesgos || "").split("|").filter(Boolean)}
                    onChange={(v) => {
                      const cur = (datosSeguros.prl?.riesgos || "").split("|").filter(Boolean);
                      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
                      updateSeguro("prl", "riesgos", next.join("|"));
                    }}
                  />
                </FieldS>
              </SeguroBlock>
            )}

            {coberturas.includes("documentacion") && (
              <SeguroBlock title="Documentación">
                <Grid2>
                  <FieldS label="Tipo de documento"><input className="input-base" placeholder="Ej. Certificado AEAT" onChange={(e) => updateSeguro("documentacion","tipo",e.target.value)} /></FieldS>
                  <FieldS label="Fecha de vencimiento"><input type="date" className="input-base" onChange={(e) => updateSeguro("documentacion","vencimiento",e.target.value)} /></FieldS>
                  <FieldS label="Responsable de actualización"><input className="input-base" onChange={(e) => updateSeguro("documentacion","responsable",e.target.value)} /></FieldS>
                  <FieldS label="Alertas de renovación">
                    <select className="input-base" onChange={(e) => updateSeguro("documentacion","alertas",e.target.value)}>
                      <option value="">—</option>
                      <option>30 días antes</option>
                      <option>60 días antes</option>
                      <option>90 días antes</option>
                    </select>
                  </FieldS>
                </Grid2>
                <FieldS label="Subida de archivo (opcional)">
                  <input type="file" className="input-base" onChange={(e) => updateSeguro("documentacion","archivo", e.target.files?.[0]?.name || "")} />
                  <span className="block text-xs text-muted-foreground mt-1.5">Si subes documentos en el paso 3, no es necesario repetirlos aquí.</span>
                </FieldS>
              </SeguroBlock>
            )}

            {(coberturas.includes("producto_nuevo") || coberturas.includes("repuestos_coste") || coberturas.includes("activaciones")) && (
              <SeguroBlock title="Producto, repuestos y negocio">
                <Grid2>
                  <FieldS label="Interés en acceso a producto">
                    <select className="input-base" onChange={(e) => updateSeguro("negocio","interes_producto",e.target.value)}><option value="">—</option><option>Sí</option><option>No</option></select>
                  </FieldS>
                  <FieldS label="Tipología de producto">
                    <select className="input-base" onChange={(e) => updateSeguro("negocio","tipologia",e.target.value)}>
                      <option value="">—</option>
                      <option>Gama blanca</option>
                      <option>Electrónica</option>
                      <option>Movilidad</option>
                      <option>PAE</option>
                      <option>Confort</option>
                    </select>
                  </FieldS>
                  <FieldS label="Volumen mensual estimado"><input className="input-base" onChange={(e) => updateSeguro("negocio","volumen",e.target.value)} /></FieldS>
                  <FieldS label="Uso">
                    <select className="input-base" onChange={(e) => updateSeguro("negocio","uso",e.target.value)}><option value="">—</option><option>Propio</option><option>Reparación</option><option>Reventa</option></select>
                  </FieldS>
                  <FieldS label="Interés en activaciones comerciales">
                    <select className="input-base" onChange={(e) => updateSeguro("negocio","activaciones",e.target.value)}><option value="">—</option><option>Sí</option><option>No</option></select>
                  </FieldS>
                  <FieldS label="Interés en garantía extendida">
                    <select className="input-base" onChange={(e) => updateSeguro("negocio","ge",e.target.value)}><option value="">—</option><option>Sí</option><option>No</option></select>
                  </FieldS>
                </Grid2>
              </SeguroBlock>
            )}
          </div>
        )}

        {/* STEP 6 / final review */}
        {step === 6 || (step === 5 && !showStep5) ? (
          <div className="space-y-6 animate-fade-up">
            <h2 className="font-display text-3xl text-ink">Revisar y enviar</h2>
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3 text-sm">
              <p><span className="text-muted-foreground">Razón social:</span> <span className="text-ink font-medium">{s1.razon_social || "—"}</span></p>
              <p><span className="text-muted-foreground">Tipo:</span> <span className="text-ink">{s1.tipo_colaborador || "—"}</span></p>
              <p><span className="text-muted-foreground">Contacto:</span> <span className="text-ink">{s1.persona_contacto} · {s1.email} · {s1.telefono}</span></p>
              <p><span className="text-muted-foreground">Familias:</span> <span className="text-ink">{familiasSel.join(", ") || "—"}</span></p>
              <p><span className="text-muted-foreground">Servicios:</span> <span className="text-ink">{serviciosSel.join(", ") || "—"}</span></p>
              <p><span className="text-muted-foreground">Documentos:</span> <span className="text-ink">{Object.values(files).filter(Boolean).length} adjuntos</span></p>
              <p><span className="text-muted-foreground">Coberturas:</span> <span className="text-ink">{coberturas.length ? coberturas.join(", ") : "—"}</span></p>
            </div>
            <p className="text-xs text-muted-foreground">Al enviar aceptas la política de privacidad y el tratamiento de datos para gestionar tu inscripción.</p>
          </div>
        ) : null}

        {/* Nav */}
        <div className="mt-12 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <button onClick={prev} disabled={step === 1 || submitting} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-ink disabled:opacity-30 disabled:pointer-events-none">
            <ArrowLeft className="h-4 w-4" /> Atrás
          </button>

          {((step === 6) || (step === 5 && !showStep5)) ? (
            <button onClick={submit} disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar inscripción
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          ) : (
            <button onClick={next} className="btn-primary">
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
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
            on ? "bg-ink text-bone border-ink" : "bg-card border-border text-ink hover:border-ink/40"
          )}>{o}</button>
      );
    })}
  </div>
);

const FileSlot = ({ label, file, onChange }: { label: string; file: File | null | undefined; onChange: (f: File | null) => void }) => {
  const id = `file-${label.replace(/\s+/g, "-")}`;
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink truncate">{label}</p>
        {file && <p className="text-xs text-muted-foreground truncate">{file.name}</p>}
      </div>
      {file ? (
        <button onClick={() => onChange(null)} className="text-muted-foreground hover:text-destructive shrink-0">
          <X className="h-4 w-4" />
        </button>
      ) : (
        <>
          <input id={id} type="file" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
          <label htmlFor={id} className="shrink-0 cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs text-ink hover:border-ink flex items-center gap-1.5">
            <Upload className="h-3 w-3" /> Subir
          </label>
        </>
      )}
    </div>
  );
};

export default Inscripcion;
