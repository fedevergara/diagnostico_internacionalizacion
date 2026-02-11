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
    animation: false, // importante para exportar luego a PDF sin “capturas en blanco”
    scales: {
      r: {
        suggestedMin: 0,
        suggestedMax: 3, // tus valores son 1–3 (y 0 si falta)
        ticks: { stepSize: 1 },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
      <h4 style={{ margin: "0 0 8px 0" }}>{titulo}</h4>
      <Radar data={data} options={options} />
    </div>
  );
}
