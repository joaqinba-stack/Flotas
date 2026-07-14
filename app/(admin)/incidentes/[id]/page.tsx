import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getIncident } from "@/lib/data/incidents";
import { listSuppliers } from "@/lib/data/suppliers";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime } from "@/lib/format";
import {
  classifyIncidentAction,
  addIncidentNoteAction,
  addIncidentAttachmentAction,
  dispatchServiceOrderAction,
} from "../actions";

export default async function IncidenteDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const { id } = await params;
  const [incident, suppliers, sp] = await Promise.all([
    getIncident(session, id),
    listSuppliers(session),
    searchParams,
  ]);
  const basePath = `/incidentes/${id}`;

  return (
    <div>
      <div className="page-header">
        <h1>
          Incidencia #{incident.code} <StatusBadge value={incident.urgency} /> <StatusBadge value={incident.status} />
        </h1>
      </div>
      {sp.error && <p className="alert-error">{sp.error}</p>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{incident.title}</h2>
        <p>{incident.description}</p>
        <dl className="detail-grid">
          <div><dt>Vehículo</dt><dd><Link href={`/flota/${incident.vehicle.id}`}>{incident.vehicle.plate}</Link> — {incident.vehicle.brand} {incident.vehicle.model}</dd></div>
          <div><dt>Conductor</dt><dd>{incident.driver ? <Link href={`/conductores/${incident.driver.id}`}>{incident.driver.lastName}, {incident.driver.firstName}</Link> : "—"}</dd></div>
          <div><dt>Jornada</dt><dd>{incident.jornada ? <Link href={`/jornadas/${incident.jornada.id}`}>{incident.jornada.purpose}</Link> : "—"}</dd></div>
          <div><dt>Categoría</dt><dd>{incident.category}</dd></div>
          <div><dt>Ocurrió</dt><dd>{fmtDateTime(incident.occurredAt)}</dd></div>
          <div><dt>Reportada por</dt><dd>{incident.reportedBy.name}</dd></div>
          <div><dt>Resuelta</dt><dd>{fmtDateTime(incident.resolvedAt)}</dd></div>
        </dl>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Clasificación y estado</h2>
        <form className="filter-bar" action={classifyIncidentAction.bind(null, id)}>
          <div className="field">
            <label htmlFor="urgency">Urgencia</label>
            <select id="urgency" name="urgency" defaultValue={incident.urgency}>
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Crítica</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="category">Categoría</label>
            <input id="category" name="category" defaultValue={incident.category} />
          </div>
          <div className="field">
            <label htmlFor="status">Estado</label>
            <select id="status" name="status" defaultValue={incident.status}>
              <option value="OPEN">Abierta</option>
              <option value="IN_PROGRESS">En curso</option>
              <option value="WAITING_SUPPLIER">Esperando proveedor</option>
              <option value="RESOLVED">Resuelta</option>
              <option value="CLOSED">Cerrada</option>
            </select>
          </div>
          <button className="btn" type="submit">Actualizar</button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Órdenes de servicio</h2>
        <table className="data">
          <thead><tr><th>N°</th><th>Proveedor</th><th>Título</th><th>Estado</th></tr></thead>
          <tbody>
            {incident.serviceOrders.map((o) => (
              <tr key={o.id}>
                <td className="mono"><Link href={`/ordenes/${o.id}`}>#{o.orderNumber}</Link></td>
                <td>{o.supplier.name}</td>
                <td>{o.title}</td>
                <td><StatusBadge value={o.status} /></td>
              </tr>
            ))}
            {incident.serviceOrders.length === 0 && <tr><td colSpan={4} className="muted">Sin órdenes despachadas.</td></tr>}
          </tbody>
        </table>

        {incident.status !== "CLOSED" && (
          <>
            <h3>Despachar a proveedor</h3>
            <form className="stack" action={dispatchServiceOrderAction.bind(null, id)}>
              <input type="hidden" name="vehicleId" value={incident.vehicle.id} />
              <div className="form-row">
                <div className="field">
                  <label htmlFor="supplierId">Proveedor</label>
                  <select id="supplierId" name="supplierId" required defaultValue="">
                    <option value="" disabled>Seleccionar…</option>
                    {suppliers.filter((s) => s.active).map((s) => (
                      <option key={s.id} value={s.id}>{s.name} — {s.serviceTypes}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="costEstimate">Costo estimado</label>
                  <input id="costEstimate" name="costEstimate" type="number" step="0.01" />
                </div>
                <div className="field">
                  <label htmlFor="scheduledFor">Programada para</label>
                  <input id="scheduledFor" name="scheduledFor" type="datetime-local" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="title">Título de la orden</label>
                <input id="title" name="title" required defaultValue={`Incidencia #${incident.code}: ${incident.title}`} />
              </div>
              <div className="field">
                <label htmlFor="description">Trabajo solicitado</label>
                <textarea id="description" name="description" rows={2} required />
              </div>
              <div>
                <button className="btn" type="submit">Despachar orden</button>
              </div>
            </form>
          </>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Avances y soluciones</h2>
        <ul className="timeline">
          {incident.notes.map((n) => (
            <li key={n.id}>
              <div className="when">{fmtDateTime(n.createdAt)} — {n.author.name}</div>
              {n.body}
            </li>
          ))}
          {incident.notes.length === 0 && <li className="muted">Sin notas.</li>}
        </ul>
        <form className="filter-bar" action={addIncidentNoteAction.bind(null, id, basePath)}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="body">Nueva nota</label>
            <input id="body" name="body" required />
          </div>
          <button className="btn" type="submit">Agregar</button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Adjuntos</h2>
        <ul>
          {incident.attachments.map((a) => (
            <li key={a.id}>
              <a href={`/api/incidents/${id}/attachments/${a.id}`}>{a.filename}</a>{" "}
              <span className="muted">({Math.round(a.sizeBytes / 1024)} KB — {a.uploadedBy.name}, {fmtDateTime(a.createdAt)})</span>
            </li>
          ))}
          {incident.attachments.length === 0 && <li className="muted">Sin adjuntos.</li>}
        </ul>
        <form className="filter-bar" action={addIncidentAttachmentAction.bind(null, id, basePath)}>
          <div className="field">
            <label htmlFor="file">Archivo (máx. 20 MB)</label>
            <input id="file" name="file" type="file" required />
          </div>
          <button className="btn" type="submit">Subir</button>
        </form>
      </div>
    </div>
  );
}
