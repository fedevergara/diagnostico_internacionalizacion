// Configuración compartida de los radares: la usan la vista en pantalla
// (RadarEje) y el generador de PDF (pdfReport), para que ambos muestren
// exactamente la misma gráfica.

export const CHART_LABELS = {
  "Estudiantes participantes en una red": "Estudiantes en redes",
  "Profesores participantes en una red": "Profesores en redes",
  "Convenios con productos y resultados": "Convenios con resultados",
  "Participación en espacios de interacción": "Espacios de interacción",
  "Movilidad saliente de estudiantes": "Movilidad estudiantil saliente",
  "Movilidad estudiantil en otras lenguas": "Estudiantes: otras lenguas",
  "Movilidad entrante de estudiantes": "Movilidad estudiantil entrante",
  "Movilidad saliente de profesores": "Movilidad profesoral saliente",
  "Movilidad profesoral en otras lenguas": "Profesores: otras lenguas",
  "Asistencia de profesores a eventos": "Profesores en eventos",
  "Movilidad entrante de profesores": "Movilidad profesoral entrante",
  "Movilidad saliente de personal administrativo":
    "Movilidad administrativa saliente",
  "Movilidad entrante de personal administrativo":
    "Movilidad administrativa entrante",
  "Participación en actividades de interculturalidad": "Interculturalidad",
  "Oferta de microcertificaciones": "Microcertificaciones",
  "Perfil global de egreso": "Perfil global",
  "Certificación de estudiantes en segunda lengua":
    "Estudiantes: segunda lengua",
  "Certificación profesores en segunda lengua": "Profesores: segunda lengua",
  "Formación docente en competencias globales": "Competencias globales",
  "Estrategias de internacionalización en el aula":
    "Internacionalización en aula",
  "Armonización de planes de estudios": "Planes armonizados",
  "Referenciación internacional de resultados de aprendizaje":
    "Referentes internacionales",
  "Acciones de diplomacia científica": "Diplomacia científica",
  "Artículos con investigadores extranjeros": "Artículos internacionales",
  "Libros con investigadores extranjeros": "Libros internacionales",
  "Capítulos de libros con investigadores extranjeros":
    "Capítulos internacionales",
  "Registros conjuntos de patentes": "Patentes conjuntas",
  "Registros conjuntos de software": "Software conjunto",
  "Registros conjuntos de secretos empresariales": "Secretos empresariales",
  "Registros conjuntos de empresas": "Empresas conjuntas",
  "Desarrollo conjunto de prototipos": "Prototipos conjuntos",
  "Desarrollo conjunto de obras artísticas": "Obras artísticas conjuntas",
  "Proyectos de cooperación": "Cooperación",
  "Estudios de referenciación": "Referenciación",
  "Tecnologías aplicadas a la docencia": "Tecnología docente",
  "Responsables de la internacionalización":
    "Responsables de internacionalización",
  "Aplicación de lineamientos internacionalización":
    "Lineamientos de internacionalización",
  "Acceso a servicios de bienestar": "Servicios de bienestar",
  "Funcionamiento de un sistema de información": "Sistema de información",
  "Realización de estudios de impacto": "Estudios de impacto",
};

export const ANSWER_LABELS = {
  0: "Sin responder",
  1: "Bajo",
  2: "Medio",
  3: "Alto",
};

export const CHART_FONT_FAMILY = "Roboto, Helvetica, Arial, sans-serif";

export function hexToRgba(hex, alpha) {
  const bigint = Number.parseInt(hex.replace("#", ""), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function wrapLabel(label, maxCharsPerLine) {
  const words = (CHART_LABELS[label] ?? String(label)).split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

/**
 * Resumen por eje: respuesta de cada indicador (incluye los marcados como
 * "No aplica") y el conteo por categoría.
 */
export function summarizeIndicators(indicators, answers, notApplicableIds) {
  const counts = {
    "level-0": 0,
    "level-1": 0,
    "level-2": 0,
    "level-3": 0,
    "not-applicable": 0,
  };

  const entries = indicators.map((it) => {
    const isNotApplicable = notApplicableIds?.has(it.id) ?? false;
    const value = answers[it.id] ?? 0;
    const answerKey = isNotApplicable ? "not-applicable" : `level-${value}`;
    counts[answerKey] += 1;

    return {
      id: it.id,
      name: it.nombre,
      value: isNotApplicable ? null : value,
      answer: isNotApplicable ? "No aplica" : ANSWER_LABELS[value],
      answerKey,
    };
  });

  return { entries, counts };
}

/**
 * Config de Chart.js para el radar de un eje.
 * `fontFamily` permite forzar una fuente determinista (p. ej. en el PDF).
 */
export function buildRadarConfig({
  titulo,
  indicators,
  answers,
  color,
  fontFamily = CHART_FONT_FAMILY,
  labelSize,
}) {
  const isDense = indicators.length >= 10;
  const maxCharsPerLine = isDense ? 17 : 21;
  const pointLabelSize = labelSize ?? (isDense ? 9 : 10);
  const chartPadding = isDense ? 20 : 16;

  return {
    type: "radar",
    data: {
      labels: indicators.map((it) => it.nombre),
      datasets: [
        {
          label: titulo,
          data: indicators.map((it) => answers[it.id] ?? 0),
          backgroundColor: hexToRgba(color, 0.22),
          borderColor: color,
          borderWidth: 2,
          pointBackgroundColor: color,
          pointBorderColor: "#ffffff",
          pointRadius: 2.6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: chartPadding },
      scales: {
        r: {
          min: 0,
          max: 3,
          ticks: {
            stepSize: 1,
            color: "#595959",
            backdropColor: "rgba(255,255,255,0.75)",
            font: { family: fontFamily, size: pointLabelSize },
          },
          angleLines: { color: hexToRgba(color, 0.18) },
          grid: { color: hexToRgba(color, 0.18) },
          pointLabels: {
            color: "#262626",
            font: { family: fontFamily, size: pointLabelSize, weight: 600 },
            callback: (label) => wrapLabel(label, maxCharsPerLine),
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#262626",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          titleFont: { family: fontFamily },
          bodyFont: { family: fontFamily },
          callbacks: {
            label: (ctx) => ` ${ANSWER_LABELS[ctx.raw] ?? ctx.raw}`,
          },
        },
      },
    },
  };
}
