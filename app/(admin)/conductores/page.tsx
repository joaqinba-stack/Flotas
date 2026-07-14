import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role, DriverStatus } from "@/lib/data/types";
import { listDrivers } from "@/lib/data/drivers";
import { StatusBadge } from "@/components/badges";
import { fmtDate } from "@/lib/format";

export default async function ConductoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const params = await searchParams;
  const status =
    params.status && params.status in DriverStatus ? (params.status as DriverStatus) : undefined;
  const drivers = await listDrivers(session, { q: params.q, status });

  return (
    <div>
      <div className="page-header">
        <h1>Conductores</h1>
        <Link className="btn" href="/conductores/nuevo">Nuevo conductor</Link>
      </div>

      <form className="filter-bar" method="get">
        <div className="field">
          <label htmlFor="q">Buscar</label>
          <input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Nombre, apellido, DNI" />
        </div>
        <div className="field">
          <label htmlFor="status">Estado</label>
          <select id="status" name="status" defaultValue={params.status ?? ""}>
            <option value="">Todos</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="SUSPENDED">Suspendido</option>
          </select>
        </div>
        <button className="btn secondary" type="submit">Filtrar</button>
      </form>

      <table className="data">
        <thead>
          <tr>
            <th>Apellido y nombre</th>
            <th>DNI</th>
            <th>Licencia</th>
            <th>Vencimiento</th>
            <th>Unidad</th>
            <th>Vehículos</th>
            <th>Acceso</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((d) => (
            <tr key={d.id}>
              <td><Link href={`/conductores/${d.id}`}><strong>{d.lastName}, {d.firstName}</strong></Link></td>
              <td>{d.documentId}</td>
              <td>{d.licenseNumber} ({d.licenseCategory})</td>
              <td>{fmtDate(d.licenseExpiry)}</td>
              <td>{d.orgUnit.name}</td>
              <td>{d.assignedVehicles.map((v) => v.plate).join(", ") || "—"}</td>
              <td>{d.user ? d.user.email : <span className="muted">Sin login</span>}</td>
              <td><StatusBadge value={d.status} /></td>
            </tr>
          ))}
          {drivers.length === 0 && (
            <tr><td colSpan={8} className="muted">No hay conductores en su alcance.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
