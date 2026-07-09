import { Reveal } from "@/components/site/Reveal";
import {
  CalendarClock, PenLine, Wallet, Receipt, ShieldCheck, Umbrella, FolderCheck,
  Stethoscope, Boxes, History, Package, Sparkles, Share2, Scale, BookOpen,
  type LucideIcon,
} from "lucide-react";

type Feature = { icon: LucideIcon; t: string; d: string };

const GESTION: Feature[] = [
  { icon: CalendarClock, t: "Agenda", d: "Tu ruta del día, ordenada sola." },
  { icon: PenLine, t: "Partes", d: "Dictas y la IA rellena el parte; el cliente firma en el móvil." },
  { icon: Wallet, t: "Cobros", d: "Cobras rápido y sigues cada pago." },
  { icon: Receipt, t: "Facturación", d: "Del parte a la factura, sin reescribir nada." },
  { icon: ShieldCheck, t: "Garantías", d: "Gestionas las garantías extendidas y su comisión." },
  { icon: Umbrella, t: "Seguros", d: "Tu protección y la de tu equipo, en un sitio." },
  { icon: FolderCheck, t: "Documentación", d: "Tus documentos al día, con aviso antes de que caduquen." },
];

const REPARA: Feature[] = [
  { icon: Stethoscope, t: "Diagnóstico asistido", d: "Describe el síntoma y te dice el componente más probable." },
  { icon: Boxes, t: "Exploded views", d: "El despiece del aparato, con la pieza señalada." },
  { icon: History, t: "Historial del aparato", d: "Qué se le hizo antes, a la vista." },
  { icon: Package, t: "Repuesto recomendado", d: "La pieza exacta, con tu descuento y en un clic." },
  { icon: Sparkles, t: "Copiloto técnico", d: "Pregunta lo que sea; te responde al momento." },
  { icon: Share2, t: "Conocimiento colectivo de la red", d: "Aprendes de lo que resuelve toda la red." },
  { icon: Scale, t: "Reparar vs sustituir", d: "Te decimos cuándo compensa cambiar el aparato." },
  { icon: BookOpen, t: "Información técnica centralizada", d: "Manuales, esquemas y códigos de error, en un solo sitio." },
];

const Card = ({ f }: { f: Feature }) => {
  const Icon = f.icon;
  return (
    <div className="rounded-2xl border border-border bg-card p-6 h-full">
      <Icon className="h-6 w-6 text-teal mb-4" strokeWidth={1.5} />
      <h4 className="font-display text-lg text-ink mb-1">{f.t}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed">{f.d}</p>
    </div>
  );
};

export const NativeAppBlock = () => (
  <section className="py-24 md:py-32 bg-background">
    <div className="container-tight">
      <Reveal>
        <div className="max-w-3xl mb-4">
          <p className="eyebrow mb-4">La plataforma</p>
          <h2 className="heading-display text-ink text-[clamp(2.25rem,6.5vw,5.5rem)] text-balance">
            No es una web. Es tu negocio funcionando solo.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Una sola app con IA: gestiona tu SAT y repara mejor. Todo en un sitio, sin cuotas.
          </p>
        </div>
      </Reveal>
      <Reveal>
        <span className="inline-flex items-center gap-2 rounded-full border border-teal/40 bg-teal/10 px-3 py-1 text-xs font-medium text-teal-deep mb-14">
          Se activa en diciembre · Capa 3
        </span>
      </Reveal>

      {/* Gestiona tu negocio */}
      <Reveal>
        <div className="mb-6">
          <p className="eyebrow mb-2">Gestiona tu negocio</p>
          <p className="text-muted-foreground">Tu SAT, sin papeleo.</p>
        </div>
      </Reveal>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-16">
        {GESTION.map((f, i) => (
          <Reveal key={f.t} delay={i * 50}><Card f={f} /></Reveal>
        ))}
      </div>

      {/* Repara mejor */}
      <Reveal>
        <div className="mb-6">
          <p className="eyebrow mb-2">Repara mejor</p>
          <p className="text-muted-foreground">IA que te hace mejor técnico.</p>
        </div>
      </Reveal>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {REPARA.map((f, i) => (
          <Reveal key={f.t} delay={i * 50}><Card f={f} /></Reveal>
        ))}
      </div>
    </div>
  </section>
);
