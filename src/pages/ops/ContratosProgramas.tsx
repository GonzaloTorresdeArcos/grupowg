import { ModuloEnDiseno } from "@/components/ops/ModuloEnDiseno";

/**
 * INTELIGENCIA CONTRACTUAL · Contratos & Programas.
 * Ruta reservada: la navegación contractual completa (instrumentos, cadena
 * documental, precedencias) se construye después. Hoy no muestra ningún dato
 * para no anticipar afirmaciones contractuales.
 */
export const ContratosProgramas = () => (
  <div className="max-w-6xl mx-auto px-4 md:px-10 py-8">
    <ModuloEnDiseno
      titulo="Contratos & Programas"
      fase="Inteligencia contractual"
      descripcion={[
        "Censo de instrumentos contractuales y su alcance por programa.",
        "Cadena documental y estado de evidencia de cada documento.",
        "Obligaciones representadas y su preparación para ser evaluadas.",
        "Mientras tanto, la lectura por programa está disponible en Performance Real.",
      ]}
    />
  </div>
);

export default ContratosProgramas;
