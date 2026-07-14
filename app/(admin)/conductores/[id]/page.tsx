import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getDriver } from "@/lib/data/drivers";
import { listPerformanceRecords } from "@/lib/data/performance-records";
import { listJornadas } from "@/lib/data/jornadas";
import { StatusBadge } from "@/components/badges";
import { PerformanceRecordList } from "@/components/performance-records";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { addPerformanceRecordAction } from "../actions";

export default async function ConductorDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const { id } = await params;
  const [driver, records, jornadas, sp] = await Promise.all([
    getDriver(session, id),
    listPerformanceRecords(session, id),
    listJornadas(session, { driverId: id }),
    searchParams,
  ]);

  return (
    <div>
      <div className="page-header">
        <h1>
          {driver.lastName}, {driver.firstName} <StatusBadge value={driver.status} />
        </h1>
        <Link className="btn secondary" href={`/conductores/${id}/editar`}>Editar</Link>
      </div>
      {sp.error && <p className="alert-error">{sp.error}</p>}

      <div className="card">
        <dl className="detail-grid">
          <div><dt>Documento</dt><dd>{driver.documentId}</dd></div>
          <div><dt>Licencia</dt><dd>{driver.licenseNumber} ({driver.licenseCategory})</dd></div>
          <div><dt>Vencimiento</dt><dd>{fmtDate(driver.licenseExpiry)}</dd></div>
          <div><dt>Teléfono</dt><dd>{driver.phone ?? "—"}</dd></div>
          <div><dt>Unidad organizacional</dt><dd>{driver.orgUnit.name}</dd></div>
          <div><dt>Acceso al portal</dt><dd>{driver.user ? `${driver.user.email}${driver.user.active ? "" : " (inactivo)"}` : "Sin login"}</dd></div>
          <div>
            <dt>Vehículos asignados</dt>
            <dd>
              {driver.assignedVehicles.length > 0
                ? driver.assignedVehicles.map((v) => (
                    <span key={v.id}>
                      <Link href={`/flota/${v.id}`}>{v.plate}</Link>{" "}
                    </span>
                  ))
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Legajo histórico de desempeño</h2>
        <PerformanceRecordList records={records} />
        <h3>Agregar registro (inmutable)</h3>
        <form className="filter-bar" action={addPerformanceRecordAction.bind(null, id)}>
          <div className="field">
            <label htmlFor="kind">Tipo</label>
            <select id="kind" name="kind" required defaultValue="OBSERVATION">
              <option value="COMMENDATION">Reconocimiento</option>
              <option value="SANCTION">Sanción</option>
              <option value="TRAINING">Capacitación</option>
              <option value="OBSERVATION">Observación</option>
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="summary">Resumen</label>
            <input id="summary" name="summary" required />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="details">Detalle</label>
            <input id="details" name="details" />
          </div>
          <div className="field" style={{ minWidth: 200 }}>
            <label htmlFor="jornadaId">Jornada vinculada</label>
            <select id="jornadaId" name="jornadaId" defaultValue="">
              <option value="">—</option>
              {jornadas.map((j) => (
                <option key={j.id} value={j.id}>{j.purpose} ({fmtDate(j.plannedStart)})</option>
              ))}
            </select>
          </div>
          <button className="btn" type="submit">Registrar</button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Jornadas del conductor</h2>
        <table className="data">
          <thead><tr><th>Propósito</th><th>Vehículo</th><th>Inicio</th><th>Estado</th></tr></thead>
          <tbody>
            {jornadas.slice(0, 20).map((j) => (
              <tr key={j.id}>
                <td><Link href={`/jornadas/${j.id}`}>{j.purpose}</Link></td>
                <td>{j.vehicle.plate}</td>
                <td>{fmtDateTime(j.plannedStart)}</td>
                <td><StatusBadge value={j.status} /></td>
              </tr>
            ))}
            {jornadas.length === 0 && <tr><td colSpan={4} className="muted">Sin jornadas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
