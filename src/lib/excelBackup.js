// Respaldo de respuestas en Excel: exportación (descarga) e importación
// (recrear el diagnóstico desde el archivo).
import ExcelJS from "exceljs";
import { baseFileName, normalizeText, saveBlob } from "./files";

export const BACKUP_FORMAT = "diagnostico-internacionalizacion";
export const BACKUP_FORMAT_VERSION = 1;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const ANSWER_TEXT = ["Sin responder", "Bajo", "Medio", "Alto"];
const ANSWER_VALUE = { "": 0, "sin responder": 0, bajo: 1, medio: 2, alto: 3 };

const COLOR = {
  teal: "FF087F78",
  tealSoft: "FFEAF7F5",
  editable: "FFFFF8EA",
  editableHeader: "FFAD6800",
  line: "FFE5E5E5",
  ink: "FF262626",
  muted: "FF8C8C8C",
  white: "FFFFFFFF",
};

export class BackupError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "BackupError";
    this.details = details;
  }
}

/** Huella del instrumento (indicadores y sus nombres) para detectar versiones. */
export function instrumentFingerprint(items) {
  const source = items.map((it) => `${it.id}|${it.nombre}`).join("\n");
  let hash = 5381;
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) + hash + source.charCodeAt(i)) >>> 0;
  }
  return `${items.length}-${hash.toString(16)}`;
}

const argb = (hex) => `FF${hex.replace("#", "").toUpperCase()}`;

