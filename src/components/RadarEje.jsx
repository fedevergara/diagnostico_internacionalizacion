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
  answers,
  color = "#01602D",
  forPdf = false,
}) {
  const labels = indicators.map((it) => it.nombre);
  const values = indicators.map((it) => answers[it.id] ?? 0);
  const isDense = labels.length >= 10;
  const maxCharsPerLine = forPdf ? (isDense ? 17 : 20) : (isDense ? 17 : 21);
  const maxLines = forPdf ? 3 : 2;
  const pointLabelSize = forPdf ? (isDense ? 9 : 10) : (isDense ? 9 : 10);
  const chartPadding = forPdf ? (isDense ? 20 : 16) : (isDense ? 20 : 16);
  const pointLabelPadding = forPdf ? 4 : 0;

  const wrapLabel = (label) => {
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
    return lines.slice(0, maxLines);
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
    <div className="panel radar-card">
      <h4 className="radar-title" style={{ color }}>
        {titulo}
      </h4>
      <div className="radar-canvas">
        <Radar data={data} options={options} />
      </div>
    </div>
  );
}
