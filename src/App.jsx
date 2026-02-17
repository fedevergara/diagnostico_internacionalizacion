import { useMemo, useState } from "react";
import html2pdf from "html2pdf.js";
import raw from "./data/diagnostico.json";
import { normalizeItems } from "./lib/normalize";
import RadarEje from "./components/RadarEje";
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

function Indicator({ it, value, onPick }) {
  return (
    <article className="indicator-card">
      <header className="indicator-header">
        <h4 className="indicator-title">
          <span className="indicator-code">{it.indicador}</span>
          <span>{it.nombre}</span>
        </h4>
        <p className="indicator-formula">{it.formula}</p>
      </header>

      <div className="indicator-options">
        {LEVELS.map((level) => (
          <label
            key={`${it.id}-${level.id}`}
            className={`indicator-option ${value === level.id ? "is-selected" : ""}`}
          >
            <input
              type="radio"
              name={`ind-${it.id}`}
              checked={value === level.id}
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
  const [tab, setTab] = useState("diagnostico");
  const [unidad, setUnidad] = useState("");
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  const unidades = [
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

  const [answers, setAnswers] = useState(() => {
    const init = {};
    items.forEach((it) => {
      init[it.id] = 0;
    });
    return init;
  });

  const setAnswer = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const activeItems = useMemo(() => {
    if (unidad === "Facultad de Artes") {
      return items.filter((it) => it.obligatorio !== false);
    }
    return items;
  }, [unidad]);

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

  const tree = useMemo(() => {
    const byEje = new Map();

    for (const it of activeItems) {
      const eje = it.eje ?? "Sin eje";
      const obj = it.objetivo ?? "Sin objetivo";

      if (!byEje.has(eje)) byEje.set(eje, new Map());
      const byObj = byEje.get(eje);

      if (!byObj.has(obj)) byObj.set(obj, []);
      byObj.get(obj).push(it);
    }

    return byEje;
  }, [activeItems]);

  const orderedEjes = useMemo(() => {
    const entries = Array.from(tree.entries());
    const orderIndex = new Map(EJE_ORDER.map((eje, index) => [eje, index]));

    return entries.sort((a, b) => {
      const ai = orderIndex.get(a[0]) ?? Number.MAX_SAFE_INTEGER;
      const bi = orderIndex.get(b[0]) ?? Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return a[0].localeCompare(b[0], "es");
    });
  }, [tree]);

  const downloadPdf = async () => {
    if (tab !== "resultados") setTab("resultados");

    await new Promise((r) => setTimeout(r, 0));

    const element = document.getElementById("pdf");
    if (!element) return;

    setIsPdfExporting(true);
    await new Promise((r) => setTimeout(r, 220));
    window.dispatchEvent(new Event("resize"));
    await new Promise((r) => setTimeout(r, 220));

    try {
      await html2pdf()
        .from(element)
        .set({
          filename: "diagnostico-internacionalizacion.pdf",
          margin: 10,
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .save();
    } finally {
      setIsPdfExporting(false);
    }
  };

  const scrollToDiagnosticoTop = () => {
    const anchor = document.getElementById("diagnostico-top");
    anchor?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="app-shell">
      <div className="page-glow page-glow-a" />
      <div className="page-glow page-glow-b" />

      <header className="panel hero-panel">
        <p className="hero-kicker">Universidad de Antioquia</p>
        <h1>DIAGNÓSTICO - PLANES DE INTERNACIONALIZACIÓN</h1>
        <p className="hero-copy">
          Para facilitarle a las Unidades Académicas la reflexión sobre su estado en materia de internacionalización, se asociaron los ejes,
          objetivos e indicadores a los escenarios, determinando unos niveles de desarrollo de los indicadores, como se muestra en la siguiente herramienta.
        </p>
        <p className="hero-copy">
          El propósito es que cada unidad pueda realizar un diagnóstico de su estado actual, con base en la información que tenga disponible, y a partir de esto,
          identificar los aspectos a fortalecer para avanzar en su proceso de internacionalización.
        </p>
      </header>

      <section className="panel controls-panel">
        <div className="field-block">
          <label htmlFor="unidad-select">Unidad academica</label>
          <select
            id="unidad-select"
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
          >
            <option value="">Seleccione una Unidad Académica</option>
            {unidades.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div className="tabs-row">
          <button
            onClick={() => setTab("diagnostico")}
            disabled={tab === "diagnostico" || !unidad}
            className={`tab-button ${tab === "diagnostico" ? "is-active" : ""}`}
            type="button"
          >
            Diagnostico
          </button>
          <button
            onClick={() => setTab("resultados")}
            disabled={tab === "resultados" || !unidad}
            className={`tab-button ${tab === "resultados" ? "is-active" : ""}`}
            type="button"
          >
            Resultados
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="panel stat-card">
          <span className="stat-label">Unidad Académica</span>
          <strong className="stat-value unit-text">{unidad || "Sin seleccionar"}</strong>
        </article>

        <article className="panel stat-card">
          <span className="stat-label">Progreso</span>
          <strong className="stat-value">{stats.answered}/{stats.total}</strong>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${stats.progreso}%` }} />
          </div>
        </article>

        <article className="panel stat-card accent-green">
          <span className="stat-label">Nivel actual</span>
          <strong className="stat-value">{stats.nivel}</strong>
          <span className="stat-meta">
            Bajo {stats.c1} | Medio {stats.c2} | Alto {stats.c3}
          </span>
        </article>
      </section>

      {unidad === "Facultad de Artes" && (
        <div className="panel note-box">
          Para la Facultad de Artes, los indicadores no obligatorios no se incluyen en el diagnostico ni en los resultados.
        </div>
      )}

      {!unidad && (
        <div className="panel notice-box">
          Selecciona una Unidad Académica para habilitar Diagnostico y Resultados.
        </div>
      )}

      {tab === "diagnostico" && unidad && (
        <section className="diagnostico-view">
          <div id="diagnostico-top" />
          {Array.from(tree.entries()).map(([eje, byObj]) => (
            <details key={eje} className="panel eje-card">
              <summary className="eje-summary">{eje}</summary>

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
                      />
                    ))}
                  </div>
                ))}
              </div>
            </details>
          ))}
          <div className="diagnostico-bottom-actions">
            <button
              type="button"
              className="back-top-button"
              onClick={scrollToDiagnosticoTop}
            >
              Volver arriba
            </button>
            <button
              type="button"
              className="go-results-button"
              onClick={() => setTab("resultados")}
            >
              Resultados
            </button>
          </div>
        </section>
      )}

      {tab === "resultados" && unidad && (
        <section className="results-view">
          <div
            id="pdf"
            className={`pdf-area ${isPdfExporting ? "pdf-exporting" : ""}`}
          >
            <div className="pdf-header">
              <h2>Resultados del Diagnóstico</h2>
              <p>{unidad}</p>
              <p>
                Respondidas: {stats.answered}/{stats.total} | Nivel: {stats.nivel}
              </p>
            </div>

            <div className="nivel-copy">{textoNivel}</div>

            <div className="results-grid">
              {orderedEjes.map(([eje, byObj]) => {
                const indicators = Array.from(byObj.values()).flat();
                const radarKey = `radar-${eje}-${unidad}-${isPdfExporting ? "pdf" : "screen"}-${indicators
                  .map((it) => it.id)
                  .join("-")}`;
                const ejeColor = EJE_COLORS[eje] ?? "#01602D";

                return (
                  <div key={`wrap-${eje}`} className="radar-wrap">
                    <RadarEje
                      key={radarKey}
                      titulo={eje}
                      indicators={indicators}
                      answers={answers}
                      color={ejeColor}
                      forPdf={isPdfExporting}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={downloadPdf} className="download-button" type="button">
            Descargar diagnóstico
          </button>
        </section>
      )}
    </div>
  );
}
