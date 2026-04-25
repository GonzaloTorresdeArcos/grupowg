import { describe, it, expect } from "vitest";
import { buildCrumbs, buildBreadcrumbJsonLd, formatSegment } from "./breadcrumbs";

const ORIGIN = "https://grupowg.com";

describe("formatSegment", () => {
  it("devuelve etiqueta conocida del mapa de rutas", () => {
    expect(formatSegment("modelo")).toBe("Modelo");
    expect(formatSegment("wg-network")).toBe("WG Network");
    expect(formatSegment("50-aniversario")).toBe("50 aniversario");
  });

  it("capitaliza segmentos desconocidos separados por guiones", () => {
    expect(formatSegment("foo-bar")).toBe("Foo Bar");
    expect(formatSegment("hola")).toBe("Hola");
  });

  it("maneja cadenas vacías sin romper", () => {
    expect(formatSegment("")).toBe("");
  });
});

describe("buildCrumbs", () => {
  it("devuelve array vacío para la home '/'", () => {
    expect(buildCrumbs("/")).toEqual([]);
  });

  it("devuelve array vacío para cadena vacía", () => {
    expect(buildCrumbs("")).toEqual([]);
  });

  it("genera un único crumb marcado como último para rutas de primer nivel", () => {
    const crumbs = buildCrumbs("/modelo");
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0]).toEqual({ label: "Modelo", to: "/modelo", isLast: true });
  });

  it("genera la cadena correcta para rutas anidadas (/legal/privacidad)", () => {
    const crumbs = buildCrumbs("/legal/privacidad");
    expect(crumbs).toEqual([
      { label: "Legal", to: "/legal", isLast: false },
      { label: "Política de privacidad", to: "/legal/privacidad", isLast: true },
    ]);
  });

  it("genera crumbs para /portal aunque luego se oculten en UI", () => {
    // buildCrumbs es agnóstica a la decisión de mostrar; la ocultación vive en Layout.
    const crumbs = buildCrumbs("/portal");
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0].to).toBe("/portal");
    expect(crumbs[0].isLast).toBe(true);
  });

  it("ignora barras finales vacías", () => {
    expect(buildCrumbs("/modelo/")).toHaveLength(1);
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("incluye siempre 'Inicio' como primer ListItem con position 1", () => {
    const ld = buildBreadcrumbJsonLd([], ORIGIN);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toHaveLength(1);
    expect(ld.itemListElement[0]).toMatchObject({
      "@type": "ListItem",
      position: 1,
      name: "Inicio",
      item: `${ORIGIN}/`,
    });
  });

  it("añade los crumbs a continuación con posiciones secuenciales", () => {
    const crumbs = buildCrumbs("/legal/privacidad");
    const ld = buildBreadcrumbJsonLd(crumbs, ORIGIN);
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[1]).toMatchObject({
      position: 2,
      name: "Legal",
      item: `${ORIGIN}/legal`,
    });
    expect(ld.itemListElement[2]).toMatchObject({
      position: 3,
      name: "Política de privacidad",
      item: `${ORIGIN}/legal/privacidad`,
    });
  });

  it("para la home solo expone el item 'Inicio'", () => {
    const ld = buildBreadcrumbJsonLd(buildCrumbs("/"), ORIGIN);
    expect(ld.itemListElement).toHaveLength(1);
  });
});
