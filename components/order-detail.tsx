import Link from "next/link";
import type { getServiceOrder } from "@/lib/data/supplier-orders";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { updateOrderStatusAction, addOrderNoteAction } from "@/app/(admin)/ordenes/actions";

type Order = Awaited<ReturnType<typeof getServiceOrder>>;

export function OrderDetail({
  order,
  basePath,
  viewerIsSupplier,
}: {
  order: Order;
  basePath: string;
  viewerIsSupplier: boolean;
}) {
  const o = order;
  return (
    <div>
      <div className="page-header">
        <h1>Orden de servicio #{o.orderNumber} <StatusBadge value={o.status} /></h1>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{o.title}</h2>
        <p>{o.description}</p>
        <dl className="detail-grid">
          <div><dt>Proveedor</dt><dd>{viewerIsSupplier ? o.supplier.name : <Link href={`/proveedores/${o.supplier.id}`}>{o.supplier.name}</Link>}</dd></div>
          <div><dt>Vehículo</dt><dd>{viewerIsSupplier ? o.vehicle.plate : <Link href={`/flota/${o.vehicle.id}`}>{o.vehicle.plate}</Link>} — {o.vehicle.brand} {o.vehicle.model}</dd></div>
          <div><dt>Costo estimado</dt><dd>{fmtMoney(o.costEstimate ? Number(o.costEstimate) : null)}</dd></div>
          <div><dt>Costo final</dt><dd>{fmtMoney(o.costFinal ? Number(o.costFinal) : null)}</dd></div>
          <div><dt>Programada</dt><dd>{fmtDateTime(o.scheduledFor)}</dd></div>
          <div><dt>Completada</dt><dd>{fmtDateTime(o.completedAt)}</dd></div>
          <div><dt>Creada por</dt><dd>{o.createdBy.name} — {fmtDateTime(o.createdAt)}</dd></div>
        </dl>
      </div>

      {o.incident && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Incidencia vinculada #{o.incident.code} <StatusBadge value={o.incident.urgency} /></h2>
          <p>
            {viewerIsSupplier ? (
              <strong>{o.incident.title}</strong>
            ) : (
              <Link href={`/incidentes/${o.incident.id}`}><strong>{o.incident.title}</strong></Link>
            )}
          </p>
          <p className="muted">{o.incident.description}</p>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Gestión</h2>
        <div className="actions-row" style={{ flexWrap: "wrap", gap: 16 }}>
          {o.status === "SENT" && viewerIsSupplier && (
            <form action={updateOrderStatusAction.bind(null, o.id, basePath)}>
              <input type="hidden" name="toStatus" value="ACCEPTED" />
              <button className="btn" type="submit">Aceptar orden</button>
            </form>
          )}
          {o.status === "ACCEPTED" && viewerIsSupplier && (
            <form action={updateOrderStatusAction.bind(null, o.id, basePath)}>
              <input type="hidden" name="toStatus" value="IN_PROGRESS" />
              <button className="btn" type="submit">Iniciar trabajo</button>
            </form>
          )}
          {o.status === "IN_PROGRESS" && (
            <form className="filter-bar" style={{ margin: 0 }} action={updateOrderStatusAction.bind(null, o.id, basePath)}>
              <input type="hidden" name="toStatus" value="COMPLETED" />
              <div className="field">
                <label htmlFor="costFinal">Costo final</label>
                <input id="costFinal" name="costFinal" type="number" step="0.01" />
              </div>
              <button className="btn" type="submit">Marcar completada</button>
            </form>
          )}
          {!viewerIsSupplier && (o.status === "SENT" || o.status === "ACCEPTED" || o.status === "IN_PROGRESS") && (
            <form action={updateOrderStatusAction.bind(null, o.id, basePath)}>
              <input type="hidden" name="toStatus" value="CANCELLED" />
              <button className="btn danger" type="submit">Cancelar orden</button>
            </form>
          )}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Avances</h2>
        <ul className="timeline">
          {o.notes.map((n) => (
            <li key={n.id}>
              <div className="when">{fmtDateTime(n.createdAt)} — {n.author.name}</div>
              {n.body}
            </li>
          ))}
          {o.notes.length === 0 && <li className="muted">Sin avances registrados.</li>}
        </ul>
        {(o.status === "SENT" || o.status === "ACCEPTED" || o.status === "IN_PROGRESS") && (
          <form className="filter-bar" action={addOrderNoteAction.bind(null, o.id, basePath)}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="body">Nueva nota de avance</label>
              <input id="body" name="body" required />
            </div>
            <button className="btn" type="submit">Agregar</button>
          </form>
        )}
      </div>
    </div>
  );
}
