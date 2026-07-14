import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listVehicles } from "@/lib/data/vehicles";
import { listDrivers } from "@/lib/data/drivers";
import { createJornadaAction } from "../actions";

export default async function NuevaJornadaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const [vehicles, drivers, params] = await Promise.all([
    listVehicles(session),
    listDrivers(session),
    searchParams,
  ]);

  return (
    <div>
      <h1>Planificar jornada operativa</h1>
      {params.error && <p className="alert-error">{params.error}</p>}
      <div className="card">
        <form className="stack" action={createJornadaAction}>
          <div className="field">
            <label htmlFor="purpose">Propósito / destino</label>
            <input id="purpose" name="purpose" required placeholder="Traslado de insumos a Base Norte…" />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="vehicleId">Vehículo</label>
              <select id="vehicleId" name="vehicleId" required defaultValue="">
                <option value="" disabled>Seleccionar…</option>
                {vehicles.filter((v) => v.status === "ACTIVE").map((v) => (
                  <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="driverId">Conductor</label>
              <select id="driverId" name="driverId" required defaultValue="">
                <option value="" disabled>Seleccionar…</option>
                {drivers.filter((d) => d.status === "ACTIVE").map((d) => (
                  <option key={d.id} value={d.id}>{d.lastName}, {d.firstName}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="plannedStart">Inicio planificado</label>
              <input id="plannedStart" name="plannedStart" type="datetime-local" required />
            </div>
            <div className="field">
              <label htmlFor="plannedEnd">Fin planificado</label>
              <input id="plannedEnd" name="plannedEnd" type="datetime-local" required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="notes">Notas</label>
            <textarea id="notes" name="notes" rows={2} />
          </div>
          <div>
            <button className="btn" type="submit">Planificar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
