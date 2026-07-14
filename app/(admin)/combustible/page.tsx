import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role, FuelValidationStatus } from "@/lib/data/types";
import { listFuelLoads } from "@/lib/data/fuel-loads";
import { FUEL_FLAG_LABELS } from "@/lib/validation/fuel-load-rules";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime, fmtNumber, fmtMoney } from "@/lib/format";
import { reviewFuelLoadAction } from "./actions";

export default async function CombustiblePage({
  searchParams,
}: {
  searchParams: Promise<{ validationStatus?: string; error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const params = await searchParams;
  const vs =
    params.validationStatus && params.validationStatus in FuelValidationStatus
      ? (params.validationStatus as FuelValidationStatus)
      : undefined;
  const loads = await listFuelLoads(session, { validationStatus: vs });

  return (
    <div>
      <div className="page-header">
        <h1>Cargas de combustible</h1>
        <Link className="btn" href="/combustible/nueva">Registrar carga</Link>
      </div>
      {params.error && <p className="alert-error">{params.error}</p>}

      <form className="filter-bar" method="get">
        <div className="field">
          <label htmlFor="validationStatus">Validación</label>
          <select id="validationStatus" name="validationStatus" defaultValue={params.validationStatus ?? ""}>
            <option value="">Todas</option>
            <option value="FLAGGED">Observadas</option>
            <option value="VALID">Válidas</option>
            <option value="REJECTED">Rechazadas</option>
          </select>
        </div>
        <button className="btn secondary" type="submit">Filtrar</button>
      </form>

      <table className="data">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Vehículo</th>
            <th>Conductor</th>
            <th>Litros</th>
            <th>Odómetro</th>
            <th>Costo</th>
            <th>Jornada</th>
            <th>Validación</th>
            <th>Auditoría</th>
          </tr>
        </thead>
        <tbody>
          {loads.map((l) => (
            <tr key={l.id}>
              <td>{fmtDateTime(l.loadedAt)}</td>
              <td><Link href={`/flota/${l.vehicle.id}`}>{l.vehicle.plate}</Link></td>
              <td>{l.driver ? `${l.driver.lastName}, ${l.driver.firstName}` : "—"}</td>
              <td>{fmtNumber(Number(l.liters), 2)} L</td>
              <td>{fmtNumber(l.odometerKm)} km</td>
              <td>{fmtMoney(l.totalCost ? Number(l.totalCost) : null)}</td>
              <td>{l.jornada ? <Link href={`/jornadas/${l.jornada.id}`}>{l.jornada.purpose}</Link> : "—"}</td>
              <td>
                <StatusBadge value={l.validationStatus} />
                {l.validationFlags.length > 0 && (
                  <ul className="muted" style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 11 }}>
                    {l.validationFlags.map((f) => (
                      <li key={f}>{FUEL_FLAG_LABELS[f] ?? f}</li>
                    ))}
                  </ul>
                )}
              </td>
              <td>
                {l.validationStatus === "FLAGGED" ? (
                  <form action={reviewFuelLoadAction.bind(null, l.id)} className="actions-row">
                    <input type="hidden" name="note" value="" />
                    <button className="btn small" name="decision" value="VALID" type="submit">Aprobar</button>
                    <button className="btn small danger" name="decision" value="REJECTED" type="submit">Rechazar</button>
                  </form>
                ) : l.reviewedBy ? (
                  <span className="muted">por {l.reviewedBy.name}</span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
          {loads.length === 0 && (
            <tr><td colSpan={9} className="muted">Sin cargas registradas en su alcance.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
