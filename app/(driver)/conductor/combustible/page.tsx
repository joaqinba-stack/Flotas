import { requireSession } from "@/lib/auth/session";
import { Role, JornadaStatus } from "@/lib/data/types";
import { listFuelLoads } from "@/lib/data/fuel-loads";
import { listVehicles } from "@/lib/data/vehicles";
import { listJornadas } from "@/lib/data/jornadas";
import { FuelLoadForm } from "@/components/fuel-load-form";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime, fmtNumber } from "@/lib/format";
import { createOwnFuelLoadAction } from "./actions";

export default async function MisCargasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.DRIVER);
  const [loads, vehicles, planned, inProgress, params] = await Promise.all([
    listFuelLoads(session),
    listVehicles(session),
    listJornadas(session, { status: JornadaStatus.PLANNED }),
    listJornadas(session, { status: JornadaStatus.IN_PROGRESS }),
    searchParams,
  ]);

  return (
    <div>
      <h1>Mis cargas de combustible</h1>
      {params.error && <p className="alert-error">{params.error}</p>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Registrar carga</h2>
        {vehicles.length === 0 ? (
          <p className="muted">No tiene vehículos asignados: no puede registrar cargas.</p>
        ) : (
          <FuelLoadForm
            action={createOwnFuelLoadAction}
            vehicles={vehicles}
            jornadas={[...inProgress, ...planned]}
            fixedVehicleId={vehicles[0].id}
          />
        )}
      </div>

      <table className="data">
        <thead>
          <tr><th>Fecha</th><th>Vehículo</th><th>Litros</th><th>Odómetro</th><th>Validación</th></tr>
        </thead>
        <tbody>
          {loads.map((l) => (
            <tr key={l.id}>
              <td>{fmtDateTime(l.loadedAt)}</td>
              <td>{l.vehicle.plate}</td>
              <td>{fmtNumber(Number(l.liters), 2)} L</td>
              <td>{fmtNumber(l.odometerKm)} km</td>
              <td><StatusBadge value={l.validationStatus} /></td>
            </tr>
          ))}
          {loads.length === 0 && <tr><td colSpan={5} className="muted">Sin cargas registradas.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
