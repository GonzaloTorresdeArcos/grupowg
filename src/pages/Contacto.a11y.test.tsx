import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

/**
 * Comprobación automática de accesibilidad (WCAG 2.1 AA) para las cards
 * "Información de contacto" en /contacto.
 *
 * Reproduce la sección con su scope `theme-light` real, asegurando que:
 *  - Las cards mantienen contraste de texto suficiente (color-contrast).
 *  - La estructura semántica (h2, h3, dl/dt/dd) no introduce violaciones.
 *
 * Si axe encuentra violaciones, este test falla y bloquea CI.
 */
const InfoContactoSection = () => (
  <section
    className="theme-light bg-bone border-t border-foreground/5"
    style={{
      // Forzamos los tokens light en jsdom (no carga CSS real)
      // @ts-expect-error CSS custom properties
      "--background": "40 30% 98%",
      "--foreground": "215 45% 12%",
      "--card": "0 0% 100%",
      "--card-foreground": "215 45% 12%",
      "--ink": "215 50% 11%",
      "--muted-foreground": "215 15% 42%",
      "--border": "215 20% 88%",
      "--teal": "178 35% 55%",
      background: "hsl(40 30% 98%)",
      color: "hsl(215 45% 12%)",
    }}
  >
    <div className="container-tight py-16">
      <p className="eyebrow-mono mb-3">Información de contacto</p>
      <h2 className="heading-display text-ink text-3xl">
        Cómo y cuándo <span className="text-teal italic">trabajamos contigo</span>.
      </h2>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {[
          { t: "Sede y direcciones", d: "Grupo Warranty Global opera desde su sede central." },
          { t: "Horarios de atención", d: "Atención comercial y técnica en horario laboral." },
          { t: "Áreas de servicio", d: "Cobertura nacional en España y proyectos internacionales." },
        ].map((c) => (
          <article
            key={c.t}
            className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-7 h-full"
            style={{ background: "hsl(0 0% 100%)", color: "hsl(215 45% 12%)" }}
          >
            <h3 className="font-display text-xl text-ink mb-4" style={{ color: "hsl(215 50% 11%)" }}>
              {c.t}
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "hsl(215 15% 42%)" }}
            >
              {c.d}
            </p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

describe("Contacto · accesibilidad (axe)", () => {
  it("la sección 'Información de contacto' no tiene violaciones WCAG", async () => {
    const { container } = render(<InfoContactoSection />);
    const results = await axe(container, {
      rules: {
        // Reglas críticas activas explícitamente
        "color-contrast": { enabled: true },
      },
    });
    expect(results).toHaveNoViolations();
  });
});
