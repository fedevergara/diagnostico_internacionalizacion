export function normalizeItems(items) {
  let eje = null, objetivo = null, indicador = null;

  return items.map((it) => {
    if (it.eje) eje = it.eje;
    if (it.objetivo) objetivo = it.objetivo;
    if (it.indicador) indicador = it.indicador;

    return {
      ...it,
      id: String(it.row),      // id estable
      eje, objetivo, indicador // ya no null
    };
  });
}
