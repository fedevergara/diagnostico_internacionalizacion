import { useEffect, useRef, useState } from "react";

export default function ImportDialog({
  data,
  unidades,
  currentUnit,
  countStoredAnswers,
  onConfirm,
  onCancel,
}) {
  const fileUnitIsKnown = unidades.includes(data.unidad);
  const [target, setTarget] = useState(
    fileUnitIsKnown ? data.unidad : currentUnit || ""
  );
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const stored = target ? countStoredAnswers(target) : 0;
  const fecha = data.fecha
    ? data.fecha.toLocaleString("es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No indicada";

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
      >
        <span className="eyebrow">Recuperar diagnóstico</span>
        <h3 id="import-title">Cargar respuestas desde Excel</h3>
        <p className="modal-file">{data.fileName}</p>

        <dl className="modal-facts">
          <div>
            <dt>Unidad en el archivo</dt>
            <dd>{data.unidad || "No indicada"}</dd>
          </div>
          <div>
            <dt>Descargado</dt>
            <dd>{fecha}</dd>
          </div>
          <div>
            <dt>Respondidos</dt>
            <dd>
              {data.counts.answered}/{data.total}
            </dd>
          </div>
          <div>
            <dt>Distribución</dt>
            <dd>
              Bajo {data.counts.c1} · Medio {data.counts.c2} · Alto{" "}
              {data.counts.c3}
            </dd>
          </div>
          <div>
            <dt>No aplica</dt>
            <dd>{data.counts.notApplicable}</dd>
          </div>
        </dl>

        <div className="field-block modal-field">
          <label htmlFor="import-target">Cargar en la unidad académica</label>
          <select
            id="import-target"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          >
            <option value="">Seleccione una Unidad Académica</option>
            {unidades.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {data.unidad && target && target !== data.unidad && (
          <p className="modal-note is-warning">
            El archivo corresponde a <strong>{data.unidad}</strong>. Verifique
            que desea cargarlo en <strong>{target}</strong>.
          </p>
        )}

        {data.warnings.length > 0 && (
          <ul className="modal-note is-warning">
            {data.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}

        {target && (
          <p className="modal-note">
            {stored > 0
              ? `Se reemplazarán las ${stored} respuestas guardadas de ${target} en este navegador.`
              : `${target} no tiene respuestas guardadas en este navegador.`}
          </p>
        )}

        <div className="modal-actions">
          <button
            ref={cancelRef}
            type="button"
            className="ghost-button"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!target}
            onClick={() => onConfirm(target)}
          >
            Cargar respuestas
          </button>
        </div>
      </div>
    </div>
  );
}
