import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role, AlertStatus, AlertType, AlertSeverity } from "@/lib/data/types";
import { listAlerts } from "@/lib/data/alerts";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime } from "@/lib/format";

export default async function AlertasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; severity?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR, Role.DESK_AGENT);
  const params = await searchParams;
  const alerts = await listAlerts(session, {
    status: params.status && params.status in AlertStatus ? (params.status as AlertStatus) : undefined,
    type: params.type && params.type in AlertType ? (params.type as AlertType) : undefined,
    severity: params.severity && params.severity in AlertSeverity ? (params.severity as AlertSeverity) : undefined,
  });

  return (
    <div>
      <h1>Alertas de telemetría</h1>

      <form className="filter-bar" method="get">
        <div className="field">
          <label htmlFor="status">Estado</label>
          <select id="status" name="status" defaultValue={params.status ?? ""}>
            <option value="">Todos</option>
            <option value="NEW">Nueva</option>
            <option value="ACKNOWLEDGED">Reconocida</option>
            <option value="RESOLVED">Resuelta</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="type">Tipo</label>
          <select id="type" name="type" defaultValue={params.type ?? ""}>
            <option value="">Todos</option>
            <option value="SPEEDING">Exceso de velocidad</option>
            <option value="GEOFENCE_ENTER">Ingreso a geocerca</option>
            <option value="GEOFENCE_EXIT">Salida de geocerca</option>
            <option value="DEVICE_DISCONNECTED">Dispositivo desconectado</option>
            <option value="UNAUTHORIZED_MOVEMENT">Movimiento no autorizado</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="severity">Severidad</label>
          <select id="severity" name="severity" defaultValue={params.severity ?? ""}>
            <option value="">Todas</option>
            <option value="CRITICAL">Crítica</option>
            <option value="WARNING">Advertencia</option>
            <option value="INFO">Informativa</option>
          </select>
        </div>
        <button className="btn secondary" type="submit">Filtrar</button>
      </form>

      <table className="data">
        <thead>
          <tr><th>Ocurrió</th><th>Vehículo</th><th>Tipo</th><th>Severidad</th><th>Mensaje</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id}>
              <td>{fmtDateTime(a.occurredAt)}</td>
              <td><Link href={`/flota/${a.vehicle.id}`}>{a.vehicle.plate}</Link></td>
              <td><StatusBadge value={a.type} /></td>
              <td><StatusBadge value={a.severity} /></td>
              <td>{a.message}</td>
              <td><Link href={`/alertas/${a.id}`}><StatusBadge value={a.status} /></Link></td>
            </tr>
          ))}
          {alerts.length === 0 && <tr><td colSpan={6} className="muted">Sin alertas en su alcance.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
