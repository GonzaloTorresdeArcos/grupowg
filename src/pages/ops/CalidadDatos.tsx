import { ModuloEnDiseno } from "@/components/ops/ModuloEnDiseno";

const CalidadDatos = () => (
  <ModuloEnDiseno
    titulo="Calidad de datos"
    fase="llega en Fase 3 del plan V2"
    descripcion={[
      "Cobertura y completitud de cada campo crítico de ops_fact_ot (fechas, canal, código postal, importes, técnico asignado).",
      "Reglas de validación con severidad y trazabilidad: qué KPIs quedan limitados por cada hueco de dato.",
      "Histórico de importaciones y evolución de la calidad mes a mes, para saber si el dato mejora o se degrada.",
    ]}
  />
);

export default CalidadDatos;
