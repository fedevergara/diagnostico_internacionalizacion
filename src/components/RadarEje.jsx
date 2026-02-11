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

// Requisito: registrar módulos usados por el chart (si no, no renderiza)
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function RadarEje({ titulo, indicators, answers }) {
  const labels = indicators.map((it) => it.nombre); // nombre corto
  const values = indicators.map((it) => answers[it.id] ?? 0); // 0 si no respondió

  const wrapLabel = (label) => {
    const maxCharsPerLine = 28;
    const words = String(label).split(" ");
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
    return lines.slice(0, 2);
  };

  const data = {
    labels,
    datasets: [
      {
        label: titulo,
        data: values,
        // no definimos colores para mantenerlo simple; Chart.js usa defaults
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // importante para exportar luego a PDF sin “capturas en blanco”
    scales: {
      r: {
        suggestedMin: 0,
        suggestedMax: 3, // tus valores son 1–3 (y 0 si falta)
        ticks: { stepSize: 1 },
        pointLabels: {
          font: { size: 10 },
          callback: (label) => wrapLabel(label),
        },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
      <h4 style={{ margin: "0 0 8px 0" }}>{titulo}</h4>
      <div style={{ height: 360 }}>
        <Radar data={data} options={options} />
      </div>
    </div>
  );
}
