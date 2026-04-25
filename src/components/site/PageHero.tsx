import { Reveal } from "./Reveal";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

interface PageHeroProps {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  cta?: { label: string; to: string };
}

export const PageHero = ({ eyebrow, title, subtitle, cta }: PageHeroProps) => (
  <section className="relative pt-36 md:pt-44 pb-20 md:pb-28 bg-background overflow-hidden">
    <div className="absolute inset-0 bg-grid bg-grid-fade opacity-30 pointer-events-none" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--teal)/0.08),transparent_60%)] pointer-events-none" />
    <div className="container-tight relative">
      <Reveal>
        <p className="eyebrow-mono mb-6">{eyebrow}</p>
        <h1 className="heading-display text-foreground text-5xl md:text-7xl max-w-4xl text-balance leading-[1.02]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-8 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        )}
        {cta && (
          <div className="mt-10">
            <Link to={cta.to} className="btn-teal">
              {cta.label}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </Reveal>
    </div>
  </section>
);
