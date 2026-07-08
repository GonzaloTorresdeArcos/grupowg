/** Economía media por operación de venta del colaborador (€/ud). Ajustable. */
export const AVG_MARGIN_EUR = {
  parts: 12,      // margen medio por componente/repuesto (POR CONFIRMAR)
  equipment: 60,  // margen medio por equipo vendido (Producto Vestel)
  warranty: 6,    // comisión media por garantía (CARE) vendida
} as const;

export type SaleKind = keyof typeof AVG_MARGIN_EUR;
