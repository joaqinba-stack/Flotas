import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { DATASET_COLUMNS, DATASET_LABELS, validDatasetId } from "@/lib/reports/definitions";
import { createReportDefinitionAction } from "../actions";

export default async function NuevaDefinicionReportePage({
  searchParams,
}: {
  searchParams: Promise<{ dataset?: string; error?: string }>;
}) {
  await requireSession(Role.SUPERVISOR);
  const params = await searchParams;

  if (!params.dataset || !validDatasetId(params.dataset)) {
    return (
      <div>
        <h1>Nueva definición de reporte</h1>
        <p className="muted">Elija el conjunto de datos sobre el que se construirá el reporte.</p>
        <div className="card">
          <ul>
            {Object.entries(DATASET_LABELS).map(([id, label]) => (
              <li key={id} style={{ marginBottom: 8 }}>
                <Link className="btn secondary" href={`/reportes/nuevo?dataset=${id}`}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const dataset = params.dataset;
  const columns = DATASET_COLUMNS[dataset];

  return (
    <div>
      <h1>Nueva definición de reporte — {DATASET_LABELS[dataset]}</h1>
      {params.error && <p className="alert-error">{params.error}</p>}
      <div className="card">
        <form className="stack" action={createReportDefinitionAction}>
          <input type="hidden" name="dataset" value={dataset} />
          <div className="field">
            <label htmlFor="name">Nombre</label>
            <input id="name" name="name" required />
          </div>
          <div className="field">
            <label htmlFor="description">Descripción</label>
            <input id="description" name="description" />
          </div>
          <div className="field">
            <label>Columnas</label>
            {columns.map((c) => (
              <label key={c.key} style={{ display: "block", fontWeight: 400, fontSize: 13 }}>
                <input type="checkbox" name="columns" value={c.key} defaultChecked /> {c.label}
              </label>
            ))}
          </div>
          <div className="field">
            <label htmlFor="filters">
              Filtros por defecto — JSON según el dataset (ej: {"{"}&quot;status&quot;:&quot;ACTIVE&quot;{"}"})
            </label>
            <textarea id="filters" name="filters" rows={3} className="mono" defaultValue="{}" />
          </div>
          <div className="actions-row">
            <button className="btn" type="submit">Crear definición</button>
            <Link className="btn secondary" href="/reportes/nuevo">Cambiar dataset</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
