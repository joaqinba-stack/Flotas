import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role, ServiceOrderStatus } from "@/lib/data/types";
import { listServiceOrders } from "@/lib/data/supplier-orders";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime, fmtMoney } from "@/lib/format";

export default async function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const params = await searchParams;
  const status =
    params.status && params.status in ServiceOrderStatus
      ? (params.status as ServiceOrderStatus)
      : undefined;
  const orders = await listServiceOrders(session, { status });

  return (
    <div>
      <div className="page-header">
        <h1>Órdenes de servicio</h1>
        <Link className="btn" href="/ordenes/nueva">Nueva orden</Link>
      </div>

      <form className="filter-bar" method="get">
        <div className="field">
          <label htmlFor="status">Estado</label>
          <select id="status" name="status" defaultValue={params.status ?? ""}>
            <option value="">Todas</option>
            <option value="SENT">Enviadas</option>
            <option value="ACCEPTED">Aceptadas</option>
            <option value="IN_PROGRESS">En curso</option>
            <option value="COMPLETED">Completadas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>
        <button className="btn secondary" type="submit">Filtrar</button>
      </form>

      <table className="data">
        <thead>
          <tr><th>N°</th><th>Título</th><th>Proveedor</th><th>Vehículo</th><th>Incidencia</th><th>Creada</th><th>Costo final</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="mono"><Link href={`/ordenes/${o.id}`}>#{o.orderNumber}</Link></td>
              <td>{o.title}</td>
              <td>{o.supplier.name}</td>
              <td>{o.vehicle.plate}</td>
              <td>{o.incident ? <Link href={`/incidentes/${o.incident.id}`}>#{o.incident.code}</Link> : "—"}</td>
              <td>{fmtDateTime(o.createdAt)}</td>
              <td>{fmtMoney(o.costFinal ? Number(o.costFinal) : null)}</td>
              <td><StatusBadge value={o.status} /></td>
            </tr>
          ))}
          {orders.length === 0 && <tr><td colSpan={8} className="muted">Sin órdenes en su alcance.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
