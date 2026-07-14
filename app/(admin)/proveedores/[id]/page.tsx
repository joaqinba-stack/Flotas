import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getSupplier } from "@/lib/data/suppliers";
import { listServiceOrders } from "@/lib/data/supplier-orders";
import { SupplierForm } from "@/components/supplier-form";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime } from "@/lib/format";
import { updateSupplierAction } from "../actions";

export default async function ProveedorDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const { id } = await params;
  const [supplier, orders, sp] = await Promise.all([
    getSupplier(session, id),
    listServiceOrders(session, { supplierId: id }),
    searchParams,
  ]);

  return (
    <div>
      <h1>{supplier.name}</h1>
      {sp.error && <p className="alert-error">{sp.error}</p>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Datos del proveedor</h2>
        <SupplierForm action={updateSupplierAction.bind(null, id)} supplier={supplier} />
        <p className="muted">
          Portal: {supplier.users.length > 0 ? supplier.users.map((u) => u.email).join(", ") : "sin acceso"}
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Órdenes de servicio</h2>
        <table className="data">
          <thead><tr><th>N°</th><th>Título</th><th>Vehículo</th><th>Creada</th><th>Estado</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="mono"><Link href={`/ordenes/${o.id}`}>#{o.orderNumber}</Link></td>
                <td>{o.title}</td>
                <td>{o.vehicle.plate}</td>
                <td>{fmtDateTime(o.createdAt)}</td>
                <td><StatusBadge value={o.status} /></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={5} className="muted">Sin órdenes.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
