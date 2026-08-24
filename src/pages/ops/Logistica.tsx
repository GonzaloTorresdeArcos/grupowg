import { ModuloEnDiseno } from "@/components/ops/ModuloEnDiseno";

const Logistica = () => (
  <ModuloEnDiseno
    titulo="Logística & Expediciones"
    fase="llega en Fase 4 del plan V2"
    descripcion={[
      "Trazabilidad de expediciones entre HUB Central, delegaciones y red SAT externa: envíos, recepciones y tiempos de tránsito.",
      "Impacto de la logística sobre el SLA: cuántos días de la vida de una OT se consumen esperando material en tránsito.",
      "Incidencias de expedición (extravíos, devoluciones, entregas fallidas) y su coste asociado.",
    ]}
  />
);

export default Logistica;