function styleHeaderRow(row, editableCols = []) {
  row.height = 22;
  row.eachCell((cell, col) => {
    const editable = editableCols.includes(col);
    cell.font = { bold: true, color: { argb: COLOR.white } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: editable ? COLOR.editableHeader : COLOR.teal },
    };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
}

function thinBorder() {
  const side = { style: "thin", color: { argb: COLOR.line } };
  return { top: side, left: side, bottom: side, right: side };
}

// ---------------------------------------------------------------- Léame

function buildReadme(wb, info) {
  const ws = wb.addWorksheet("Léame", {
    properties: { tabColor: { argb: COLOR.teal } },
    views: [{ showGridLines: false }],
  });
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 95;

  const add = (text, style = {}) => {
    const row = ws.addRow([text]);
    ws.mergeCells(row.number, 1, row.number, 2);
    const cell = row.getCell(1);
    cell.alignment = { wrapText: true, vertical: "top" };
    cell.font = { size: 11, color: { argb: COLOR.ink }, ...style.font };
    if (style.height) row.height = style.height;
    return row;
  };
  const title = (text) =>
    add(text, { font: { bold: true, size: 13, color: { argb: COLOR.teal } }, height: 24 });
  const blank = () => ws.addRow([]);

  add("Diagnóstico de internacionalización · Respaldo de respuestas", {
    font: { bold: true, size: 16, color: { argb: COLOR.teal } },
    height: 28,
  });
  add("Universidad de Antioquia · Planes de internacionalización", {
    font: { color: { argb: COLOR.muted } },
  });
  blank();

  title("¿Qué es este archivo?");
  add(
    `Contiene todas las respuestas del diagnóstico de internacionalización de ${info.unidad}, descargadas el ${info.fechaTexto}. ` +
      "Junto con el PDF forma el respaldo completo del diagnóstico: el PDF sirve para leer y presentar los resultados; " +
      "este Excel sirve para conservar las respuestas y volver a cargarlas en la herramienta.",
    { height: 48 }
  );
  blank();

  title("¿Para qué sirve?");
  [
    "• Respaldo: la herramienta guarda las respuestas solo en el navegador donde se diligenció el diagnóstico. Si se borra el historial, se cambia de equipo o de navegador, las respuestas se pierden. Este archivo permite recuperarlas.",
    "• Recrear el diagnóstico: al cargarlo en la herramienta se restauran todas las respuestas y los indicadores marcados como «No aplica»; desde ahí se pueden volver a ver los resultados y descargar el PDF.",
    "• Continuar o actualizar: se puede cargar más adelante para completar indicadores pendientes o para actualizar el diagnóstico en un nuevo periodo, conservando el archivo anterior como línea base.",
    "• Trabajo en equipo: otras personas de la unidad pueden revisar el archivo o diligenciar directamente la hoja «Respuestas» (con las listas desplegables) y luego cargarlo en la herramienta.",
    "• Análisis: la hoja «Resumen» consolida las respuestas por eje y se recalcula si se editan las respuestas; los datos pueden filtrarse o compararse entre periodos.",
  ].forEach((text) => add(text, { height: 34 }));
  blank();

  title("¿Cómo recuperar o recrear el diagnóstico?");
  [
    "1. Abra la herramienta de diagnóstico de internacionalización.",
    "2. Pulse «Cargar Excel» y seleccione este archivo.",
    "3. Revise el resumen (unidad académica, respuestas e indicadores «No aplica») y confirme. Las respuestas que existan para esa unidad en ese navegador serán reemplazadas.",
  ].forEach((text) => add(text, { height: 20 }));
  blank();

  title("Si edita el archivo");
  [
    "• Modifique solo las columnas «Aplica» y «Respuesta» de la hoja «Respuestas» (resaltadas en amarillo); use las listas desplegables.",
    "• Respuestas válidas: Bajo, Medio, Alto o Sin responder. «Aplica = No» solo es válido para los indicadores adicionales.",
    "• No cambie la columna «ID», no elimine filas ni cambie el nombre de las hojas.",
    "• Guarde el archivo en formato Excel (.xlsx).",
  ].forEach((text) => add(text, { height: 20 }));
  blank();

  title("Datos del archivo");
  [
    ["Unidad académica", info.unidad],
    ["Fecha de descarga", info.fechaTexto],
    ["Indicadores respondidos", `${info.stats.answered} de ${info.stats.total}`],
    ["Nivel al momento de la descarga", info.nivelLabel],
    ["Versión del instrumento", info.fingerprint],
  ].forEach(([label, value]) => {
    const row = ws.addRow([label, value]);
    row.getCell(1).font = { bold: true, color: { argb: COLOR.ink } };
    row.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR.tealSoft },
    };
    row.eachCell((cell) => {
      cell.border = thinBorder();
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  });
}

// ---------------------------------------------------------------- Respuestas

const RESPONSE_COLUMNS = [
  { header: "ID", key: "id", width: 7 },
  { header: "Eje", key: "eje", width: 22 },
  { header: "Objetivo", key: "objetivo", width: 34 },
  { header: "Indicador", key: "indicador", width: 30 },
  { header: "Nombre del indicador", key: "nombre", width: 34 },
  { header: "Fórmula / descripción", key: "formula", width: 55 },
  { header: "Tipo", key: "tipo", width: 12 },
  { header: "Aplica", key: "aplica", width: 10 },
  { header: "Respuesta", key: "respuesta", width: 15 },
  { header: "Nivel Bajo", key: "bajo", width: 42 },
  { header: "Nivel Medio", key: "medio", width: 42 },
  { header: "Nivel Alto", key: "alto", width: 42 },
];
const COL_APLICA = 8;
const COL_RESPUESTA = 9;

function buildResponses(wb, { items, answers, notApplicableIds, ejeColors }) {
  const ws = wb.addWorksheet("Respuestas", {
    views: [{ state: "frozen", ySplit: 1, xSplit: 0 }],
  });
  ws.columns = RESPONSE_COLUMNS;
  styleHeaderRow(ws.getRow(1), [COL_APLICA, COL_RESPUESTA]);

  for (const it of items) {
    const isOptional = it.obligatorio === false;
    const row = ws.addRow({
      id: Number(it.id),
      eje: it.eje,
      objetivo: it.objetivo,
      indicador: (it.indicador ?? "").trim(),
      nombre: it.nombre,
      formula: it.formula,
      tipo: isOptional ? "Adicional" : "Obligatorio",
      aplica: notApplicableIds.has(it.id) ? "No" : "Sí",
      respuesta: ANSWER_TEXT[answers[it.id] ?? 0],
      bajo: it.niveles?.basica ?? "",
      medio: it.niveles?.transversal ?? "",
      alto: it.niveles?.sistema ?? "",
    });

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = thinBorder();
    });
    row.getCell(1).font = { color: { argb: COLOR.muted } };
    row.getCell(2).font = {
      bold: true,
      color: { argb: argb(ejeColors[it.eje] ?? "#087F78") },
    };

    for (const col of [COL_APLICA, COL_RESPUESTA]) {
      const cell = row.getCell(col);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.editable } };
      cell.font = { bold: true, color: { argb: COLOR.ink } };
    }

    row.getCell(COL_APLICA).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [isOptional ? '"Sí,No"' : '"Sí"'],
      showErrorMessage: true,
      errorTitle: "Valor no válido",
      error: isOptional
        ? "Seleccione Sí o No."
        : "Este indicador es obligatorio: siempre aplica.",
    };
    row.getCell(COL_RESPUESTA).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Sin responder,Bajo,Medio,Alto"'],
      showErrorMessage: true,
      errorTitle: "Valor no válido",
      error: "Seleccione Bajo, Medio, Alto o Sin responder.",
    };
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: RESPONSE_COLUMNS.length } };
  return { firstRow: 2, lastRow: items.length + 1 };
}

