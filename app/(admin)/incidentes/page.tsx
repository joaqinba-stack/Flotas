import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role, IncidentStatus, IncidentUrgency } from "@/lib/data/types";
import { listIncidents } from "@/lib/data/incidents";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime } from "@/lib/format";

export default async function IncidentesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; urgency?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const params = await searchParams;
  const incidents = await listIncidents(session, {
    status: params.status && params.status in IncidentStatus ? (params.status as IncidentStatus) : undefined,
    urgency: params.urgency && params.urgency in IncidentUrgency ? (params.urgency as IncidentUrgency) : undefined,
  });

  return (
    <div>
      <div className="page-header">
        <h1>Incidencias</h1>
        <Link className="btn" href="/incidentes/nueva">Registrar incidencia</Link>
      </div>

      <form className="filter-bar" method="get">
        <div className="field">
          <label htmlFor="status">Estado</label>
          <select id="status" name="status" defaultValue={params.status ?? ""}>
            <option value="">Todos</option>
            <option value="OPEN">Abierta</option>
            <option value="IN_PROGRESS">En curso</option>
            <option value="WAITING_SUPPLIER">Esperando proveedor</option>
            <option value="RESOLVED">Resuelta</option>
            <option value="CLOSED">Cerrada</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="urgency">Urgencia</label>
          <select id="urgency" name="urgency" defaultValue={params.urgency ?? ""}>
            <option value="">Todas</option>
            <option value="CRITICAL">Crítica</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Media</option>
            <option value="LOW">Baja</option>
          </select>
        </div>
        <button className="btn secondary" type="submit">Filtrar</button>
      </form>

      <table className="data">
        <thead>
          <tr>
            <th>#</th>
            <th>Título</th>
            <th>Vehículo</th>
            <th>Conductor</th>
            <th>Ocurrió</th>
            <th>Urgencia</th>
            <th>Estado</th>
            <th>Actividad</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((i) => (
            <tr key={i.id}>
              <td className="mono">#{i.code}</td>
              <td><Link href={`/incidentes/${i.id}`}><strong>{i.title}</strong></Link></td>
              <td>{i.vehicle.plate}</td>
              <td>{i.driver ? `${i.driver.lastName}, ${i.driver.firstName}` : "—"}</td>
              <td>{fmtDateTime(i.occurredAt)}</td>
              <td><StatusBadge value={i.urgency} /></td>
              <td><StatusBadge value={i.status} /></td>
              <td className="muted">
                {i._count.notes} notas · {i._count.attachments} adjuntos · {i._count.serviceOrders} órdenes
              </td>
            </tr>
          ))}
          {incidents.length === 0 && <tr><td colSpan={8} className="muted">Sin incidencias en su alcance.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
