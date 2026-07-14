import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role, JornadaStatus } from "@/lib/data/types";
import { listJornadas } from "@/lib/data/jornadas";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime } from "@/lib/format";

export default async function JornadasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const params = await searchParams;
  const status =
    params.status && params.status in JornadaStatus ? (params.status as JornadaStatus) : undefined;
  const jornadas = await listJornadas(session, { status });

  return (
    <div>
      <div className="page-header">
        <h1>Jornadas operativas</h1>
        <Link className="btn" href="/jornadas/nueva">Planificar jornada</Link>
      </div>

      <form className="filter-bar" method="get">
        <div className="field">
          <label htmlFor="status">Estado</label>
          <select id="status" name="status" defaultValue={params.status ?? ""}>
            <option value="">Todas</option>
            <option value="PLANNED">Planificadas</option>
            <option value="IN_PROGRESS">En curso</option>
            <option value="COMPLETED">Completadas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>
        <button className="btn secondary" type="submit">Filtrar</button>
      </form>

      <table className="data">
        <thead>
          <tr>
            <th>Propósito</th>
            <th>Vehículo</th>
            <th>Conductor</th>
            <th>Unidad</th>
            <th>Inicio planificado</th>
            <th>Fin planificado</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {jornadas.map((j) => (
            <tr key={j.id}>
              <td><Link href={`/jornadas/${j.id}`}><strong>{j.purpose}</strong></Link></td>
              <td>{j.vehicle.plate}</td>
              <td>{j.driver.lastName}, {j.driver.firstName}</td>
              <td>{j.orgUnit.name}</td>
              <td>{fmtDateTime(j.plannedStart)}</td>
              <td>{fmtDateTime(j.plannedEnd)}</td>
              <td><StatusBadge value={j.status} /></td>
            </tr>
          ))}
          {jornadas.length === 0 && <tr><td colSpan={7} className="muted">Sin jornadas en su alcance.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
