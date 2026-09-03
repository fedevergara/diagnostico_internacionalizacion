import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const CHART_LABELS = {
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
  "Participación en actividades de interculturalidad":
    "Interculturalidad",
  "Oferta de microcertificaciones": "Microcertificaciones",
  "Perfil global de egreso": "Perfil global",
  "Certificación de estudiantes en segunda lengua":
    "Estudiantes: segunda lengua",
  "Certificación profesores en segunda lengua":
    "Profesores: segunda lengua",
  "Formación docente en competencias globales":
    "Competencias globales",
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
  "Registros conjuntos de secretos empresariales":
    "Secretos empresariales",
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

const ANSWER_LABELS = {
  0: "Sin responder",
  1: "Bajo",
  2: "Medio",
  3: "Alto",
};

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function RadarEje({
  titulo,
  indicators,
  summaryIndicators = indicators,
  answers,
  notApplicableIds,
  color = "#01602D",
  forPdf = false,
}) {
  const labels = indicators.map((it) => it.nombre);
  const values = indicators.map((it) => answers[it.id] ?? 0);
  const isDense = labels.length >= 10;
  const maxCharsPerLine = forPdf ? (isDense ? 17 : 20) : (isDense ? 17 : 21);
  const pointLabelSize = forPdf ? (isDense ? 9 : 10) : (isDense ? 9 : 10);
  const chartPadding = forPdf ? (isDense ? 20 : 16) : (isDense ? 20 : 16);
  const pointLabelPadding = forPdf ? 4 : 0;
  const showsNotApplicableCount = titulo === "Gestión de Capacidades";
  const summaryEntries = summaryIndicators.map((it) => {
    const isNotApplicable = notApplicableIds?.has(it.id) ?? false;
    const value = answers[it.id] ?? 0;
    const answer = isNotApplicable ? "No aplica" : ANSWER_LABELS[value];
    const answerKey = isNotApplicable ? "not-applicable" : `level-${value}`;

    return { id: it.id, name: it.nombre, answer, answerKey };
  });
  const summaryCounts = summaryEntries.reduce(
    (counts, entry) => {
      counts[entry.answerKey] += 1;
      return counts;
    },
    {
      "level-0": 0,
      "level-1": 0,
      "level-2": 0,
      "level-3": 0,
      "not-applicable": 0,
    }
  );

  const wrapLabel = (label) => {
    const displayLabel = CHART_LABELS[label] ?? String(label);
    const words = displayLabel.split(" ");
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
  };

  const data = {
    labels,
    datasets: [
      {
        label: titulo,
        data: values,
        backgroundColor: hexToRgba(color, 0.22),
        borderColor: color,
        borderWidth: 2,
        pointBackgroundColor: color,
        pointBorderColor: "#ffffff",
        pointRadius: 2.6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: {
      padding: {
        top: chartPadding,
        bottom: chartPadding,
        left: chartPadding,
        right: chartPadding,
      },
    },
    scales: {
      r: {
        suggestedMin: 0,
        suggestedMax: 3,
        ticks: {
          stepSize: 1,
          color: "#26402f",
          backdropColor: "rgba(255,255,255,0.7)",
        },
        angleLines: {
          color: hexToRgba(color, 0.18),
        },
        grid: {
          color: hexToRgba(color, 0.18),
        },
        pointLabels: {
          color: "#1b3123",
          font: { size: pointLabelSize, weight: 600 },
          padding: pointLabelPadding,
          callback: (label) => wrapLabel(label),
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#102319",
        titleColor: "#ecfff2",
        bodyColor: "#ecfff2",
      },
    },
  };

  return (
    <div
      className="panel radar-card"
      style={{
        "--radar-color": color,
        "--radar-color-soft": hexToRgba(color, 0.08),
      }}
    >
      <h4 className="radar-title" style={{ color }}>
        {titulo}
      </h4>
      <div className="radar-canvas">
        <Radar data={data} options={options} />
      </div>

      <section className="responses-summary" aria-label={`Resumen de ${titulo}`}>
        <div className="responses-summary-header">
          <h5>Resumen de respuestas</h5>
          <p>
            Bajo {summaryCounts["level-1"]} · Medio {summaryCounts["level-2"]}
            {" · "}Alto {summaryCounts["level-3"]} · Sin responder{" "}
            {summaryCounts["level-0"]}
            {showsNotApplicableCount && (
              <>
                {" · "}No aplica {summaryCounts["not-applicable"]}
              </>
            )}
          </p>
        </div>

        <div className="responses-summary-grid">
          {summaryEntries.map((entry) => (
            <div className="response-summary-item" key={entry.id}>
              <span className="response-summary-name">{entry.name}</span>
              <span
                className={`response-summary-value is-${entry.answerKey}`}
              >
                {entry.answer}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
