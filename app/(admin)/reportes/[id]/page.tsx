import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getReportDefinition, listReportRuns } from "@/lib/data/reports";
import { DATASET_COLUMNS, DATASET_LABELS, type ReportDatasetId } from "@/lib/reports/definitions";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime } from "@/lib/format";
import { queueReportRunAction } from "../actions";

export default async function DefinicionReportePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const { id } = await params;
  const [definition, runs, sp] = await Promise.all([
    getReportDefinition(session, id),
    listReportRuns(session, id),
    searchParams,
  ]);
  const dataset = definition.dataset as ReportDatasetId;
  const selectedColumns = definition.columns as string[];

  return (
    <div>
      <h1>{definition.name}</h1>
      <p className="muted">{DATASET_LABELS[dataset]}{definition.description ? ` — ${definition.description}` : ""}</p>
      {sp.error && <p className="alert-error">{sp.error}</p>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Columnas</h2>
        <p>{DATASET_COLUMNS[dataset].filter((c) => selectedColumns.includes(c.key)).map((c) => c.label).join(", ")}</p>
        <h2>Filtros por defecto</h2>
        <pre className="mono">{JSON.stringify(definition.filters, null, 2)}</pre>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Generar corrida</h2>
        <form className="filter-bar" action={queueReportRunAction.bind(null, id)}>
          <div className="field">
            <label htmlFor="format">Formato</label>
            <select id="format" name="format" defaultValue="PDF">
              <option value="PDF">PDF</option>
              <option value="XLSX">XLSX</option>
              <option value="CSV">CSV</option>
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="filterOverrides">Filtros puntuales (JSON, opcional, sobrescriben los de la definición)</label>
            <input id="filterOverrides" name="filterOverrides" className="mono" placeholder="{}" />
          </div>
          <button className="btn" type="submit">Generar</button>
        </form>
        <p className="muted">La generación es asíncrona: el worker la procesa en segundos y esta lista se actualiza al recargar.</p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Corridas</h2>
        <table className="data">
          <thead><tr><th>Solicitada</th><th>Formato</th><th>Estado</th><th>Filas</th><th>Solicitado por</th><th>Descarga</th></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{fmtDateTime(r.createdAt)}</td>
                <td>{r.format}</td>
                <td><StatusBadge value={r.status} /></td>
                <td>{r.rowCount ?? "—"}</td>
                <td>{r.requestedBy.name}</td>
                <td>
                  {r.status === "COMPLETED" ? (
                    <a href={`/api/report-runs/${r.id}/download`}>Descargar</a>
                  ) : r.status === "FAILED" ? (
                    <span className="muted" title={r.error ?? undefined}>Error</span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {runs.length === 0 && <tr><td colSpan={6} className="muted">Sin corridas todavía.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
