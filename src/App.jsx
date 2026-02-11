import { useMemo, useState } from "react";
import raw from "./data/diagnostico.json";
import { normalizeItems } from "./lib/normalize";
import RadarEje from "./components/RadarEje";
import html2pdf from "html2pdf.js";

const items = normalizeItems(raw.items);

function Indicator({ it, value, onPick }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
      }}
    >
      <div>
        <b>{it.indicador}</b> — {it.nombre}
      </div>
      <div style={{ fontSize: 13, opacity: 0.8 }}>{it.formula}</div>

      <div style={{ display: "flex", gap: 40, marginTop: 8, flexWrap: "wrap" }}>
        <label style={{ maxWidth: 280 }}>
          <input
            type="radio"
            name={`ind-${it.id}`}
            checked={value === 1}
            onChange={() => onPick(1)}
          />{" "}
          Básica
          <div style={{ fontSize: 12, opacity: 0.9 }}>{it.niveles?.basica}</div>
        </label>

        <label style={{ maxWidth: 280 }}>
          <input
            type="radio"
            name={`ind-${it.id}`}
            checked={value === 2}
            onChange={() => onPick(2)}
          />{" "}
          Transversal
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            {it.niveles?.transversal}
          </div>
        </label>

        <label style={{ maxWidth: 280 }}>
          <input
            type="radio"
            name={`ind-${it.id}`}
            checked={value === 3}
            onChange={() => onPick(3)}
          />{" "}
          Sistema
          <div style={{ fontSize: 12, opacity: 0.9 }}>{it.niveles?.sistema}</div>
        </label>
      </div>
    </div>
  );
}

export default function App() {
  // Tabs
  const [tab, setTab] = useState("diagnostico"); // "diagnostico" | "resultados"

  // Answers = Hoja2!F2:F51 (0/1/2/3)
  const [answers, setAnswers] = useState(() => {
    const init = {};
    items.forEach((it) => (init[it.id] = 0));
    return init;
  });

  const setAnswer = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  // Stats (derivados)
  const stats = useMemo(() => {
    let c1 = 0,
      c2 = 0,
      c3 = 0,
      answered = 0;

    for (const v of Object.values(answers)) {
      if (v > 0) answered++;
      if (v === 1) c1++;
      if (v === 2) c2++;
      if (v === 3) c3++;
    }

    const total = Object.keys(answers).length;

    let nivel = "pendiente";
    if (answered > 0) {
      if (c1 >= c2 && c1 >= c3) nivel = "basica";
      else if (c2 >= c1 && c2 >= c3) nivel = "transversal";
      else nivel = "sistema";
    }

    return { c1, c2, c3, answered, total, nivel };
  }, [answers]);

  const textoNivel = raw.niveles_texto?.[stats.nivel] ?? "";

  // Agrupación: Eje -> Objetivo -> items
  const tree = useMemo(() => {
    const byEje = new Map();

    for (const it of items) {
      const eje = it.eje ?? "Sin eje";
      const obj = it.objetivo ?? "Sin objetivo";

      if (!byEje.has(eje)) byEje.set(eje, new Map());
      const byObj = byEje.get(eje);

      if (!byObj.has(obj)) byObj.set(obj, []);
      byObj.get(obj).push(it);
    }

    return byEje;
  }, []);

  // Función para descargar PDF usando html2pdf
  const downloadPdf = async () => {
  // Asegura que estás en Resultados (por si llamas el botón desde otro lado)
  if (tab !== "resultados") setTab("resultados");

  // Espera 1 tick para que el DOM y los canvas estén listos
  await new Promise((r) => setTimeout(r, 0));

  const element = document.getElementById("pdf");
  if (!element) return;

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
  };

  // UI helpers
  const TabButton = ({ id, children }) => (
    <button
      onClick={() => setTab(id)}
      disabled={tab === id}
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        border: "1px solid #ddd",
        cursor: tab === id ? "default" : "pointer",
        opacity: tab === id ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Diagnóstico de Internacionalización</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <TabButton id="diagnostico">Diagnóstico</TabButton>
        <TabButton id="resultados">Resultados</TabButton>
      </div>

      {/* Stats mini bar */}
      <div
        style={{
          marginBottom: 14,
          padding: 12,
          border: "1px solid #eee",
          borderRadius: 12,
        }}
      >
        Respondidas: {stats.answered}/{stats.total} · Nivel: <b>{stats.nivel}</b>{" "}
        · (Básica {stats.c1} / Transversal {stats.c2} / Sistema {stats.c3})
      </div>

      {/* TAB: Diagnóstico (acordeón por eje) */}
      {tab === "diagnostico" && (
        <div>
          {Array.from(tree.entries()).map(([eje, byObj]) => (
            <details
              key={eje}
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 10,
                marginBottom: 10,
                background: "white",
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: 800 }}>
                {eje}
              </summary>

              <div style={{ marginTop: 10 }}>
                {Array.from(byObj.entries()).map(([objetivo, list]) => (
                  <div
                    key={`${eje}::${objetivo}`}
                    style={{ marginBottom: 16 }}
                  >
                    <h3 style={{ margin: "8px 0" }}>{objetivo}</h3>

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
        </div>
      )}

      {/* TAB: Resultados (radares + texto + pdf) */}
      {tab === "resultados" && (
        <div>
          {/* TODO lo que quieras en el PDF debe vivir dentro de #pdf */}
          <div id="pdf" style={{ background: "white", padding: 16 }}>
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                border: "1px solid #eee",
                borderRadius: 12,
              }}
            >
              Respondidas: {stats.answered}/{stats.total} · Nivel: <b>{stats.nivel}</b>{" "}
              · (Básica {stats.c1} / Transversal {stats.c2} / Sistema {stats.c3})
            </div>

            <div
              style={{
                padding: 12,
                border: "1px solid #eee",
                borderRadius: 12,
                marginBottom: 14,
                whiteSpace: "pre-wrap",
              }}
            >
              {textoNivel}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 12,
                marginBottom: 14,
              }}
            >
              {Array.from(tree.entries()).map(([eje, byObj]) => {
                const indicators = Array.from(byObj.values()).flat();
                return (
                  <div key={`wrap-${eje}`} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                    <RadarEje
                      key={`radar-${eje}`}
                      titulo={eje}
                      indicators={indicators}
                      answers={answers}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={downloadPdf}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              cursor: "pointer",
            }}
          >
            Descargar Diagnóstico
          </button>
        </div>
      )}
    </div>
  );
}
