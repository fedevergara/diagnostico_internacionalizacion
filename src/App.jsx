import { useEffect, useMemo, useState } from "react";
import raw from "./data/diagnostico.json";
import { normalizeItems } from "./lib/normalize";
import RadarEje from "./components/RadarEje";
import { hexToRgba } from "./lib/radar";
import shieldUrl from "./assets/udea-shield-white.png";
import "./App.css";

const items = normalizeItems(raw.items);

const LEVELS = [
  { id: 1, label: "Bajo", key: "basica" },
  { id: 2, label: "Medio", key: "transversal" },
  { id: 3, label: "Alto", key: "sistema" },
];

const EJE_ORDER = [
  "Interacción Estratégica",
  "Movilidad",
  "Gestión de Capacidades",
  "Gestión Administrativa",
];

const EJE_COLORS = {
  "Interacción Estratégica": "#007473",
  Movilidad: "#752157",
  "Gestión de Capacidades": "#007297",
  "Gestión Administrativa": "#F5333F",
};

const NIVEL_LABELS = {
  basica: "Básico",
  transversal: "Transversal",
  sistema: "Sistémico",
  pendiente: "Pendiente",
};

const STORAGE_KEY = "diagnostico-internacionalizacion";
const STORAGE_VERSION = 1;

const UNIDADES = [
  "Facultad de Artes",
  "Facultad de Ciencias Exactas y Naturales",
  "Facultad de Ciencias Sociales y Humanas",
  "Facultad de Derecho y Ciencias Políticas",
  "Instituto de Estudios Políticos",
  "Facultad de Comunicaciones y Filología",
  "Escuela de Idiomas",
  "Instituto de Filosofía",
  "Facultad de Ciencias Economicas",
  "Instituto de Estudios Regionales",
  "Corporación Académica Ambiental",
  "Facultad de Educación",
  "Facultad de Ingeniería",
  "Facultad de Medicina",
  "Facultad de Odontología",
  "Facultad de Ciencias Farmaceuticas y Alimentarias",
  "Escuela de Microbiología",
  "Facultad de Ciencias Agrarias",
  "Escuela Interamericana de Bibliotecología",
  "Dirección de Regionalización",
  "Facultad de Enfermería",
  "Facultad Nacional de Salud Pública",
  "Instituto Universitario de Educación Física y Deporte",
  "Escuela de Nutrición y Dietética",
  "Corporación Académica Ciencias Basicas Biomédicas",
];

const optionalItemIds = new Set(
  items.filter((it) => it.obligatorio === false).map((it) => it.id)
);

function createEmptyAnswers() {
  return Object.fromEntries(items.map((it) => [it.id, 0]));
}

function createEmptyStorage() {
  return { version: STORAGE_VERSION, selectedUnit: "", units: {} };
}

function readStoredDiagnoses() {
  if (typeof window === "undefined") return createEmptyStorage();

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (
      parsed?.version !== STORAGE_VERSION ||
      !parsed.units ||
      typeof parsed.units !== "object"
    ) {
      return createEmptyStorage();
    }
    return parsed;
  } catch {
    return createEmptyStorage();
  }
}

function loadUnitProgress(unit, storedDiagnoses = readStoredDiagnoses()) {
  const answers = createEmptyAnswers();
  const storedProgress = storedDiagnoses.units?.[unit];

  if (storedProgress?.answers && typeof storedProgress.answers === "object") {
    for (const it of items) {
      const value = storedProgress.answers[it.id];
      if ([1, 2, 3].includes(value)) answers[it.id] = value;
    }
  }

  const notApplicableIds = new Set(
    Array.isArray(storedProgress?.notApplicableIds)
      ? storedProgress.notApplicableIds
          .map(String)
          .filter((id) => optionalItemIds.has(id))
      : []
  );

  return { answers, notApplicableIds };
}

function loadInitialSession() {
  const storedDiagnoses = readStoredDiagnoses();
  const unidad = UNIDADES.includes(storedDiagnoses.selectedUnit)
    ? storedDiagnoses.selectedUnit
    : "";

  return { unidad, ...loadUnitProgress(unidad, storedDiagnoses) };
}

function storeProgress(unidad, answers, notApplicableIds) {
  if (typeof window === "undefined") return;

  try {
    const storedDiagnoses = readStoredDiagnoses();
    const units = { ...storedDiagnoses.units };

    if (unidad) {
      units[unidad] = {
        answers,
        notApplicableIds: Array.from(notApplicableIds),
      };
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        selectedUnit: unidad,
        units,
      })
    );
  } catch {
    // La aplicación sigue funcionando si el navegador bloquea localStorage.
  }
}

