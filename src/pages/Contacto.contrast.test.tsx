import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Comprobación visual / de regresión: la sección "Información de contacto"
 * usa fondo claro (bg-bone) por lo que DEBE tener la clase `theme-light`
 * para que las cards (`bg-card`, `text-ink`, `text-muted-foreground`)
 * resuelvan tokens claros y mantengan contraste legible.
 *
 * Además, cada card debe declarar `bg-card text-card-foreground` juntos
 * para que el par semántico garantice contraste en cualquier scope.
 */
describe("Contacto · contraste de cards 'Información de contacto'", () => {
  const source = readFileSync(
    resolve(__dirname, "Contacto.tsx"),
    "utf-8",
  );

  it("la sección 'Información de contacto' aplica theme-light", () => {
    // Localizamos la sección por su fondo bone + borde superior y verificamos theme-light
    const sectionRegex =
      /<section className="theme-light bg-bone border-t border-foreground\/5">/;
    expect(source).toMatch(sectionRegex);
  });

  it("todas las cards usan el par bg-card + text-card-foreground", () => {
    const cardMatches = source.match(
      /rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-7 h-full/g,
    );
    // Hay 3 cards: Sede, Horarios y Áreas de servicio
    expect(cardMatches?.length).toBe(3);
  });
});
