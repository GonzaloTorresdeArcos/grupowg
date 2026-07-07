import { Link } from "react-router-dom";
import { ArrowUpRight, Heart, Shield, Wallet, Stethoscope, BookOpen, PiggyBank, HardHat, FileCheck2, FolderCheck, Package, Wrench, Briefcase, ChevronRight, ArrowDown } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { ImpactSimulator } from "@/components/wg-network/ImpactSimulator";
import { NativeAppBlock } from "@/components/wg-network/NativeAppBlock";
import logo50 from "@/assets/logo-50-light.png";
import networkImg from "@/assets/network.webp";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const benefitIcons = [Shield, Briefcase, Wallet, Stethoscope, Heart, PiggyBank, HardHat, FileCheck2, FolderCheck, Package, Wrench, BookOpen];

type LayerItem = { n: string; t: string; d: string };
type BenefitItem = { t: string; d: string };
type CommitmentItem = { n: string; t: string; d: string };

const WGNetwork = () => {
  const { t } = useTranslation("wg-network");

  useEffect(() => {
    document.title = t("seo.title");
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("seo.description"));
  }, [t]);

  const layers = t("layers.items", { returnObjects: true }) as LayerItem[];
  const benefits = t("benefits.items", { returnObjects: true }) as BenefitItem[];
  const commitments = t("commitments.items", { returnObjects: true }) as CommitmentItem[];
  const heroList = t("hero.list", { returnObjects: true }) as string[];

  return (
    <>
      {/* HERO manifiesto (compacto) */}
      <section className="relative flex items-center bg-background text-foreground overflow-hidden pt-32 pb-16 md:pb-24">
        <img src={networkImg} alt="" width={1600} height={1024} className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />
        <div className="container-tight relative z-10 py-10">
          <Reveal>
            <p className="eyebrow text-teal-soft mb-5">{t("hero.eyebrow")}</p>
            <h1 className="heading-display text-foreground text-[clamp(2.25rem,6.5vw,5.5rem)] max-w-5xl">
              {t("hero.title1")}
              <br />
              <span className="font-normal text-teal">{t("hero.title2")}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg md:text-xl text-foreground/70 leading-relaxed">
              {t("hero.intro")}
            </p>
            <p className="mt-6 font-display italic text-2xl md:text-3xl text-teal">
              {t("hero.manifesto")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#simulador" className="inline-flex items-center gap-2 rounded-full bg-teal px-8 py-4 text-base font-medium text-ink transition-all hover:gap-3 hover:bg-teal-soft">
                {t("hero.cta")}
                <ArrowDown className="h-5 w-5" />
              </a>
              <Link to="/wg-network/inscripcion" className="inline-flex items-center gap-2 rounded-full border border-foreground/20 px-8 py-4 text-base font-medium text-foreground hover:border-foreground transition-all">
                {t("finalCta.cta")}
                <ArrowUpRight className="h-5 w-5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Simulador de impacto — protagonista */}
      <ImpactSimulator />

      {/* App nativa de IA */}
      <NativeAppBlock />



      {/* 3 capas */}
      <section className="py-24 md:py-32 bg-bone">
        <div className="container-tight">
          <Reveal>
            <div className="max-w-3xl mb-16">
              <p className="eyebrow mb-4">{t("layers.eyebrow")}</p>
              <h2 className="heading-display text-ink text-4xl md:text-6xl text-balance">
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
                    <p className="md:hidden eyebrow mb-3">{t("layers.layerLabel")} {l.n}</p>
                    <h3 className="font-display text-3xl text-ink mb-4">{l.t}</h3>
                    <p className="text-muted-foreground leading-relaxed">{l.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-24 md:py-32 bg-secondary">
        <div className="container-tight">
          <Reveal>
            <div className="max-w-3xl mb-16">
              <p className="eyebrow mb-4">{t("benefits.eyebrow")}</p>
              <h2 className="heading-display text-ink text-4xl md:text-6xl text-balance">
                {t("benefits.title")}
              </h2>
              <p className="mt-6 text-lg text-muted-foreground">
                {t("benefits.subtitle")}
              </p>
            </div>
          </Reveal>

          <div className="grid gap-px bg-border border border-border rounded-3xl overflow-hidden md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b, i) => {
              const Icon = benefitIcons[i] ?? Shield;
              return (
                <Reveal key={b.t} delay={i * 40}>
                  <div className="bg-bone p-8 h-full group hover:bg-card transition-colors">
                    <Icon className="h-6 w-6 text-teal mb-6" strokeWidth={1.5} />
                    <h3 className="font-display text-xl text-ink mb-2">{b.t}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.d}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal>
            <div className="mt-16 max-w-3xl">
              <p className="font-display italic text-2xl md:text-3xl text-ink text-balance">
                {t("benefits.outro")}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3 compromisos */}
      <section className="relative py-24 md:py-32 bg-background text-foreground overflow-hidden">
        <img src={logo50} alt="" loading="lazy" className="hidden md:block absolute top-0 right-0 w-40 lg:w-56 h-auto opacity-90 z-10" />
        <div className="container-tight relative">
          <Reveal>
            <div className="max-w-3xl mb-16">
              <p className="eyebrow text-teal-soft mb-4">{t("commitments.eyebrow")}</p>
              <h2 className="heading-display text-foreground text-4xl md:text-6xl text-balance">
                {t("commitments.title")}
              </h2>
            </div>
          </Reveal>

          <div className="space-y-px bg-muted/50 border border-border rounded-2xl overflow-hidden">
            {commitments.map((c, i) => (
              <Reveal key={c.n} delay={i * 100}>
                <div className="bg-background p-8 md:p-12 grid gap-6 md:grid-cols-12 items-center group hover:bg-ink-soft transition-colors">
                  <p className="md:col-span-1 font-display text-5xl text-teal">{c.n}</p>
                  <h3 className="md:col-span-4 font-display text-3xl text-foreground">{c.t}</h3>
                  <p className="md:col-span-6 text-foreground/70 leading-relaxed">{c.d}</p>
                  <ChevronRight className="md:col-span-1 h-6 w-6 text-foreground/40 transition-all group-hover:text-teal group-hover:translate-x-1" />
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <p className="mt-12 font-display italic text-xl md:text-2xl text-foreground/80 max-w-3xl mx-auto text-center">
              {t("commitments.outro")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 md:py-32 bg-bone">
        <div className="container-tight">
          <Reveal>
            <div className="rounded-3xl bg-gradient-ink p-10 md:p-20 text-foreground text-center">
              <h2 className="heading-display text-4xl md:text-6xl max-w-3xl mx-auto text-balance">
                {t("finalCta.title")}
              </h2>
              <p className="mt-6 text-foreground/70 max-w-xl mx-auto">
                {t("finalCta.subtitle")}
              </p>
              <Link to="/wg-network/inscripcion" className="mt-10 inline-flex items-center gap-2 rounded-full bg-teal px-8 py-4 text-base font-medium text-ink hover:gap-3 transition-all">
                {t("finalCta.cta")}
                <ArrowUpRight className="h-5 w-5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
};

export default WGNetwork;