function groupItems(itemsToGroup) {
  const byEje = new Map();

  for (const it of itemsToGroup) {
    const eje = it.eje ?? "Sin eje";
    const obj = it.objetivo ?? "Sin objetivo";

    if (!byEje.has(eje)) byEje.set(eje, new Map());
    const byObj = byEje.get(eje);

    if (!byObj.has(obj)) byObj.set(obj, []);
    byObj.get(obj).push(it);
  }

  return byEje;
}

const diagnosticTree = groupItems(items);

function Indicator({
  it,
  value,
  onPick,
  isApplicable,
  onApplicableChange,
}) {
  const isOptional = it.obligatorio === false;

  return (
    <article
      className={`indicator-card ${isApplicable ? "" : "is-not-applicable"}`}
    >
      <header className="indicator-header">
        <h4 className="indicator-title">
          <span className="indicator-code">{it.indicador}</span>
          <span>{it.nombre}</span>
        </h4>
        <p className="indicator-formula">{it.formula}</p>

        {isOptional && (
          <div className="optional-controls">
            <span className="optional-badge">Indicador adicional</span>
            <label className="applicability-toggle">
              <input
                type="checkbox"
                checked={isApplicable}
                onChange={(event) => onApplicableChange(event.target.checked)}
                aria-label={`${isApplicable ? "Marcar como no aplica" : "Incluir"}: ${it.nombre}`}
              />
              <span className="toggle-track" aria-hidden="true" />
              <span className="toggle-text">
                {isApplicable ? "Aplica" : "No aplica"}
              </span>
            </label>
          </div>
        )}
      </header>

      <div className="indicator-options">
        {LEVELS.map((level) => (
          <label
            key={`${it.id}-${level.id}`}
            className={`indicator-option ${value === level.id ? "is-selected" : ""} ${isApplicable ? "" : "is-disabled"}`}
          >
            <input
              type="radio"
              name={`ind-${it.id}`}
              checked={value === level.id}
              disabled={!isApplicable}
              onChange={() => onPick(level.id)}
            />
            <span className="option-title">{level.label}</span>
            <span className="option-desc">{it.niveles?.[level.key]}</span>
          </label>
        ))}
      </div>
    </article>
  );
}

