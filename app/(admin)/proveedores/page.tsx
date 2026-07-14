import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listSuppliers } from "@/lib/data/suppliers";

export default async function ProveedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const params = await searchParams;
  const suppliers = await listSuppliers(session, { q: params.q });

  return (
    <div>
      <div className="page-header">
        <h1>Proveedores</h1>
        <Link className="btn" href="/proveedores/nuevo">Nuevo proveedor</Link>
      </div>

      <form className="filter-bar" method="get">
        <div className="field">
          <label htmlFor="q">Buscar</label>
          <input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Nombre, rubro" />
        </div>
        <button className="btn secondary" type="submit">Filtrar</button>
      </form>

      <table className="data">
        <thead>
          <tr><th>Razón social</th><th>CUIT</th><th>Rubros</th><th>Contacto</th><th>Órdenes</th><th>Portal</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <tr key={s.id}>
              <td><Link href={`/proveedores/${s.id}`}><strong>{s.name}</strong></Link></td>
              <td className="mono">{s.taxId}</td>
              <td>{s.serviceTypes}</td>
              <td>{s.contactName ?? "—"}{s.contactPhone ? ` (${s.contactPhone})` : ""}</td>
              <td>{s._count.serviceOrders}</td>
              <td>{s.users.length > 0 ? s.users.map((u) => u.email).join(", ") : <span className="muted">Sin login</span>}</td>
              <td>{s.active ? <span className="badge green">Activo</span> : <span className="badge red">Inactivo</span>}</td>
            </tr>
          ))}
          {suppliers.length === 0 && <tr><td colSpan={7} className="muted">Sin proveedores registrados.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
