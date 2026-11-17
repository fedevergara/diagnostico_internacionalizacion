import { useState } from "react";
import Modal from "./Modal";

export default function LoadExcelDialog({ onDownloadTemplate, onSelectFile, onClose }) {
  const [templateState, setTemplateState] = useState("idle"); // idle | working | done | error

  const downloadTemplate = async () => {
    setTemplateState("working");
    try {
      await onDownloadTemplate();
      setTemplateState("done");
    } catch (error) {
      console.error("No se pudo generar la plantilla", error);
      setTemplateState("error");
    }
  };

  return (
    <Modal labelledBy="load-excel-title" onClose={onClose}>
      <span className="eyebrow">Excel</span>
      <h3 id="load-excel-title">Cargar respuestas desde Excel</h3>

      <div className="load-options">
        <section className="load-option">
          <h4>¿Ya tiene el archivo?</h4>
          <p>
            Cargue el Excel descargado con el diagnóstico o una plantilla ya
            diligenciada. Antes de reemplazar respuestas verá un resumen.
          </p>
          <button type="button" className="primary-button" onClick={onSelectFile}>
            Seleccionar archivo
          </button>
        </section>

        <section className="load-option">
          <h4>¿Prefiere diligenciarlo en Excel?</h4>
          <p>
            Descargue una plantilla en blanco con los indicadores. Elija Bajo,
            Medio o Alto en cada fila y luego cárguela aquí.
          </p>
          <button
            type="button"
            className="ghost-button"
            onClick={downloadTemplate}
            disabled={templateState === "working"}
          >
            {templateState === "working"
              ? "Generando plantilla…"
              : templateState === "done"
                ? "Plantilla descargada ✓"
                : "Descargar plantilla"}
          </button>
          {templateState === "error" && (
            <p className="download-error" role="alert">
              No se pudo generar la plantilla. Inténtelo de nuevo.
            </p>
          )}
        </section>
      </div>

      <div className="modal-actions">
        <button type="button" className="ghost-button" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
