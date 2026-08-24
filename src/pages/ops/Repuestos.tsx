import { ModuloEnDiseno } from "@/components/ops/ModuloEnDiseno";

const Repuestos = () => (
  <ModuloEnDiseno
    titulo="Repuestos & Stock"
    fase="llega en Fase 4 del plan V2"
    descripcion={[
      "Disponibilidad y rotación de repuestos por almacén, gama y marca, con cobertura frente a la demanda real de OTs.",
      "OTs bloqueadas en espera de pieza: volumen, antigüedad y referencias que más backlog generan.",
      "Inmovilizado, obsolescencia y política de stock mínimo por delegación.",
    ]}
  />
);

export default Repuestos;
