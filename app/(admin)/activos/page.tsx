import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role, AuxAssetStatus } from "@/lib/data/types";
import { listAuxAssets } from "@/lib/data/aux-assets";
import { StatusBadge } from "@/components/badges";

export default async function ActivosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const params = await searchParams;
  const status =
    params.status && params.status in AuxAssetStatus ? (params.status as AuxAssetStatus) : undefined;
  const assets = await listAuxAssets(session, { status, q: params.q });

  return (
    <div>
      <div className="page-header">
        <h1>Activos auxiliares</h1>
        <Link className="btn" href="/activos/nuevo">Nuevo activo</Link>
      </div>

      <form className="filter-bar" method="get">
        <div className="field">
          <label htmlFor="q">Buscar</label>
          <input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Código, nombre, categoría" />
        </div>
        <div className="field">
          <label htmlFor="status">Estado</label>
          <select id="status" name="status" defaultValue={params.status ?? ""}>
            <option value="">Todos</option>
            <option value="IN_STOCK">En depósito</option>
            <option value="ASSIGNED">Asignado</option>
            <option value="IN_REPAIR">En reparación</option>
            <option value="RETIRED">De baja</option>
          </select>
        </div>
        <button className="btn secondary" type="submit">Filtrar</button>
      </form>

      <table className="data">
        <thead>
          <tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Vehículo</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.id}>
              <td><Link href={`/activos/${a.id}`}><strong>{a.code}</strong></Link></td>
              <td>{a.name}</td>
              <td>{a.category}</td>
              <td>{a.currentVehicle ? <Link href={`/flota/${a.currentVehicle.id}`}>{a.currentVehicle.plate}</Link> : "—"}</td>
              <td><StatusBadge value={a.status} /></td>
            </tr>
          ))}
          {assets.length === 0 && <tr><td colSpan={5} className="muted">Sin activos registrados.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
