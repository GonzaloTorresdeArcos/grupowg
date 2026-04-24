import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

export const SimplePage = ({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children?: React.ReactNode;
}) => (
  <section className="pt-40 pb-32 bg-bone">
    <div className="container-tight">
      <Reveal>
        <p className="eyebrow mb-4">{eyebrow}</p>
        <h1 className="heading-display text-ink text-5xl md:text-7xl text-balance max-w-4xl">
          {title}
        </h1>
        {intro && <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl">{intro}</p>}
      </Reveal>
      {children && <div className="mt-16">{children}</div>}
      <div className="mt-20">
        <Link to="/contacto" className="btn-primary">
          Contactar
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </section>
);
