import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listReportDefinitions } from "@/lib/data/reports";
import { DATASET_LABELS, type ReportDatasetId } from "@/lib/reports/definitions";
import { quickExportAllPositionsAction } from "./actions";

export default async function ReportesPage() {
  const session = await requireSession(Role.SUPERVISOR);
  const definitions = await listReportDefinitions(session);

  return (
    <div>
      <div className="page-header">
        <h1>Reportes</h1>
        <Link className="btn" href="/reportes/nuevo">Nueva definición</Link>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Historial de ubicaciones</h2>
        <p className="muted">
          Descarga en un solo paso todo el historial de posiciones registrado por los dispositivos
          dentro de tu alcance, sin filtrar nada — filtrá después en la planilla. El archivo se
          prepara en segundo plano y la descarga arranca sola apenas está listo.
        </p>
        <form action={quickExportAllPositionsAction}>
          <button className="btn" type="submit">Descargar todo el historial (XLSX)</button>
        </form>
      </div>

      <table className="data">
        <thead>
          <tr><th>Nombre</th><th>Dataset</th><th>Columnas</th><th>Creado por</th><th>Corridas</th></tr>
        </thead>
        <tbody>
          {definitions.map((d) => (
            <tr key={d.id}>
              <td><Link href={`/reportes/${d.id}`}><strong>{d.name}</strong></Link></td>
              <td>{DATASET_LABELS[d.dataset as ReportDatasetId]}</td>
              <td>{(d.columns as string[]).length}</td>
              <td>{d.createdBy.name}</td>
              <td>{d._count.runs}</td>
            </tr>
          ))}
          {definitions.length === 0 && <tr><td colSpan={5} className="muted">Sin definiciones de reporte todavía.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
