import { Reveal } from "@/components/site/Reveal";
import {
  CalendarClock, Mic, Camera, MapPinned, PenLine, Send, Archive,
  Wrench, PackagePlus, ShieldCheck, Banknote, HeartHandshake,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const icons = [
  CalendarClock, Mic, Camera, MapPinned, PenLine, Send, Archive,
  Wrench, PackagePlus, ShieldCheck, Banknote, HeartHandshake,
];

export const NativeAppBlock = () => {
  const { t } = useTranslation("wg-network");
  const items = t("app.items", { returnObjects: true }) as string[];

  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container-tight">
        <Reveal>
          <div className="max-w-3xl mb-16">
            <p className="eyebrow mb-4">{t("app.eyebrow")}</p>
            <h2 className="heading-display text-ink text-4xl md:text-6xl text-balance">
              {t("app.title")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("app.subtitle")}</p>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((line, i) => {
            const Icon = icons[i] ?? Wrench;
            return (
              <Reveal key={i} delay={i * 40}>
                <div className="h-full rounded-2xl border border-border bg-card p-6 hover:border-teal transition-colors">
                  <Icon className="h-6 w-6 text-teal mb-4" strokeWidth={1.5} />
                  <p className="text-ink leading-relaxed">{line}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};
