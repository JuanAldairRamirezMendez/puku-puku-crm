/**
 * Convierte un arreglo de objetos planos a texto CSV (sin dependencias externas).
 * Usado para exportar el dataset de segmentación hacia APF3 (Python/scikit-learn).
 */
function arrayToCsv(rows, columnas) {
  if (!rows || rows.length === 0) return columnas.join(',') + '\n';

  const escape = (valor) => {
    if (valor === null || valor === undefined) return '';
    const str = String(valor);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = columnas.join(',');
  const body = rows
    .map((fila) => columnas.map((col) => escape(fila[col])).join(','))
    .join('\n');

  return `${header}\n${body}\n`;
}

module.exports = { arrayToCsv };
