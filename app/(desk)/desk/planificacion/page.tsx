import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { tripPlanningOverview } from "@/lib/data/planning";
import { fmtDateTime, fmtNumber } from "@/lib/format";

export default async function PlanificacionPage() {
  const session = await requireSession(Role.DESK_AGENT);
  const rows = await tripPlanningOverview(session);

  return (
    <div>
      <h1>Planificación de viajes e insumos</h1>
      <p className="muted">
        Vehículos con jornadas planificadas en los próximos 14 días, con estimación de necesidad de
        combustible según su patrón histórico de carga.
      </p>

      {rows.map((r) => (
        <div className="card" key={r.vehicleId}>
          <div className="page-header" style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>
              <Link href={`/flota/${r.vehicleId}`}>{r.plate}</Link>
              {r.supplyRisk && <span className="badge red" style={{ marginLeft: 8 }}>Riesgo de provisión</span>}
            </h2>
          </div>
          <dl className="detail-grid">
            <div><dt>Promedio litros/carga</dt><dd>{r.avgLitersPerLoad !== null ? `${fmtNumber(r.avgLitersPerLoad, 1)} L` : "sin historial"}</dd></div>
            <div><dt>Intervalo habitual entre cargas</dt><dd>{r.avgIntervalDays !== null ? `${fmtNumber(r.avgIntervalDays, 1)} días` : "—"}</dd></div>
            <div><dt>Días desde la última carga</dt><dd>{r.daysSinceLastLoad !== null ? fmtNumber(r.daysSinceLastLoad, 1) : "sin cargas registradas"}</dd></div>
          </dl>
          <h3>Jornadas planificadas próximas</h3>
          <table className="data">
            <thead><tr><th>Propósito</th><th>Conductor</th><th>Inicio planificado</th></tr></thead>
            <tbody>
              {r.upcomingJornadas.map((j) => (
                <tr key={j.id}>
                  <td><Link href={`/jornadas/${j.id}`}>{j.purpose}</Link></td>
                  <td>{j.driver}</td>
                  <td>{fmtDateTime(j.plannedStart)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {rows.length === 0 && (
        <div className="card">
          <p className="muted">No hay jornadas planificadas en los próximos 14 días dentro de su alcance.</p>
        </div>
      )}
    </div>
  );
}
