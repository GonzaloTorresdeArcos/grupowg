import { Reveal } from "@/components/site/Reveal";
import { Cog, Eye, Globe, Layers3, Database, Workflow } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

const MODULE_META = [
  { code: "MOD/01", icon: Cog, key: "execute" },
  { code: "MOD/02", icon: Eye, key: "controlTower" },
  { code: "MOD/03", icon: Globe, key: "scale" },
] as const;
const PILLAR_ICONS = [Database, Workflow, Layers3];

export const PlatformBlock = () => {
  const { t } = useTranslation("home-platform");
  const { t: tCommon } = useTranslation("common");
  const capabilities = t("capabilities", { returnObjects: true }) as string[];
  const modules = t("modules", { returnObjects: true }) as {
    sub: string;
    bullets: string[];
    tagline: string;
  }[];
  const coreBullets = t("coreBullets", { returnObjects: true }) as string[];
  const pillars = t("pillars", { returnObjects: true }) as { t: string; d: string }[];

  return (
    <section className="py-28 md:py-36 bg-background">
      <div className="container-tight">
        <Reveal>
          <p className="eyebrow-mono mb-4">{t("eyebrow")}</p>
          <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance leading-[1.05]">
            <Trans
              i18nKey="title"
              t={t}
              components={[<span key="0" className="text-teal italic" />]}
            />
          </h2>
          <p className="mt-8 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            {t("lead")}
          </p>
        </Reveal>

        <Reveal delay={150}>
          <div className="mt-16 rounded-3xl border border-foreground/10 bg-ink-elevated overflow-hidden">
            {/* CAPACIDADES (top — L3) */}
            <div className="grid md:grid-cols-12 gap-6 p-8 md:p-12 border-b border-foreground/10">
              <div className="md:col-span-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal mb-2">
                  {t("capabilitiesLabel")}
                </p>
                <p className="font-mono text-[10px] text-foreground/40">{t("capabilitiesSub")}</p>
              </div>
              <div className="md:col-span-9 grid sm:grid-cols-2 gap-3">
                {capabilities.map((c) => (
                  <div
                    key={c}
                    className="rounded-lg border border-foreground/10 bg-background px-4 py-3 text-sm text-foreground/85 hover:border-teal/40 hover:text-foreground transition-colors flex items-start gap-3"
                  >
                    <span className="text-teal font-mono text-xs pt-0.5">→</span>
                    {c}
                  </div>
                ))}
              </div>
            </div>

            {/* MÓDULOS (middle — L2) */}
            <div className="grid md:grid-cols-12 gap-6 p-8 md:p-12 border-b border-foreground/10">
              <div className="md:col-span-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal mb-2">
                  {t("modulesLabel")}
                </p>
                <p className="font-mono text-[10px] text-foreground/40">{t("modulesSub")}</p>
              </div>
              <div className="md:col-span-9 grid sm:grid-cols-3 gap-4">
                {modules.map((m, i) => {
                  const meta = MODULE_META[i];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={meta.code}
                      className="rounded-xl border border-foreground/10 bg-background p-5 hover:border-teal/40 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-9 w-9 rounded-lg bg-teal/10 border border-teal/30 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-teal" />
                        </div>
                        <span className="font-mono text-[10px] text-foreground/40">{meta.code}</span>
                      </div>
                      <p className="heading-tight text-foreground text-lg">{tCommon(`solutionNames.${meta.key}`)}</p>
                      <p className="mt-1 text-xs text-teal/90 font-medium">{m.sub}</p>
                      <ul className="mt-4 space-y-1.5">
                        {m.bullets.map((b) => (
                          <li key={b} className="text-xs text-foreground/70 leading-relaxed">
                            · {b}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-4 pt-3 border-t border-foreground/10 text-[11px] italic text-foreground/80">
                        {m.tagline}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CORE (base — L1) */}
            <div className="grid md:grid-cols-12 gap-6 p-8 md:p-12 bg-gradient-to-br from-teal/5 to-transparent">
              <div className="md:col-span-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal mb-2">
                  {t("coreLabel")}
                </p>
                <p className="font-mono text-[10px] text-foreground/40">{t("coreSub")}</p>
              </div>
              <div className="md:col-span-9">
                <h3 className="heading-tight text-foreground text-2xl md:text-3xl">
                  {t("coreTitle")}
                </h3>
                <ul className="mt-5 space-y-2 text-foreground/80">
                  {coreBullets.map((b) => (
                    <li key={b} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-teal font-mono">→</span>
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 font-display italic text-teal text-lg">{t("coreClosing")}</p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Cierre cómo funciona */}
        <Reveal delay={300}>
          <div className="mt-12 grid md:grid-cols-3 gap-6 text-center md:text-left">
            {pillars.map((p, i) => {
              const Icon = PILLAR_ICONS[i];
              return (
                <div key={p.t} className="flex md:flex-col items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-teal/10 border border-teal/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-teal" />
                  </div>
                  <div>
                    <p className="font-display text-foreground text-lg">{p.t}</p>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{p.d}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
};
