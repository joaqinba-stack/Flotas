import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role, VehicleStatus } from "@/lib/data/types";
import { listVehicles } from "@/lib/data/vehicles";
import { StatusBadge } from "@/components/badges";
import { fmtNumber } from "@/lib/format";

export default async function FlotaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const params = await searchParams;
  const status =
    params.status && params.status in VehicleStatus ? (params.status as VehicleStatus) : undefined;
  const vehicles = await listVehicles(session, { status, q: params.q });

  return (
    <div>
      <div className="page-header">
        <h1>Legajo operativo — Vehículos</h1>
        <Link className="btn" href="/flota/nuevo">Nuevo vehículo</Link>
      </div>

      <form className="filter-bar" method="get">
        <div className="field">
          <label htmlFor="q">Buscar</label>
          <input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Placa, marca, modelo" />
        </div>
        <div className="field">
          <label htmlFor="status">Estado</label>
          <select id="status" name="status" defaultValue={params.status ?? ""}>
            <option value="">Todos</option>
            <option value="ACTIVE">Activo</option>
            <option value="IN_MAINTENANCE">En mantenimiento</option>
            <option value="OUT_OF_SERVICE">Fuera de servicio</option>
          </select>
        </div>
        <button className="btn secondary" type="submit">Filtrar</button>
      </form>

      <table className="data">
        <thead>
          <tr>
            <th>Placa</th>
            <th>Vehículo</th>
            <th>Unidad</th>
            <th>Conductor asignado</th>
            <th>Odómetro</th>
            <th>GPS</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id}>
              <td><Link href={`/flota/${v.id}`}><strong>{v.plate}</strong></Link></td>
              <td>{v.brand} {v.model} ({v.year}) — {v.type}</td>
              <td>{v.orgUnit.name}</td>
              <td>{v.currentDriver ? `${v.currentDriver.lastName}, ${v.currentDriver.firstName}` : <span className="muted">Sin asignar</span>}</td>
              <td>{fmtNumber(v.odometerKm)} km</td>
              <td>
                {!v.traccarDevice ? (
                  <span className="muted">Sin equipo</span>
                ) : v.traccarDevice.traccarId === null ? (
                  // Sin alta en Traccar el estado de conexión no significa nada:
                  // mostrarlo como "Sin datos" haría parecer que el equipo existe.
                  <StatusBadge value="SYNC_PENDING" />
                ) : (
                  <StatusBadge value={v.traccarDevice.connectionStatus} />
                )}
              </td>
              <td><StatusBadge value={v.status} /></td>
            </tr>
          ))}
          {vehicles.length === 0 && (
            <tr><td colSpan={7} className="muted">No hay vehículos en su alcance.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