// ---------------------------------------------------------------- Resumen

function buildSummary(wb, { ejes, items, answers, notApplicableIds, info, range }) {
  const ws = wb.addWorksheet("Resumen", { views: [{ showGridLines: false }] });
  ws.columns = [
    { width: 30 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
    { width: 15 },
    { width: 12 },
    { width: 10 },
  ];

  ws.getCell("A1").value = "Resumen del diagnóstico";
  ws.getCell("A1").font = { bold: true, size: 15, color: { argb: COLOR.teal } };

  [
    ["Unidad académica", info.unidad],
    ["Fecha de descarga", info.fechaTexto],
    ["Nivel al momento de la descarga", info.nivelLabel],
  ].forEach(([label, value], i) => {
    ws.getCell(3 + i, 1).value = label;
    ws.getCell(3 + i, 1).font = { bold: true };
    ws.getCell(3 + i, 2).value = value;
  });

  const headerRowNumber = 7;
  const header = ws.getRow(headerRowNumber);
  header.values = ["Eje", "Bajo", "Medio", "Alto", "Sin responder", "No aplica", "Total"];
  styleHeaderRow(header);

  const r = (col) => `Respuestas!$${col}$${range.firstRow}:$${col}$${range.lastRow}`;
  const count = (ejeCell, answer) =>
    `COUNTIFS(${r("B")},${ejeCell},${r("I")},"${answer}",${r("H")},"Sí")`;

  ejes.forEach((eje, index) => {
    const rowNumber = headerRowNumber + 1 + index;
    const ejeItems = items.filter((it) => it.eje === eje);
    const tally = { 0: 0, 1: 0, 2: 0, 3: 0, na: 0 };
    for (const it of ejeItems) {
      if (notApplicableIds.has(it.id)) tally.na += 1;
      else tally[answers[it.id] ?? 0] += 1;
    }
    const a = `$A${rowNumber}`;
    const row = ws.getRow(rowNumber);
    row.getCell(1).value = eje;
    row.getCell(2).value = { formula: count(a, "Bajo"), result: tally[1] };
    row.getCell(3).value = { formula: count(a, "Medio"), result: tally[2] };
    row.getCell(4).value = { formula: count(a, "Alto"), result: tally[3] };
    row.getCell(5).value = {
      formula: `${count(a, "Sin responder")}+COUNTIFS(${r("B")},${a},${r("I")},"",${r("H")},"Sí")`,
      result: tally[0],
    };
    row.getCell(6).value = {
      formula: `COUNTIFS(${r("B")},${a},${r("H")},"No")`,
      result: tally.na,
    };
    row.getCell(7).value = { formula: `COUNTIF(${r("B")},${a})`, result: ejeItems.length };
    row.getCell(1).font = { bold: true, color: { argb: argb(info.ejeColors[eje] ?? "#087F78") } };
    row.eachCell((cell, col) => {
      cell.border = thinBorder();
      if (col > 1) cell.alignment = { horizontal: "center" };
    });
  });

  const totalRowNumber = headerRowNumber + ejes.length + 1;
  const totalRow = ws.getRow(totalRowNumber);
  totalRow.getCell(1).value = "Total";
  for (let col = 2; col <= 7; col += 1) {
    const letter = String.fromCharCode(64 + col);
    const cells = ejes.map((_, i) => ws.getRow(headerRowNumber + 1 + i).getCell(col).value.result);
    totalRow.getCell(col).value = {
      formula: `SUM(${letter}${headerRowNumber + 1}:${letter}${totalRowNumber - 1})`,
      result: cells.reduce((sum, v) => sum + v, 0),
    };
    totalRow.getCell(col).alignment = { horizontal: "center" };
  }
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.border = thinBorder();
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.tealSoft } };
  });

  const note = ws.getCell(totalRowNumber + 2, 1);
  note.value =
    "Las cifras se recalculan si se edita la hoja «Respuestas». El nivel del diagnóstico se recalcula al cargar el archivo en la herramienta.";
  note.font = { italic: true, color: { argb: COLOR.muted } };
}

