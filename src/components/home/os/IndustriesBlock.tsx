import { Reveal } from "@/components/site/Reveal";
import { Factory, Shield, ShoppingBag, Bike, Zap, Cpu, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const ICONS = [Factory, ShoppingBag, Shield, Cpu, Bike, Zap];

export const IndustriesBlock = () => {
  const { t } = useTranslation("home-industries");
  const items = t("items", { returnObjects: true }) as {
    name: string;
    matters: string;
    apply: string;
    achieve: string;
    clients: string;
    closing: string;
  }[];
  const [active, setActive] = useState(0);
  const I = items[active];
  const Icon = ICONS[active];
  return (
    <section className="py-28 md:py-36 bg-background">
      <div className="container-tight">
        <Reveal>
          <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance">
            <Trans
              i18nKey="title"
              t={t}
              components={[<span key="0" className="text-teal italic" />]}
            />
          </h2>
          <p className="mt-6 max-w-2xl text-muted-foreground text-lg leading-relaxed">
            {t("lead")}
          </p>
        </Reveal>

        <div className="mt-16 grid lg:grid-cols-12 gap-8">
          {/* Tabs verticales */}
          <Reveal className="lg:col-span-4">
            <div className="flex flex-col border border-foreground/10 rounded-2xl overflow-hidden bg-ink-elevated">
              {items.map((ind, i) => {
                const I2 = ICONS[i];
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
                    {t("mattersLabel")}
                  </p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{I.matters}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal mb-3">
                    {t("applyLabel")}
                  </p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{I.apply}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal mb-3">
                    {t("achieveLabel")}
                  </p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{I.achieve}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-foreground/10">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-2">
                  {t("clientsLabel")}
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
          <p className="mt-16 font-display text-2xl md:text-3xl text-foreground/85 max-w-3xl mx-auto text-center text-balance leading-snug">
            <Trans
              i18nKey="synthesis"
              t={t}
              components={[<span key="0" className="text-teal" />]}
            />
          </p>
        </Reveal>
      </div>
    </section>
  );
};
