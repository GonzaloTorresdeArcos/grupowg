import { Reveal } from "@/components/site/Reveal";
import { Factory, Shield, ShoppingBag, Bike, Zap, Cpu, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const industries = [
  {
    icon: Factory,
    name: "Fabricantes",
    matters:
      "Coste de garantía sobre ventas · calidad de producto en campo · First Time Fix · Turnaround Time · control de la red técnica · impacto directo en P&L.",
    apply:
      "El servicio se gestiona como una palanca de control financiero y de calidad. Validación técnica, datos de fallo en campo en tiempo real y mejora continua del producto.",
    achieve:
      "Reducción del coste de garantía, mejora medible de calidad y conversión del fallo en información útil para producto.",
    clients: "Vestel · Cecotec · Sauber · Evvo",
    closing: "El servicio deja de ser un coste. Pasa a ser un sistema de control del negocio.",
  },
  {
    icon: ShoppingBag,
    name: "Retail",
    matters:
      "Experiencia de cliente en tienda · rapidez de resolución · visibilidad operativa · reducción de incidencias · coordinación con múltiples proveedores.",
    apply:
      "El servicio se integra como parte de la experiencia de compra: priorizamos el front, aceleramos asignación y recogidas, coordinamos red técnica y logística y damos visibilidad continua.",
    achieve:
      "Mejor experiencia de cliente, menor carga operativa en tienda, mayor rapidez de resolución y control diario del servicio.",
    clients: "Carrefour · Alcampo · Eroski · Makro",
    closing: "El servicio deja de ser fricción y pasa a ser parte de la experiencia.",
  },
  {
    icon: Shield,
    name: "Seguros",
    matters:
      "Control del coste de siniestros · eficiencia del proceso · tiempos de resolución · escalabilidad · satisfacción del asegurado.",
    apply:
      "El servicio se gestiona como un proceso de control financiero. Estructuramos la validación de casos, automatizamos decisiones cuando aplica y monitorizamos KPIs financieros y operativos.",
    achieve:
      "Reducción del coste de siniestros, mayor control del proceso, mejora de tiempos de resolución y escalabilidad operativa.",
    clients: "Assurant · AIG · Caser · Companjon · Pelayo · Plus Ultra · Seyna",
    closing: "El servicio se convierte en una herramienta de control financiero.",
  },
  {
    icon: Cpu,
    name: "Electrónica & distribución",
    matters:
      "Coste del servicio · rapidez · reducción de devoluciones · eficiencia operativa.",
    apply:
      "Optimizamos el sistema para eficiencia y coste. Ajustamos la asignación de red, optimizamos repuestos y supply chain, reducimos intervenciones innecesarias y mejoramos diagnóstico.",
    achieve:
      "Menor coste por intervención, reducción de devoluciones y mayor eficiencia operativa.",
    clients: "ElectroDepot · PC Componentes · Jocel · Telefac · Neumesse · Acadesa",
    closing: "El servicio se convierte en una palanca directa de eficiencia.",
  },
  {
    icon: Bike,
    name: "Movilidad",
    matters:
      "Capilaridad de la red · rapidez de respuesta · experiencia de usuario · seguridad.",
    apply:
      "El servicio se adapta a un entorno distribuido: desplegamos redes técnicas capilares, priorizamos tiempos de respuesta, simplificamos diagnóstico y coordinamos intervención en campo.",
    achieve:
      "Mayor cobertura, menor tiempo de respuesta y experiencia homogénea independientemente del territorio.",
    clients: "Navee · Nilox · Denver · Ducati · Aprilia · Jeep · Lamborghini · Red Bull",
    closing: "El servicio ocurre donde está el cliente.",
  },
  {
    icon: Zap,
    name: "Utilities",
    matters:
      "Disponibilidad continua · cumplimiento de SLA · continuidad del servicio · fidelización.",
    apply:
      "El servicio se gestiona como infraestructura crítica. Garantizamos disponibilidad constante, priorizamos asignación inmediata, controlamos SLA en tiempo real y aseguramos comunicación continua.",
    achieve:
      "Cumplimiento de SLA, mayor continuidad de servicio y mejor experiencia del cliente final.",
    clients: "Programas operados con compañías líderes del sector",
    closing: "El servicio se convierte en infraestructura.",
  },
];

export const IndustriesBlock = () => {
  const [active, setActive] = useState(0);
  const I = industries[active];
  const Icon = I.icon;
  return (
    <section className="py-28 md:py-36 bg-background">
      <div className="container-tight">
        <Reveal>
          <p className="eyebrow-mono mb-4">11 · Industrias</p>
          <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance">
            Un modelo.{" "}
            <span className="text-teal italic">Múltiples realidades</span>.
          </h2>
          <p className="mt-6 max-w-2xl text-muted-foreground text-lg leading-relaxed">
            No cambia el modelo. Cambia dónde ponemos el control y qué optimizamos. El rendimiento
            siempre es el resultado de un sistema coordinado.
          </p>
        </Reveal>

        <div className="mt-16 grid lg:grid-cols-12 gap-8">
          {/* Tabs verticales */}
          <Reveal className="lg:col-span-4">
            <div className="flex flex-col border border-foreground/10 rounded-2xl overflow-hidden bg-ink-elevated">
              {industries.map((ind, i) => {
                const I2 = ind.icon;
                const isActive = i === active;
                return (
                  <button
                    key={ind.name}
                    onClick={() => setActive(i)}
                    className={cn(
                      "flex items-center gap-4 px-6 py-5 text-left border-b border-foreground/10 last:border-b-0 transition-all group",
                      isActive ? "bg-teal/5" : "hover:bg-foreground/[0.02]",
                    )}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg border flex items-center justify-center shrink-0",
                        isActive
                          ? "bg-teal/15 border-teal/40 text-teal"
                          : "border-foreground/15 text-foreground/60",
                      )}
                    >
                      <I2 className="h-4 w-4" />
                    </div>
                    <span
                      className={cn(
                        "flex-1 font-medium",
                        isActive ? "text-foreground" : "text-foreground/70",
                      )}
                    >
                      {ind.name}
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isActive ? "text-teal translate-x-0.5" : "text-foreground/30",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* Detalle */}
          <Reveal key={active} className="lg:col-span-8" delay={50}>
            <div className="rounded-2xl border border-foreground/10 bg-card p-8 md:p-12 h-full">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-12 w-12 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <h3 className="heading-tight text-foreground text-3xl">{I.name}</h3>
              </div>

              <div className="grid sm:grid-cols-3 gap-6 mt-8">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal mb-3">
                    Qué les importa
                  </p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{I.matters}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal mb-3">
                    Cómo aplicamos
                  </p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{I.apply}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal mb-3">
                    Qué conseguimos
                  </p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{I.achieve}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-foreground/10">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-2">
                  Clientes
                </p>
                <p className="text-foreground/90 text-[15px]">{I.clients}</p>
              </div>

              <div className="mt-6 pt-6 border-t border-foreground/10">
                <p className="font-display text-xl text-teal italic leading-snug">{I.closing}</p>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <p className="mt-16 font-display text-2xl md:text-3xl text-foreground/85 max-w-3xl text-balance leading-snug">
            Un mismo sistema. Diferentes prioridades.{" "}
            <span className="text-teal">Un único resultado: control y rendimiento.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
};