export default function App() {
  const [initialSession] = useState(loadInitialSession);
  const [tab, setTab] = useState("diagnostico");
  const [unidad, setUnidad] = useState(initialSession.unidad);
  const [pdfStatus, setPdfStatus] = useState("idle"); // idle | working | error
  const [notApplicableIds, setNotApplicableIds] = useState(
    initialSession.notApplicableIds
  );
  const [answers, setAnswers] = useState(initialSession.answers);

  useEffect(() => {
    storeProgress(unidad, answers, notApplicableIds);
  }, [unidad, answers, notApplicableIds]);

  const setAnswer = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const setItemApplicable = (id, isApplicable) => {
    setNotApplicableIds((previousIds) => {
      const nextIds = new Set(previousIds);
      if (isApplicable) nextIds.delete(id);
      else nextIds.add(id);
      return nextIds;
    });
  };

  const changeUnidad = (nextUnidad) => {
    const nextProgress = loadUnitProgress(nextUnidad);
    setUnidad(nextUnidad);
    setAnswers(nextProgress.answers);
    setNotApplicableIds(nextProgress.notApplicableIds);
    setTab("diagnostico");
  };

  const hasProgress =
    Object.values(answers).some((value) => value > 0) ||
    notApplicableIds.size > 0;

  const clearProgress = () => {
    if (!unidad || !hasProgress) return;

    const shouldClear = window.confirm(
      `¿Deseas borrar todas las respuestas guardadas para ${unidad}?`
    );
    if (!shouldClear) return;

    setAnswers(createEmptyAnswers());
    setNotApplicableIds(new Set());
    setTab("diagnostico");
  };

  const activeItems = useMemo(() => {
    return items.filter((it) => !notApplicableIds.has(it.id));
  }, [notApplicableIds]);

  const stats = useMemo(() => {
    let c1 = 0;
    let c2 = 0;
    let c3 = 0;
    let answered = 0;

    for (const it of activeItems) {
      const v = answers[it.id] ?? 0;
      if (v > 0) answered += 1;
      if (v === 1) c1 += 1;
      if (v === 2) c2 += 1;
      if (v === 3) c3 += 1;
    }

    const total = activeItems.length;
    const progreso = total === 0 ? 0 : Math.round((answered / total) * 100);

    let nivel = "pendiente";
    if (answered > 0) {
      if (c1 >= c2 && c1 >= c3) nivel = "basica";
      else if (c2 >= c1 && c2 >= c3) nivel = "transversal";
      else nivel = "sistema";
    }

    return { c1, c2, c3, answered, total, progreso, nivel };
  }, [answers, activeItems]);

  const textoNivel = raw.niveles_texto?.[stats.nivel] ?? "";

  const resultsTree = useMemo(() => groupItems(activeItems), [activeItems]);

  const orderedEjes = useMemo(() => {
    const entries = Array.from(resultsTree.entries());
    const orderIndex = new Map(EJE_ORDER.map((eje, index) => [eje, index]));

    return entries.sort((a, b) => {
      const ai = orderIndex.get(a[0]) ?? Number.MAX_SAFE_INTEGER;
      const bi = orderIndex.get(b[0]) ?? Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return a[0].localeCompare(b[0], "es");
    });
  }, [resultsTree]);

  const downloadPdf = async () => {
    if (pdfStatus === "working") return;
    setPdfStatus("working");

    try {
      const { generateDiagnosticPdf } = await import("./lib/pdfReport");
      await generateDiagnosticPdf({
        unidad,
        stats,
        nivelLabel: NIVEL_LABELS[stats.nivel] ?? stats.nivel,
        textoNivel,
        ejes: orderedEjes.map(([eje, byObj]) => ({
          eje,
          color: EJE_COLORS[eje] ?? "#01602D",
          indicators: Array.from(byObj.values()).flat(),
          allIndicators: Array.from(diagnosticTree.get(eje)?.values() ?? []).flat(),
        })),
        answers,
        notApplicableIds,
      });
      setPdfStatus("idle");
    } catch (error) {
      console.error("No se pudo generar el PDF", error);
      setPdfStatus("error");
    }
  };

  const scrollToDiagnosticoTop = () => {
    const anchor = document.getElementById("diagnostico-top");
    anchor?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <h1>Diagnóstico de internacionalización</h1>
          <div className="hero-brand">
            <span className="hero-brand-main">Planes de internacionalización</span>
            <span className="hero-brand-sub">Universidad de Antioquia</span>
          </div>
          <p className="hero-text">
            Para facilitarle a las Unidades Académicas la reflexión sobre su
            estado en materia de internacionalización, se asociaron los ejes,
            objetivos e indicadores a los escenarios, determinando unos niveles
            de desarrollo de los indicadores, como se muestra en la siguiente
            herramienta. El propósito es que cada unidad pueda realizar un
            diagnóstico de su estado actual, con base en la información que
            tenga disponible, y a partir de esto, identificar los aspectos a
            fortalecer para avanzar en su proceso de internacionalización.
          </p>
        </div>
        <img className="hero-logo" src={shieldUrl} alt="Universidad de Antioquia" />
      </header>

      <section className="module-nav">
        <div className="field-block">
          <label htmlFor="unidad-select">Unidad académica</label>
          <select
            id="unidad-select"
            value={unidad}
            onChange={(e) => changeUnidad(e.target.value)}
          >
            <option value="">Seleccione una Unidad Académica</option>
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <span className="storage-note">
            El progreso se guarda automáticamente en este navegador.
          </span>
        </div>

        <div className="nav-actions">
          <div className="segmented" role="tablist" aria-label="Secciones">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "diagnostico"}
              className={tab === "diagnostico" ? "is-active" : ""}
              onClick={() => setTab("diagnostico")}
              disabled={!unidad}
            >
              Diagnóstico
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "resultados"}
              className={tab === "resultados" ? "is-active" : ""}
              onClick={() => setTab("resultados")}
              disabled={!unidad}
            >
              Resultados
            </button>
          </div>
          <button
            onClick={clearProgress}
            disabled={!unidad || !hasProgress}
            className="ghost-button danger"
            type="button"
          >
            Limpiar respuestas
          </button>
        </div>
      </section>

      <section className="kpi-grid">
        <article className="kpi" style={{ "--kpi-color": "#087f78" }}>
          <span className="kpi-label">Unidad académica</span>
          <strong className="kpi-value kpi-value-text">
            {unidad || "Sin seleccionar"}
          </strong>
        </article>

        <article className="kpi" style={{ "--kpi-color": "#2384a5" }}>
          <span className="kpi-label">Progreso</span>
          <strong className="kpi-value">
            {stats.answered}
            <small>/{stats.total}</small>
          </strong>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${stats.progreso}%` }} />
          </div>
        </article>

        <article className="kpi" style={{ "--kpi-color": "#21a179" }}>
          <span className="kpi-label">Nivel actual</span>
          <strong className="kpi-value">{NIVEL_LABELS[stats.nivel]}</strong>
          <span className="kpi-note">
            <span>
              Bajo <strong>{stats.c1}</strong>
            </span>
            <span>
              Medio <strong>{stats.c2}</strong>
            </span>
            <span>
              Alto <strong>{stats.c3}</strong>
            </span>
          </span>
        </article>
      </section>

      {unidad ? (
        <div className="info-strip">
          Los indicadores adicionales están incluidos por defecto. Si alguno no
          corresponde a la Unidad Académica, márcalo como &quot;No aplica&quot; para
          excluirlo del diagnóstico y los resultados.
        </div>
      ) : (
        <div className="info-strip is-warning">
          Selecciona una Unidad Académica para habilitar Diagnóstico y Resultados.
        </div>
      )}

      {tab === "diagnostico" && unidad && (
        <section className="diagnostico-view">
          <div id="diagnostico-top" />
          {Array.from(diagnosticTree.entries()).map(([eje, byObj]) => {
            const ejeItems = Array.from(byObj.values()).flat();
            const applicable = ejeItems.filter((it) => !notApplicableIds.has(it.id));
            const answeredCount = applicable.filter((it) => answers[it.id] > 0).length;
            const ejeColor = EJE_COLORS[eje] ?? "#087f78";

            return (
              <details
                key={eje}
                className="eje-card"
                style={{
                  "--eje-color": ejeColor,
                  "--eje-soft": hexToRgba(ejeColor, 0.07),
                }}
              >
                <summary className="eje-summary">
                  <span className="eje-name">{eje}</span>
                  <span
                    className={`eje-count ${answeredCount === applicable.length ? "is-done" : ""}`}
                  >
                    {answeredCount}/{applicable.length} respondidos
                  </span>
                </summary>

                <div className="eje-content">
                  {Array.from(byObj.entries()).map(([objetivo, list]) => (
                    <div key={`${eje}::${objetivo}`} className="objetivo-block">
                      <h3>{objetivo}</h3>
                      {list.map((it) => (
                        <Indicator
                          key={it.id}
                          it={it}
                          value={answers[it.id]}
                          onPick={(v) => setAnswer(it.id, v)}
                          isApplicable={!notApplicableIds.has(it.id)}
                          onApplicableChange={(isApplicable) =>
                            setItemApplicable(it.id, isApplicable)
                          }
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
          <div className="bottom-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={scrollToDiagnosticoTop}
            >
              Volver arriba
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => setTab("resultados")}
            >
              Ver resultados
            </button>
          </div>
        </section>
      )}

      {tab === "resultados" && unidad && (
        <section className="results-view">
          <div className="card results-header">
            <div className="results-heading">
              <div>
                <span className="eyebrow">Resultados del diagnóstico</span>
                <h2>{unidad}</h2>
                <p>
                  Respondidas {stats.answered}/{stats.total} · Nivel{" "}
                  <strong>{NIVEL_LABELS[stats.nivel]}</strong>
                </p>
              </div>
              <div className="download-row">
                <button
                  onClick={downloadPdf}
                  className="primary-button"
                  type="button"
                  disabled={pdfStatus === "working"}
                >
                  {pdfStatus === "working" ? "Generando PDF…" : "Descargar diagnóstico"}
                </button>
              </div>
            </div>
            {pdfStatus === "error" && (
              <p className="download-error" role="alert">
                No se pudo generar el PDF. Recarga la página e inténtalo de
                nuevo; tus respuestas están guardadas.
              </p>
            )}
            <div className="nivel-copy">{textoNivel}</div>
          </div>

          <div className="results-grid">
            {orderedEjes.map(([eje, byObj]) => {
              const indicators = Array.from(byObj.values()).flat();
              const ejeColor = EJE_COLORS[eje] ?? "#087f78";

              return (
                <div
                  key={`wrap-${eje}`}
                  className={`radar-wrap ${indicators.length >= 15 ? "is-dense" : ""}`}
                >
                  <RadarEje
                    titulo={eje}
                    indicators={indicators}
                    answers={answers}
                    color={ejeColor}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
