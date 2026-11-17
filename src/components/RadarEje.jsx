import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { buildRadarConfig, hexToRgba } from "../lib/radar";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

export default function RadarEje({ titulo, indicators, answers, color }) {
  const { data, options } = buildRadarConfig({
    titulo,
    indicators,
    answers,
    color,
  });

  return (
    <div
      className="card radar-card"
      style={{
        "--radar-color": color,
        "--radar-color-soft": hexToRgba(color, 0.08),
      }}
    >
      <h4 className="card-title radar-title">
        <span className="eje-dot" aria-hidden="true" />
        {titulo}
      </h4>
      <div className="radar-canvas">
        <Radar data={data} options={options} />
      </div>
    </div>
  );
}
