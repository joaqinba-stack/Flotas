import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listGeofences } from "@/lib/data/geofences";

export default async function GeocercasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const [geofences, params] = await Promise.all([listGeofences(session), searchParams]);

  return (
    <div>
      <div className="page-header">
        <h1>Geocercas</h1>
        <Link className="btn" href="/geocercas/nueva">Nueva geocerca</Link>
      </div>
      {params.error && <p className="alert-error">{params.error}</p>}

      <table className="data">
        <thead>
          <tr><th>Nombre</th><th>Alcance</th><th>Vértices</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {geofences.map((g) => (
            <tr key={g.id}>
              <td><Link href={`/geocercas/${g.id}`}><strong>{g.name}</strong></Link></td>
              <td>{g.orgUnit ? g.orgUnit.name : "Institucional"}</td>
              <td>{(g.polygon as Array<[number, number]>).length}</td>
              <td>{g.active ? <span className="badge green">Activa</span> : <span className="badge gray">Inactiva</span>}</td>
            </tr>
          ))}
          {geofences.length === 0 && <tr><td colSpan={4} className="muted">Sin geocercas registradas.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
