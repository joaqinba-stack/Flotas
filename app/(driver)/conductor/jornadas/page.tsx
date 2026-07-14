import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listJornadas } from "@/lib/data/jornadas";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime } from "@/lib/format";

export default async function MisJornadasPage() {
  const session = await requireSession(Role.DRIVER);
  const jornadas = await listJornadas(session);

  return (
    <div>
      <h1>Mis jornadas operativas</h1>
      <table className="data">
        <thead>
          <tr><th>Propósito</th><th>Vehículo</th><th>Inicio planificado</th><th>Fin planificado</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {jornadas.map((j) => (
            <tr key={j.id}>
              <td><Link href={`/conductor/jornadas/${j.id}`}><strong>{j.purpose}</strong></Link></td>
              <td>{j.vehicle.plate}</td>
              <td>{fmtDateTime(j.plannedStart)}</td>
              <td>{fmtDateTime(j.plannedEnd)}</td>
              <td><StatusBadge value={j.status} /></td>
            </tr>
          ))}
          {jornadas.length === 0 && <tr><td colSpan={5} className="muted">No tiene jornadas asignadas.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
