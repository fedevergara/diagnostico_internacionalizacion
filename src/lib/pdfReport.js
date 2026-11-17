// Genera el PDF de resultados dibujándolo directamente con jsPDF.
// No "fotografía" el DOM (como hacía html2pdf/html2canvas), así que el
// resultado no depende del CSS, del navegador, del zoom ni de la pantalla.
import { jsPDF } from "jspdf";
import {
  Chart,
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import shieldDataUrl from "../assets/udea-shield-white.png?inline";
import { buildRadarConfig, summarizeIndicators } from "./radar";
import { baseFileName } from "./files";

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler);

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM_LIMIT = PAGE_H - 20;

const C = {
  hero: "#009579",
  teal: "#087f78",
  tealSoft: "#eaf7f5",
  ink: "#262626",
  secondary: "#595959",
  muted: "#8c8c8c",
  line: "#e5e5e5",
  split: "#f0f0f0",
  surfaceAlt: "#fafafa",
};

// Radar: se dibuja con medidas CSS fijas y alta densidad de píxeles, igual en
// cualquier dispositivo. Formato apaisado: las etiquetas ocupan los laterales.
const RADAR_CSS_SIZE = {
  normal: { width: 620, height: 400 },
  dense: { width: 680, height: 500 },
};
const RADAR_PIXEL_RATIO = 2.5;
const PDF_CHART_FONT = "Helvetica, Arial, sans-serif";

