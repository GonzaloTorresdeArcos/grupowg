import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AnniversarySection } from "./AnniversarySection";

/**
 * Checklist automático de ritmo tipográfico para la sección "50 ANIVERSARIO".
 *
 * Como JSDOM no resuelve media queries de Tailwind (no hay layout real),
 * validamos que las CLASES responsive de leading/spacing estén presentes
 * para cada breakpoint relevante (320 / 375 / 768 / 1536). Esto garantiza
 * que cualquier futura edición que rompa el ritmo (p.ej. cambiar
 * leading-[1.6] por leading-relaxed, o eliminar la variante md:) sea
 * detectada por el test antes de llegar a producción.
 */

const BREAKPOINTS = [
  { width: 320, label: "móvil pequeño (320px)" },
  { width: 375, label: "móvil estándar (375px)" },
  { width: 768, label: "tablet (768px)" },
  { width: 1536, label: "escritorio amplio (1536px)" },
] as const;

// Mapeo de breakpoint -> prefijos Tailwind activos (mobile-first)
const activePrefixes = (width: number): string[] => {
  const prefixes = ["base"]; // sin prefijo
  if (width >= 768) prefixes.push("md");
  if (width >= 1024) prefixes.push("lg");
  return prefixes;
};

describe("AnniversarySection — checklist de breakpoints", () => {
  const setup = () => {
    const { container } = render(<AnniversarySection />);
    const eyebrow = container.querySelector("p.eyebrow") as HTMLElement;
    const heading = container.querySelector("h2") as HTMLElement;
    const paragraphs = container.querySelectorAll("div.space-y-4 > p");
    const quote = container.querySelector("p.italic") as HTMLElement;
    return { eyebrow, heading, paragraphs, quote };
  };

  it("renderiza los elementos clave de la sección", () => {
    const { eyebrow, heading, paragraphs, quote } = setup();
    expect(eyebrow).toBeInTheDocument();
    expect(eyebrow.textContent).toMatch(/50 aniversario/i);
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toMatch(/50 años resolviendo/i);
    expect(paragraphs.length).toBe(2);
    expect(quote.textContent).toMatch(/seguir respondiendo/i);
  });

  it("eyebrow mantiene leading-none (ritmo plano) en todos los breakpoints", () => {
    const { eyebrow } = setup();
    BREAKPOINTS.forEach(({ label }) => {
      expect(eyebrow.className, `eyebrow leading-none debe estar activo en ${label}`).toContain(
        "leading-none",
      );
    });
  });

  describe.each(BREAKPOINTS)("$label", ({ width }) => {
    const prefixes = activePrefixes(width);
    const isMd = width >= 768;

    it("título tiene leading responsive (1.05 móvil → 1.02 desde md)", () => {
      const { heading } = setup();
      expect(heading.className).toContain("leading-[1.05]");
      expect(heading.className).toContain("md:leading-[1.02]");
      // Comprobamos que el prefijo correcto está disponible en este viewport
      const expected = isMd ? "md:leading-[1.02]" : "leading-[1.05]";
      expect(prefixes.some((p) => p === "md") === isMd).toBe(true);
      expect(heading.className).toContain(expected.replace("md:", isMd ? "md:" : ""));
    });

    it("párrafos tienen leading responsive (1.65 móvil → 1.6 desde md)", () => {
      const { paragraphs } = setup();
      const wrapper = paragraphs[0].parentElement as HTMLElement;
      expect(wrapper.className).toContain("leading-[1.65]");
      expect(wrapper.className).toContain("md:leading-[1.6]");
    });

    it("cita en cursiva mantiene leading responsive (1.2 → 1.15)", () => {
      const { quote } = setup();
      expect(quote.className).toContain("leading-[1.2]");
      expect(quote.className).toContain("md:leading-[1.15]");
    });

    it("el espaciado vertical entre bloques es responsive", () => {
      const { eyebrow, paragraphs, quote } = setup();
      // eyebrow → título: mb-3 móvil, mb-4 md+
      expect(eyebrow.className).toContain("mb-3");
      expect(eyebrow.className).toContain("md:mb-4");
      // título → párrafos: mt-6 móvil, mt-8 md+
      const wrapper = paragraphs[0].parentElement as HTMLElement;
      expect(wrapper.className).toContain("mt-6");
      expect(wrapper.className).toContain("md:mt-8");
      // párrafos → cita: mt-8 móvil, mt-10 md+
      expect(quote.className).toContain("mt-8");
      expect(quote.className).toContain("md:mt-10");
    });

    it("tamaños tipográficos escalan correctamente por breakpoint", () => {
      const { heading, paragraphs, quote } = setup();
      // Título: 4xl base, 5xl md, 6xl lg
      expect(heading.className).toContain("text-4xl");
      expect(heading.className).toContain("md:text-5xl");
      expect(heading.className).toContain("lg:text-6xl");
      // Párrafos: base móvil, lg desde md
      const wrapper = paragraphs[0].parentElement as HTMLElement;
      expect(wrapper.className).toContain("text-base");
      expect(wrapper.className).toContain("md:text-lg");
      // Cita: 2xl base, 3xl md
      expect(quote.className).toContain("text-2xl");
      expect(quote.className).toContain("md:text-3xl");
    });
  });

  it("el ancho máximo del cuerpo de texto está limitado a max-w-xl para mantener legibilidad", () => {
    const { paragraphs, quote } = setup();
    const wrapper = paragraphs[0].parentElement as HTMLElement;
    expect(wrapper.className).toContain("max-w-xl");
    expect(quote.className).toContain("max-w-xl");
  });
});
