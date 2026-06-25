/**
 * Calcula el churn_label (US07 / dataset APF3) a partir de la fecha de la
 * última interacción registrada. 1 = cliente en riesgo de abandono (inactivo
 * más de CHURN_INACTIVITY_DAYS días), 0 = cliente activo.
 */
function calcularChurnLabel(fechaUltimaInteraccion, diasInactividad = 30) {
  if (!fechaUltimaInteraccion) return 1; // nunca volvió tras el registro
  const ahora = new Date();
  const diffMs = ahora - new Date(fechaUltimaInteraccion);
  const diffDias = diffMs / (1000 * 60 * 60 * 24);
  return diffDias > diasInactividad ? 1 : 0;
}

module.exports = { calcularChurnLabel };
