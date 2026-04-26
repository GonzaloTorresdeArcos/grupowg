import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/site/Reveal";

interface ClosingBlockProps {
  lineOne?: string;
  lineTwo?: string;
}

export const ClosingBlock = ({ lineOne, lineTwo }: ClosingBlockProps = {}) => {
  const { t } = useTranslation("home-closing");
  const finalLineOne = lineOne ?? t("default.lineOne");
  const finalLineTwo = lineTwo ?? t("default.lineTwo");
  return (
    <section className="closing-padding bg-ink text-bone relative overflow-hidden border-t border-foreground/5">
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--teal)/0.18),transparent_60%)]" />
      <div className="container-tight relative text-center">
        <Reveal>
          <h2 className="heading-display text-bone text-4xl md:text-6xl lg:text-7xl max-w-4xl mx-auto text-balance leading-[1.05]">
            {finalLineOne}
            <br />
            <span className="text-teal italic">{finalLineTwo}</span>
          </h2>
        </Reveal>
        <Reveal delay={200}>
          <div className="mt-12 flex flex-wrap gap-3 justify-center">
            <Link to="/contacto" className="btn-teal">
              {t("ctaPrimary")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link to="/modelo" className="btn-on-dark">
              {t("ctaSecondary")}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
