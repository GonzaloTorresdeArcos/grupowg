import { Link } from "react-router-dom";
import { ArrowUpRight, Heart, Shield, Wallet, Stethoscope, BookOpen, PiggyBank, HardHat, FileCheck2, FolderCheck, Package, Wrench, Briefcase, ChevronRight, ArrowDown } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { ImpactSimulator } from "@/components/wg-network/ImpactSimulator";
import { NativeAppBlock } from "@/components/wg-network/NativeAppBlock";
import { EscalaOperativa } from "@/components/wg-network/EscalaOperativa";
import { MarcasPorGama } from "@/components/wg-network/MarcasPorGama";
import networkImg from "@/assets/network.webp";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const benefitIcons = [Shield, Briefcase, Wallet, Stethoscope, Heart, PiggyBank, HardHat, FileCheck2, FolderCheck, Package, Wrench, BookOpen];

type LayerItem = { n: string; mes?: string; t: string; d: string };
type BenefitItem = { t: string; d: string };

const WGNetwork = () => {
  const { t } = useTranslation("wg-network");
  const [showBenefits, setShowBenefits] = useState(false);

  useEffect(() => {
    document.title = t("seo.title");
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("seo.description"));
  }, [t]);

  const layers = t("layers.items", { returnObjects: true }) as LayerItem[];
  const benefits = t("benefits.items", { returnObjects: true }) as BenefitItem[];

  return (
    <>
      {/* 1 · HERO — Editorial */}
      <section className="relative flex items-center bg-background text-foreground overflow-hidden pt-32 pb-20 md:pb-32">
        <img src={networkImg} alt="" width={1600} height={1024} className="absolute inset-0 h-full w-full object-cover opacity-[0.12]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/85 to-background" />
        <div className="container-tight relative z-10 py-10">
          <Reveal>
            <p className="text-[11px] md:text-xs font-medium uppercase tracking-[0.22em] text-foreground/50 mb-6">{t("hero.eyebrow")}</p>
            <h1 className="heading-display text-foreground text-[clamp(2.25rem,6.5vw,5.5rem)] max-w-5xl">
              {t("hero.title1")}
              <br />
              <span className="font-light text-foreground/55">{t("hero.title2")}</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg md:text-xl text-foreground/85 leading-relaxed">
              {t("hero.valueProp")}
            </p>
            <p className="mt-4 max-w-2xl text-base text-foreground/55 leading-relaxed">
              {t("hero.intro")}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href="#simulador" className="group inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-[15px] font-medium text-background hover:bg-foreground/90 transition-colors">
                {t("hero.cta")}
                <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              </a>
              <a href="#como-funciona" className="group inline-flex items-center gap-1.5 px-4 py-3.5 text-[15px] font-medium text-foreground/70 hover:text-foreground transition-colors">
                {t("hero.ctaSecondary")}
                <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              </a>
            </div>
            <p className="mt-10 text-xs text-foreground/45 max-w-2xl leading-relaxed">
              {t("hero.positioning")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* 2 · Hoja de ruta — 3 capas */}
      <section className="py-24 md:py-32 bg-bone">
        <div className="container-tight">
          <Reveal>
            <div className="max-w-3xl mb-16">
              <p className="eyebrow mb-4">{t("layers.eyebrow")}</p>
              <h2 className="heading-display text-ink text-[clamp(2.25rem,6.5vw,5.5rem)] text-balance">
                {t("layers.title")}
              </h2>
            </div>
          </Reveal>

          <div className="relative">
            <div className="hidden md:block absolute top-12 left-0 right-0 h-px bg-border" />
            <div className="grid gap-10 md:grid-cols-3">
              {layers.map((l, i) => (
                <Reveal key={l.n} delay={i * 120}>
                  <div className="relative">
                    <div className="hidden md:flex items-center justify-center h-24 w-24 rounded-full bg-background text-foreground font-display text-2xl mb-8 relative z-10 ring-8 ring-bone">
                      {l.n}
                    </div>
                    <p className="md:hidden eyebrow mb-3">{l.mes ? `${l.mes} · ` : ""}{t("layers.layerLabel")} {l.n}</p>
                    {l.mes && <p className="hidden md:block eyebrow text-teal-deep mb-2">{l.mes}</p>}
                    <h3 className="font-display text-3xl text-ink mb-4">{l.t}</h3>
                    <p className="text-muted-foreground leading-relaxed">{l.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal>
            <div className="mt-20 md:mt-24 max-w-3xl">
              <h3 className="font-display italic text-3xl md:text-4xl text-ink mb-4 text-balance">
                {t("layers.outroTitle")}
              </h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t("layers.outro")}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3 · Pruébalo — Simulador de impacto */}
      <ImpactSimulator />

      {/* 4 · Marcas por gama (gancho SAT) */}
      <MarcasPorGama />


      {/* 5 · Cómo — App nativa de IA */}
      <div id="como-funciona">
        <NativeAppBlock />
      </div>

      {/* 6 · Experiencia y capacidad — KPIs + Ecosistemas */}
      <EscalaOperativa />

      {/* 7 · Detalle plegable — Beneficios (coberturas) */}
      <section className="py-24 md:py-32 bg-secondary">
        <div className="container-tight">
          <Reveal>
            <div className="max-w-3xl mb-8">
              <p className="eyebrow mb-4">{t("benefits.eyebrow")}</p>
              <h2 className="heading-display text-ink text-[clamp(2.25rem,6.5vw,5.5rem)] text-balance">
                {t("benefits.title")}
              </h2>
              <p className="mt-6 text-lg text-muted-foreground">
                {t("benefits.subtitle")}
              </p>
            </div>
          </Reveal>

          <Reveal>
            <button
              onClick={() => setShowBenefits((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-bone px-6 py-3 text-sm font-medium text-ink hover:border-ink transition-all"
            >
              {showBenefits
                ? t("benefits.hide", { defaultValue: "Ocultar coberturas" })
                : t("benefits.show", { defaultValue: `Ver todas las coberturas (${benefits.length})` })}
              <ChevronRight className={`h-4 w-4 transition-transform ${showBenefits ? "rotate-90" : ""}`} />
            </button>
          </Reveal>

          {showBenefits && (
            <>
              <div className="mt-8 grid gap-0.5 bg-border border border-border rounded-3xl overflow-hidden md:grid-cols-2 lg:grid-cols-3">
                {benefits.map((b, i) => {
                  const Icon = benefitIcons[i] ?? Shield;
                  return (
                    <div key={b.t} className="bg-bone p-8 h-full group hover:bg-card transition-colors">
                      <Icon className="h-6 w-6 text-teal mb-6" strokeWidth={1.5} />
                      <h3 className="font-display text-xl text-ink mb-2">{b.t}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{b.d}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-12 max-w-3xl">
                <p className="font-display italic text-2xl md:text-3xl text-ink text-balance">
                  {t("benefits.outro")}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 8 · CTA final — Apple-style */}
      <section className="py-24 md:py-40 bg-white">
        <div className="container-tight">
          <Reveal>
            <div className="text-center max-w-4xl mx-auto px-4">
              <h2 className="heading-display text-ink text-[clamp(2.25rem,6.5vw,5.5rem)] max-w-4xl mx-auto text-balance">
                {t("finalCta.title")}
              </h2>
              <p className="mt-6 md:mt-8 text-lg md:text-xl text-ink/55 max-w-2xl mx-auto text-balance leading-relaxed">
                {t("finalCta.subtitle")}
              </p>
              <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/wg-network/inscripcion"
                  className="group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[15px] font-medium text-bone hover:bg-ink/90 transition-colors"
                >
                  {t("finalCta.cta")}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link
                  to="/wg-network#como-funciona"
                  className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-ink/70 hover:text-ink transition-colors px-4 py-3.5"
                >
                  Saber más
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
};

export default WGNetwork;
