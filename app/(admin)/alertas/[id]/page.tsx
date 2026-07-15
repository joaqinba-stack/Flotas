import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getAlert } from "@/lib/data/alerts";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime } from "@/lib/format";
import { acknowledgeAlertAction } from "../actions";

export default async function AlertaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR, Role.DESK_AGENT);
  const { id } = await params;
  const [alert, sp] = await Promise.all([getAlert(session, id), searchParams]);
  const basePath = `/alertas/${id}`;

  return (
    <div>
      <div className="page-header">
        <h1><StatusBadge value={alert.type} /> <StatusBadge value={alert.severity} /> <StatusBadge value={alert.status} /></h1>
      </div>
      {sp.error && <p className="alert-error">{sp.error}</p>}

      <div className="card">
        <p>{alert.message}</p>
        <dl className="detail-grid">
          <div><dt>Vehículo</dt><dd><Link href={`/flota/${alert.vehicle.id}`}>{alert.vehicle.plate}</Link></dd></div>
          <div><dt>Geocerca</dt><dd>{alert.geofence ? <Link href={`/geocercas/${alert.geofence.id}`}>{alert.geofence.name}</Link> : "—"}</dd></div>
          <div><dt>Ocurrió</dt><dd>{fmtDateTime(alert.occurredAt)}</dd></div>
          <div><dt>Reconocida</dt><dd>{alert.acknowledgedBy ? `${alert.acknowledgedBy.name} — ${fmtDateTime(alert.acknowledgedAt)}` : "—"}</dd></div>
        </dl>
        {alert.status !== "RESOLVED" && (
          <div className="actions-row">
            {alert.status === "NEW" && (
              <form action={acknowledgeAlertAction.bind(null, id, basePath)}>
                <input type="hidden" name="status" value="ACKNOWLEDGED" />
                <button className="btn" type="submit">Reconocer</button>
              </form>
            )}
            <form action={acknowledgeAlertAction.bind(null, id, basePath)}>
              <input type="hidden" name="status" value="RESOLVED" />
              <button className="btn secondary" type="submit">Marcar resuelta</button>
            </form>
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Notificaciones enviadas</h2>
        <table className="data">
          <thead><tr><th>Canal</th><th>Destinatario</th><th>Estado</th><th>Enviada</th></tr></thead>
          <tbody>
            {alert.notifications.map((n) => (
              <tr key={n.id}>
                <td>{n.channel}</td>
                <td>{n.recipient}</td>
                <td>{n.status}</td>
                <td>{fmtDateTime(n.sentAt)}</td>
              </tr>
            ))}
            {alert.notifications.length === 0 && <tr><td colSpan={4} className="muted">Sin notificaciones registradas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