// ---------------------------------------------------------------- Exportar

export async function downloadAnswersExcel({
  unidad,
  items,
  ejes,
  ejeColors,
  answers,
  notApplicableIds,
  stats,
  nivelLabel,
}) {
  const now = new Date();
  const info = {
    unidad,
    ejeColors,
    stats,
    nivelLabel,
    fingerprint: instrumentFingerprint(items),
    fechaTexto: now.toLocaleString("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  const wb = new ExcelJS.Workbook();
  wb.creator = "Diagnóstico de internacionalización · Universidad de Antioquia";
  wb.created = now;

  buildReadme(wb, info);
  const range = buildResponses(wb, { items, answers, notApplicableIds, ejeColors });
  buildSummary(wb, { ejes, items, answers, notApplicableIds, info, range });

  // Metadatos para validar el archivo al cargarlo (hoja oculta).
  const meta = wb.addWorksheet("_meta", { state: "veryHidden" });
  meta.addRows([
    ["formato", BACKUP_FORMAT],
    ["version_formato", BACKUP_FORMAT_VERSION],
    ["instrumento", info.fingerprint],
    ["unidad", unidad],
    ["fecha", now.toISOString()],
  ]);

  const buffer = await wb.xlsx.writeBuffer();
  saveBlob(new Blob([buffer], { type: XLSX_MIME }), `${baseFileName(unidad)}-respuestas.xlsx`);
}

// ---------------------------------------------------------------- Importar

function readMeta(wb) {
  const ws = wb.getWorksheet("_meta");
  if (!ws) return null;
  const meta = {};
  ws.eachRow((row) => {
    meta[String(row.getCell(1).text).trim()] = String(row.getCell(2).text).trim();
  });
  return meta;
}

/**
 * Lee un Excel descargado desde la herramienta y devuelve las respuestas.
 * Lanza BackupError con un mensaje para el usuario si el archivo no es válido.
 */
export async function readAnswersExcel(file, items) {
  if (!/\.xlsx$/i.test(file.name)) {
    throw new BackupError("El archivo debe ser un Excel (.xlsx) descargado desde esta herramienta.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new BackupError("El archivo es demasiado grande para ser un respaldo del diagnóstico.");
  }

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new BackupError("No se pudo leer el archivo. Verifique que sea un Excel (.xlsx) válido.");
  }

  const warnings = [];
  const meta = readMeta(wb);
  if (meta && meta.formato !== BACKUP_FORMAT) {
    throw new BackupError("El archivo no corresponde a un respaldo del diagnóstico de internacionalización.");
  }
  if (!meta) {
    warnings.push("No se encontraron los datos de origen del archivo; verifique que la unidad académica sea la correcta.");
  } else if (meta.instrumento !== instrumentFingerprint(items)) {
    warnings.push("El archivo se generó con otra versión del instrumento; solo se cargarán los indicadores que coincidan.");
  }

  const ws = wb.getWorksheet("Respuestas");
  if (!ws) {
    throw new BackupError("El archivo no tiene la hoja «Respuestas».");
  }

  const columns = {};
  ws.getRow(1).eachCell((cell, col) => {
    columns[normalizeText(cell.text)] = col;
  });
  const colId = columns.id;
  const colAplica = columns.aplica;
  const colRespuesta = columns.respuesta;
  if (!colId || !colAplica || !colRespuesta) {
    throw new BackupError("La hoja «Respuestas» no tiene las columnas «ID», «Aplica» y «Respuesta».");
  }

  const itemsById = new Map(items.map((it) => [it.id, it]));
  const answers = Object.fromEntries(items.map((it) => [it.id, 0]));
  const notApplicableIds = new Set();
  const seen = new Set();
  const errors = [];
  let unknownRows = 0;
  let ignoredNotApplicable = 0;

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const id = String(row.getCell(colId).text).trim();
    if (!id) return;

    const item = itemsById.get(id);
    if (!item) {
      unknownRows += 1;
      return;
    }
    if (seen.has(id)) {
      errors.push(`Fila ${rowNumber}: el indicador «${item.nombre}» está repetido.`);
      return;
    }
    seen.add(id);

    const rawAnswer = row.getCell(colRespuesta).text;
    const value = ANSWER_VALUE[normalizeText(rawAnswer)];
    if (value === undefined) {
      errors.push(`Fila ${rowNumber}: la respuesta «${rawAnswer}» no es válida (use Bajo, Medio, Alto o Sin responder).`);
    } else {
      answers[id] = value;
    }

    const rawAplica = normalizeText(row.getCell(colAplica).text);
    if (rawAplica === "no") {
      if (item.obligatorio === false) notApplicableIds.add(id);
      else ignoredNotApplicable += 1;
    } else if (rawAplica !== "si" && rawAplica !== "") {
      errors.push(`Fila ${rowNumber}: el valor de «Aplica» debe ser Sí o No.`);
    }
  });

  if (errors.length > 0) {
    throw new BackupError("El archivo tiene valores que no se pueden cargar.", errors);
  }
  if (seen.size === 0) {
    throw new BackupError("El archivo no contiene respuestas de indicadores del diagnóstico.");
  }

  const missing = items.length - seen.size;
  if (missing > 0) warnings.push(`${missing} indicador(es) no están en el archivo; quedarán sin responder.`);
  if (unknownRows > 0) warnings.push(`${unknownRows} fila(s) no corresponden a indicadores actuales y se ignoraron.`);
  if (ignoredNotApplicable > 0) {
    warnings.push(`${ignoredNotApplicable} indicador(es) obligatorio(s) marcados como «No aplica» se cargarán como aplicables.`);
  }

  const counts = { answered: 0, c1: 0, c2: 0, c3: 0, notApplicable: notApplicableIds.size };
  for (const it of items) {
    if (notApplicableIds.has(it.id)) continue;
    const v = answers[it.id];
    if (v > 0) counts.answered += 1;
    if (v === 1) counts.c1 += 1;
    if (v === 2) counts.c2 += 1;
    if (v === 3) counts.c3 += 1;
  }

  return {
    fileName: file.name,
    unidad: meta?.unidad ?? "",
    fecha: meta?.fecha ? new Date(meta.fecha) : null,
    answers,
    notApplicableIds,
    counts,
    total: items.length - notApplicableIds.size,
    warnings,
  };
}
