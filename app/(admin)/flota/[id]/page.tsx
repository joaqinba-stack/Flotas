import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getVehicle } from "@/lib/data/vehicles";
import { listDrivers } from "@/lib/data/drivers";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime, fmtNumber } from "@/lib/format";
import {
  changeVehicleStatusAction,
  assignDriverAction,
  provisionDeviceAction,
  updateDeviceAction,
  removeDeviceAction,
} from "../actions";

export default async function VehiculoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; warning?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const { id } = await params;
  const [vehicle, drivers, sp] = await Promise.all([
    getVehicle(session, id),
    listDrivers(session),
    searchParams,
  ]);
  const device = vehicle.traccarDevice;

  return (
    <div>
      <div className="page-header">
        <h1>
          {vehicle.plate} <StatusBadge value={vehicle.status} />
        </h1>
        <div className="actions-row">
          <Link className="btn secondary" href={`/flota/${id}/historial`}>Historial de posiciones</Link>
          <Link className="btn secondary" href={`/flota/${id}/editar`}>Editar</Link>
        </div>
      </div>
      {sp.error && <p className="alert-error">{sp.error}</p>}
      {sp.warning && <p className="alert-warn">{sp.warning}</p>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Legajo operativo</h2>
        <dl className="detail-grid">
          <div><dt>Vehículo</dt><dd>{vehicle.brand} {vehicle.model} ({vehicle.year})</dd></div>
          <div><dt>Tipo</dt><dd>{vehicle.type}</dd></div>
          <div><dt>Combustible</dt><dd>{vehicle.fuelType}</dd></div>
          <div><dt>Tanque</dt><dd>{vehicle.tankCapacityLiters ? `${vehicle.tankCapacityLiters} L` : "—"}</dd></div>
          <div><dt>Odómetro</dt><dd>{fmtNumber(vehicle.odometerKm)} km</dd></div>
          <div><dt>Unidad organizacional</dt><dd>{vehicle.orgUnit.name}</dd></div>
          <div>
            <dt>Conductor asignado</dt>
            <dd>
              {vehicle.currentDriver
                ? `${vehicle.currentDriver.lastName}, ${vehicle.currentDriver.firstName}`
                : "Sin asignar"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Cambiar estado</h2>
        <form className="filter-bar" action={changeVehicleStatusAction.bind(null, id)}>
          <div className="field">
            <label htmlFor="toStatus">Nuevo estado</label>
            <select id="toStatus" name="toStatus" required defaultValue="">
              <option value="" disabled>Seleccionar…</option>
              <option value="ACTIVE">Activo</option>
              <option value="IN_MAINTENANCE">En mantenimiento</option>
              <option value="OUT_OF_SERVICE">Fuera de servicio</option>
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="reason">Motivo</label>
            <input id="reason" name="reason" placeholder="Opcional" />
          </div>
          <button className="btn" type="submit">Aplicar</button>
        </form>

        <h2>Asignar conductor</h2>
        <form className="filter-bar" action={assignDriverAction.bind(null, id)}>
          <div className="field" style={{ minWidth: 260 }}>
            <label htmlFor="driverId">Conductor</label>
            <select id="driverId" name="driverId" defaultValue={vehicle.currentDriverId ?? ""}>
              <option value="">Sin asignar</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.lastName}, {d.firstName} — {d.orgUnit.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn" type="submit">Asignar</button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Dispositivo GPS (Traccar)</h2>
        {device ? (
          <>
            <dl className="detail-grid">
              <div><dt>Identificador (IMEI)</dt><dd className="mono">{device.uniqueId}</dd></div>
              <div><dt>Estado de conexión</dt><dd><StatusBadge value={device.connectionStatus} /></dd></div>
              <div><dt>Última señal</dt><dd>{fmtDateTime(device.lastSeenAt)}</dd></div>
              <div>
                <dt>Sync con Traccar</dt>
                <dd>
                  <StatusBadge value={device.traccarId !== null ? "SYNC_OK" : "SYNC_PENDING"} />
                  {device.traccarId !== null && <span className="muted"> id {device.traccarId}</span>}
                </dd>
              </div>
            </dl>
            {device.traccarId === null && (
              <p className="alert-warn">
                Este equipo existe solo en la app: nunca se dio de alta en Traccar, así que no va a
                recibir posiciones. El worker (<code>npm run worker</code>) lo reintenta en cada ciclo
                de polling; si no está corriendo, no se va a sincronizar solo.
              </p>
            )}
            <form className="filter-bar" action={updateDeviceAction.bind(null, id, device.id)}>
              <div className="field">
                <label htmlFor="name">Nombre</label>
                <input id="name" name="name" required defaultValue={device.name} />
              </div>
              <div className="field">
                <label htmlFor="monitoringIntervalSeconds">Intervalo de monitoreo (s)</label>
                <input
                  id="monitoringIntervalSeconds"
                  name="monitoringIntervalSeconds"
                  type="number"
                  required
                  defaultValue={device.monitoringIntervalSeconds}
                />
              </div>
              <button className="btn" type="submit">Guardar</button>
            </form>
            <form action={removeDeviceAction.bind(null, id, device.id)}>
              <button className="btn danger small" type="submit">Quitar dispositivo</button>
            </form>
          </>
        ) : (
          <form className="filter-bar" action={provisionDeviceAction.bind(null, id)}>
            <div className="field">
              <label htmlFor="uniqueId">Identificador (IMEI)</label>
              <input id="uniqueId" name="uniqueId" required />
            </div>
            <div className="field">
              <label htmlFor="name">Nombre</label>
              <input id="name" name="name" required defaultValue={vehicle.plate} />
            </div>
            <div className="field">
              <label htmlFor="monitoringIntervalSeconds">Intervalo (s)</label>
              <input id="monitoringIntervalSeconds" name="monitoringIntervalSeconds" type="number" required defaultValue={60} />
            </div>
            <button className="btn" type="submit">Provisionar</button>
          </form>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Historial de estados</h2>
        <table className="data">
          <thead>
            <tr><th>Fecha</th><th>De</th><th>A</th><th>Motivo</th><th>Usuario</th></tr>
          </thead>
          <tbody>
            {vehicle.statusHistory.map((h) => (
              <tr key={h.id}>
                <td>{fmtDateTime(h.createdAt)}</td>
                <td>{h.fromStatus ? <StatusBadge value={h.fromStatus} /> : "—"}</td>
                <td><StatusBadge value={h.toStatus} /></td>
                <td>{h.reason ?? "—"}</td>
                <td>{h.changedBy.name}</td>
              </tr>
            ))}
            {vehicle.statusHistory.length === 0 && (
              <tr><td colSpan={5} className="muted">Sin cambios registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