function mixWithWhite(hex, ratio) {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const channel = (shift) => {
    const v = (n >> shift) & 255;
    return Math.round(v * ratio + 255 * (1 - ratio))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

function renderRadarImage({ titulo, indicators, answers, color }) {
  const isDense = indicators.length >= 10;
  const { width, height } = isDense ? RADAR_CSS_SIZE.dense : RADAR_CSS_SIZE.normal;
  const config = buildRadarConfig({
    titulo,
    indicators,
    answers,
    color,
    fontFamily: PDF_CHART_FONT,
    labelSize: isDense ? 10.5 : 11.5,
  });

  // Contenedor fuera de pantalla con tamaño explícito.
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;height:${height}px;pointer-events:none;`;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  host.appendChild(canvas);
  document.body.appendChild(host);

  let chart;
  try {
    chart = new Chart(canvas, {
      ...config,
      options: {
        ...config.options,
        responsive: false,
        maintainAspectRatio: false,
        devicePixelRatio: RADAR_PIXEL_RATIO,
        animation: false,
        events: [],
        plugins: { ...config.options.plugins, tooltip: { enabled: false } },
      },
    });
    return { dataUrl: canvas.toDataURL("image/png"), aspect: height / width };
  } finally {
    chart?.destroy();
    host.remove();
  }
}

class PdfWriter {
  constructor(unidad) {
    this.doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    this.unidad = unidad;
    this.y = MARGIN;
  }

  font(size, style = "normal", color = C.ink) {
    this.doc.setFont("helvetica", style);
    this.doc.setFontSize(size);
    this.doc.setTextColor(color);
  }

  lineHeight(size) {
    return size * 0.3528 * 1.25; // pt → mm con interlineado 1.25
  }

  ensureSpace(height, onNewPage) {
    if (this.y + height <= BOTTOM_LIMIT) return false;
    this.doc.addPage();
    this.y = MARGIN;
    onNewPage?.();
    return true;
  }

  pageKicker() {
    this.font(7.5, "bold", C.muted);
    this.doc.text(
      `DIAGNÓSTICO DE INTERNACIONALIZACIÓN · ${this.unidad.toUpperCase()}`,
      MARGIN,
      this.y + 2
    );
    this.y += 8;
  }

  footers() {
    const total = this.doc.getNumberOfPages();
    for (let i = 1; i <= total; i += 1) {
      this.doc.setPage(i);
      this.doc.setDrawColor(C.line);
      this.doc.setLineWidth(0.2);
      this.doc.line(MARGIN, PAGE_H - 13, PAGE_W - MARGIN, PAGE_H - 13);
      this.font(7.5, "normal", C.muted);
      this.doc.text(
        `Universidad de Antioquia · Diagnóstico de internacionalización · ${this.unidad}`,
        MARGIN,
        PAGE_H - 8.5,
        { maxWidth: CONTENT_W - 30 }
      );
      this.doc.text(`Página ${i} de ${total}`, PAGE_W - MARGIN, PAGE_H - 8.5, {
        align: "right",
      });
    }
  }
}

function drawHero(w) {
  const { doc } = w;
  doc.setFillColor(C.hero);
  doc.rect(0, 0, PAGE_W, 40, "F");

  // Escudo como marca de agua (igual que el observatorio).
  doc.setGState(new doc.GState({ opacity: 0.55 }));
  doc.addImage(shieldDataUrl, "PNG", PAGE_W - MARGIN - 22, 6.5, 22, 27.2);
  doc.setGState(new doc.GState({ opacity: 1 }));

  w.font(8, "bold", "#ffffff");
  doc.text("UNIVERSIDAD DE ANTIOQUIA", MARGIN, 14);
  w.font(20, "bold", "#ffffff");
  doc.text("Diagnóstico de internacionalización", MARGIN, 24.5);
  w.font(10, "normal", "#ffffff");
  doc.text("Planes de internacionalización · Resultados por unidad académica", MARGIN, 32);
  w.y = 52;
}

function drawUnitBlock(w) {
  const { doc } = w;
  const date = new Date().toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  w.font(7.5, "bold", C.muted);
  doc.text("UNIDAD ACADÉMICA", MARGIN, w.y);
  doc.text(`GENERADO EL ${date.toUpperCase()}`, PAGE_W - MARGIN, w.y, {
    align: "right",
  });
  w.y += 6.5;

  w.font(15, "bold", C.ink);
  const lines = doc.splitTextToSize(w.unidad, CONTENT_W);
  doc.text(lines, MARGIN, w.y);
  w.y += lines.length * w.lineHeight(15) + 4;
}

function drawKpis(w, { stats, nivelLabel }) {
  const { doc } = w;
  const gap = 5;
  const cardW = (CONTENT_W - gap * 2) / 3;
  const cardH = 25;
  const naNote = stats.notApplicable
    ? ` · ${stats.notApplicable} no aplica`
    : "";
  const cards = [
    {
      label: "INDICADORES RESPONDIDOS",
      value: `${stats.answered}/${stats.total}`,
      note: `${stats.progreso}% de avance${naNote}`,
    },
    {
      label: "NIVEL RESULTANTE",
      value: nivelLabel,
      note:
        stats.answered < stats.total
          ? "Diagnóstico incompleto"
          : "Según la mayoría de respuestas",
    },
    {
      label: "DISTRIBUCIÓN",
      value: `${stats.c1} · ${stats.c2} · ${stats.c3}`,
      note: "Bajo · Medio · Alto",
    },
  ];

  cards.forEach((card, index) => {
    const x = MARGIN + index * (cardW + gap);
    doc.setDrawColor(C.line);
    doc.setLineWidth(0.25);
    doc.setFillColor("#ffffff");
    doc.roundedRect(x, w.y, cardW, cardH, 2, 2, "FD");
    doc.setFillColor(C.teal);
    doc.rect(x, w.y + 3, 1, cardH - 6, "F");

    w.font(7, "bold", C.muted);
    doc.text(card.label, x + 5, w.y + 6.5);
    w.font(15, "bold", C.ink);
    doc.text(card.value, x + 5, w.y + 15);
    w.font(7.5, "normal", C.secondary);
    doc.text(card.note, x + 5, w.y + 20.5, { maxWidth: cardW - 8 });
  });

  w.y += cardH + 6;
}

function drawLevelText(w, textoNivel) {
  if (!textoNivel) return;
  const { doc } = w;
  w.font(9.5, "normal", C.ink);
  const lines = doc.splitTextToSize(textoNivel, CONTENT_W - 12);
  const boxH = lines.length * w.lineHeight(9.5) + 8;

  doc.setFillColor(C.tealSoft);
  doc.roundedRect(MARGIN, w.y, CONTENT_W, boxH, 2, 2, "F");
  doc.setFillColor(C.teal);
  doc.rect(MARGIN, w.y, 1.2, boxH, "F");
  doc.text(lines, MARGIN + 6, w.y + 6.2);
  w.y += boxH + 9;
}

function drawSectionTitle(w, text, color = C.ink) {
  w.font(12, "bold", color);
  w.doc.text(text, MARGIN, w.y);
  w.y += 6;
}

function drawOverviewTable(w, ejes) {
  const { doc } = w;
  const cols = [
    { label: "Eje", width: 64, align: "left" },
    { label: "Bajo", width: 19 },
    { label: "Medio", width: 19 },
    { label: "Alto", width: 19 },
    { label: "Sin responder", width: 23 },
    { label: "No aplica", width: 19 },
    { label: "Total", width: 15 },
  ];
  const rowH = 8;

  const drawRow = (cells, { header = false, color } = {}) => {
    let x = MARGIN;
    if (header) {
      doc.setFillColor(C.surfaceAlt);
      doc.rect(MARGIN, w.y, CONTENT_W, rowH, "F");
    }
    cells.forEach((cell, i) => {
      const col = cols[i];
      const textY = w.y + rowH / 2 + 1.2;
      if (i === 0 && color) {
        doc.setFillColor(color);
        doc.circle(x + 2.5, w.y + rowH / 2, 1.3, "F");
      }
      w.font(header ? 7.5 : 9, header ? "bold" : i === 0 ? "bold" : "normal", header ? C.secondary : C.ink);
      if (col.align === "left") {
        doc.text(String(cell), x + (color ? 6 : 2), textY);
      } else {
        doc.text(String(cell), x + col.width / 2, textY, { align: "center" });
      }
      x += col.width;
    });
    doc.setDrawColor(C.split);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, w.y + rowH, MARGIN + CONTENT_W, w.y + rowH);
    w.y += rowH;
  };

  drawRow(cols.map((c) => c.label), { header: true });
  for (const eje of ejes) {
    const { counts } = eje.summary;
    drawRow(
      [
        eje.eje,
        counts["level-1"],
        counts["level-2"],
        counts["level-3"],
        counts["level-0"],
        counts["not-applicable"],
        eje.summary.entries.length,
      ],
      { color: eje.color }
    );
  }

  w.y += 5;
  w.font(7.5, "normal", C.muted);
  const note = doc.splitTextToSize(
    "Los indicadores marcados como «No aplica» se excluyen del radar y del cálculo del nivel. El nivel resultante corresponde a la categoría con más respuestas.",
    CONTENT_W
  );
  doc.text(note, MARGIN, w.y);
  w.y += note.length * w.lineHeight(7.5);
}

function pillColors(entry, color) {
  if (entry.value === 3) return { fill: color, text: "#ffffff" };
  if (entry.value === 2) return { fill: mixWithWhite(color, 0.3), text: color };
  if (entry.value === 1) return { fill: mixWithWhite(color, 0.1), text: color };
  return { fill: C.split, text: C.muted };
}

function drawEjePage(w, eje, answers) {
  const { doc } = w;
  doc.addPage();
  w.y = MARGIN;

  // Franja de color del eje.
  doc.setFillColor(eje.color);
  doc.rect(0, 0, PAGE_W, 2.5, "F");

  w.pageKicker();
  w.font(18, "bold", eje.color);
  doc.text(eje.eje, MARGIN, w.y + 4);
  w.y += 11;

  const { counts } = eje.summary;
  const parts = [
    `Bajo ${counts["level-1"]}`,
    `Medio ${counts["level-2"]}`,
    `Alto ${counts["level-3"]}`,
    `Sin responder ${counts["level-0"]}`,
  ];
  if (eje.hasOptional || counts["not-applicable"] > 0) {
    parts.push(`No aplica ${counts["not-applicable"]}`);
  }
  w.font(9.5, "normal", C.secondary);
  doc.text(parts.join("   ·   "), MARGIN, w.y);
  w.y += 5;

  // Radar dentro de una tarjeta.
  const radar = renderRadarImage({
    titulo: eje.eje,
    indicators: eje.indicators,
    answers,
    color: eje.color,
  });
  const imgW = CONTENT_W - 6;
  const imgH = imgW * radar.aspect;
  const cardH = imgH + 6;
  doc.setDrawColor(C.line);
  doc.setLineWidth(0.25);
  doc.roundedRect(MARGIN, w.y, CONTENT_W, cardH, 2.5, 2.5, "S");
  doc.addImage(
    radar.dataUrl,
    "PNG",
    MARGIN + 3,
    w.y + 3,
    imgW,
    imgH,
    undefined,
    "FAST"
  );
  w.y += cardH + 8;

  drawAnswersTable(w, eje);
}

function drawAnswersTable(w, eje) {
  const { doc } = w;
  const colGap = 6;
  const colW = (CONTENT_W - colGap) / 2;
  const pillW = 21;
  const nameW = colW - pillW - 4;
  const fontSize = 8.2;
  const lh = w.lineHeight(fontSize);

  const heading = (suffix = "") => {
    drawSectionTitle(w, `Respuestas por indicador${suffix}`, C.ink);
  };
  w.ensureSpace(20, () => w.pageKicker());
  heading();

  const entries = eje.summary.entries;
  const half = Math.ceil(entries.length / 2);
  // Orden por columnas: la izquierda primero, como se lee el diagnóstico.
  const rows = [];
  for (let i = 0; i < half; i += 1) rows.push([entries[i], entries[i + half]]);

  for (const pair of rows) {
    w.font(fontSize, "normal", C.ink);
    const wrapped = pair.map((e) => (e ? doc.splitTextToSize(e.name, nameW) : []));
    const rowH = Math.max(...wrapped.map((l) => l.length), 1) * lh + 3;

    w.ensureSpace(rowH, () => {
      w.pageKicker();
      heading(" (continuación)");
    });

    pair.forEach((entry, col) => {
      if (!entry) return;
      const x = MARGIN + col * (colW + colGap);
      w.font(fontSize, "normal", C.ink);
      doc.text(wrapped[col], x, w.y + 2.2 + lh * 0.75);

      const pill = pillColors(entry, eje.color);
      const pillH = 5;
      const pillY = w.y + (rowH - pillH) / 2;
      doc.setFillColor(pill.fill);
      doc.roundedRect(x + colW - pillW, pillY, pillW, pillH, 2.5, 2.5, "F");
      w.font(7, "bold", pill.text);
      doc.text(entry.answer, x + colW - pillW / 2, pillY + 3.4, {
        align: "center",
      });

      doc.setDrawColor(C.split);
      doc.setLineWidth(0.25);
      doc.line(x, w.y + rowH, x + colW, w.y + rowH);
    });

    w.y += rowH;
  }
}

/**
 * @param {object} params
 * @param {string} params.unidad
 * @param {object} params.stats        c1, c2, c3, answered, total, progreso
 * @param {string} params.nivelLabel
 * @param {string} params.textoNivel
 * @param {Array}  params.ejes         [{ eje, color, indicators, allIndicators }]
 * @param {object} params.answers
 * @param {Set}    params.notApplicableIds
 */
export async function generateDiagnosticPdf({
  unidad,
  stats,
  nivelLabel,
  textoNivel,
  ejes,
  answers,
  notApplicableIds,
}) {
  const w = new PdfWriter(unidad);

  const ejesWithSummary = ejes.map((eje) => ({
    ...eje,
    hasOptional: eje.allIndicators.some((it) => it.obligatorio === false),
    summary: summarizeIndicators(eje.allIndicators, answers, notApplicableIds),
  }));

  drawHero(w);
  drawUnitBlock(w);
  drawKpis(w, { stats: { ...stats, notApplicable: notApplicableIds.size }, nivelLabel });
  drawLevelText(w, textoNivel);
  drawSectionTitle(w, "Resultados por eje");
  drawOverviewTable(w, ejesWithSummary);

  for (const eje of ejesWithSummary) {
    drawEjePage(w, eje, answers);
  }

  w.footers();
  w.doc.save(`${baseFileName(unidad)}.pdf`);
}
