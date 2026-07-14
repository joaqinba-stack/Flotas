import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role, TireStatus } from "@/lib/data/types";
import { listTires } from "@/lib/data/tires";
import { StatusBadge } from "@/components/badges";

export default async function NeumaticosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const params = await searchParams;
  const status = params.status && params.status in TireStatus ? (params.status as TireStatus) : undefined;
  const tires = await listTires(session, { status, q: params.q });

  return (
    <div>
      <div className="page-header">
        <h1>Neumáticos</h1>
        <Link className="btn" href="/neumaticos/nuevo">Nuevo neumático</Link>
      </div>

      <form className="filter-bar" method="get">
        <div className="field">
          <label htmlFor="q">Buscar</label>
          <input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Serie, marca" />
        </div>
        <div className="field">
          <label htmlFor="status">Estado</label>
          <select id="status" name="status" defaultValue={params.status ?? ""}>
            <option value="">Todos</option>
            <option value="IN_STOCK">En depósito</option>
            <option value="MOUNTED">Montado</option>
            <option value="IN_REPAIR">En reparación</option>
            <option value="DISCARDED">De baja</option>
          </select>
        </div>
        <button className="btn secondary" type="submit">Filtrar</button>
      </form>

      <table className="data">
        <thead>
          <tr>
            <th>N° de serie</th>
            <th>Marca / modelo</th>
            <th>Medida</th>
            <th>Dibujo (mm)</th>
            <th>Vehículo</th>
            <th>Posición</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {tires.map((t) => (
            <tr key={t.id}>
              <td><Link href={`/neumaticos/${t.id}`}><strong>{t.serialNumber}</strong></Link></td>
              <td>{t.brand} {t.model}</td>
              <td>{t.size}</td>
              <td>{t.treadDepthMm?.toString() ?? "—"}</td>
              <td>{t.currentVehicle ? <Link href={`/flota/${t.currentVehicle.id}`}>{t.currentVehicle.plate}</Link> : "—"}</td>
              <td>{t.currentPosition ?? "—"}</td>
              <td><StatusBadge value={t.status} /></td>
            </tr>
          ))}
          {tires.length === 0 && <tr><td colSpan={7} className="muted">Sin neumáticos registrados.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
