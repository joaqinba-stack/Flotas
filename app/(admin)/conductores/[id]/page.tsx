import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getDriver } from "@/lib/data/drivers";
import { listPerformanceRecords } from "@/lib/data/performance-records";
import { listJornadas } from "@/lib/data/jornadas";
import { StatusBadge } from "@/components/badges";
import { PerformanceRecordList } from "@/components/performance-records";
import { fmtDate, fmtDateTime } from "@/lib/format";
import {
  addPerformanceRecordAction,
  provisionDriverDeviceAction,
  updateDriverDeviceAction,
  removeDriverDeviceAction,
} from "../actions";

export default async function ConductorDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; warning?: string }>;
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
      {sp.warning && <p className="alert-warn">{sp.warning}</p>}

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
        <h2 style={{ marginTop: 0 }}>Rastreo por celular (Traccar Client)</h2>
        {driver.device ? (
          <>
            <dl className="detail-grid">
              <div><dt>Identificador del dispositivo</dt><dd className="mono">{driver.device.uniqueId}</dd></div>
              <div><dt>Estado de conexión</dt><dd><StatusBadge value={driver.device.connectionStatus} /></dd></div>
              <div><dt>Última señal</dt><dd>{fmtDateTime(driver.device.lastSeenAt)}</dd></div>
              <div>
                <dt>Sync con Traccar</dt>
                <dd>
                  <StatusBadge value={driver.device.traccarId !== null ? "SYNC_OK" : "SYNC_PENDING"} />
                  {driver.device.traccarId !== null && <span className="muted"> id {driver.device.traccarId}</span>}
                </dd>
              </div>
            </dl>
            {driver.device.traccarId === null && (
              <p className="alert-warn">
                Este equipo existe solo en la app: nunca se dio de alta en Traccar, así que no va a
                recibir posiciones. El worker lo reintenta en cada ciclo de polling.
              </p>
            )}
            <form className="filter-bar" action={updateDriverDeviceAction.bind(null, id, driver.device.id)}>
              <div className="field">
                <label htmlFor="deviceName">Nombre</label>
                <input id="deviceName" name="name" required defaultValue={driver.device.name} />
              </div>
              <div className="field">
                <label htmlFor="monitoringIntervalSeconds">Intervalo de monitoreo (s)</label>
                <input
                  id="monitoringIntervalSeconds"
                  name="monitoringIntervalSeconds"
                  type="number"
                  required
                  defaultValue={driver.device.monitoringIntervalSeconds}
                />
              </div>
              <button className="btn" type="submit">Guardar</button>
            </form>
            <form action={removeDriverDeviceAction.bind(null, id, driver.device.id)}>
              <button className="btn danger small" type="submit">Quitar dispositivo</button>
            </form>
          </>
        ) : (
          <>
            <p className="muted">
              Registrá acá el identificador que vas a configurar en la app Traccar Client del celular
              del conductor (protocolo OsmAnd, puerto 5055).
            </p>
            <form className="filter-bar" action={provisionDriverDeviceAction.bind(null, id)}>
              <div className="field">
                <label htmlFor="uniqueId">Identificador del dispositivo</label>
                <input id="uniqueId" name="uniqueId" required placeholder={`conductor-${driver.documentId}`} />
              </div>
              <div className="field">
                <label htmlFor="deviceName">Nombre</label>
                <input id="deviceName" name="name" required defaultValue={`${driver.firstName} ${driver.lastName}`} />
              </div>
              <div className="field">
                <label htmlFor="monitoringIntervalSeconds">Intervalo (s)</label>
                <input id="monitoringIntervalSeconds" name="monitoringIntervalSeconds" type="number" required defaultValue={60} />
              </div>
              <button className="btn" type="submit">Provisionar</button>
            </form>
          </>
        )}
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
