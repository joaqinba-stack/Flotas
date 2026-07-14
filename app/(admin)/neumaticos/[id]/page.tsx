import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getTire } from "@/lib/data/tires";
import { listVehicles } from "@/lib/data/vehicles";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime, fmtNumber } from "@/lib/format";
import { registerTireMovementAction } from "../actions";

const MOVEMENT_LABEL: Record<string, string> = {
  MOUNT: "Montaje",
  ROTATE: "Rotación",
  DISMOUNT: "Desmontaje",
  REPAIR: "A reparación",
  DISCARD: "Baja",
};

export default async function NeumaticoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const { id } = await params;
  const [tire, vehicles, sp] = await Promise.all([
    getTire(session, id),
    listVehicles(session),
    searchParams,
  ]);

  return (
    <div>
      <div className="page-header">
        <h1>Neumático {tire.serialNumber} <StatusBadge value={tire.status} /></h1>
      </div>
      {sp.error && <p className="alert-error">{sp.error}</p>}

      <div className="card">
        <dl className="detail-grid">
          <div><dt>Marca / modelo</dt><dd>{tire.brand} {tire.model}</dd></div>
          <div><dt>Medida</dt><dd>{tire.size}</dd></div>
          <div><dt>Dibujo</dt><dd>{tire.treadDepthMm ? `${tire.treadDepthMm} mm` : "—"}</dd></div>
          <div>
            <dt>Ubicación actual</dt>
            <dd>
              {tire.currentVehicle
                ? <>en <Link href={`/flota/${tire.currentVehicle.id}`}>{tire.currentVehicle.plate}</Link> ({tire.currentPosition})</>
                : "Depósito"}
            </dd>
          </div>
        </dl>
      </div>

      {tire.status !== "DISCARDED" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Registrar movimiento</h2>
          <form className="filter-bar" action={registerTireMovementAction.bind(null, id)}>
            <div className="field">
              <label htmlFor="type">Tipo</label>
              <select id="type" name="type" required defaultValue="MOUNT">
                <option value="MOUNT">Montaje</option>
                <option value="ROTATE">Rotación</option>
                <option value="DISMOUNT">Desmontaje</option>
                <option value="REPAIR">A reparación</option>
                <option value="DISCARD">Baja</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="vehicleId">Vehículo</label>
              <select id="vehicleId" name="vehicleId" defaultValue={tire.currentVehicleId ?? ""}>
                <option value="">—</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.plate}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="toPosition">Posición</label>
              <input id="toPosition" name="toPosition" placeholder="Del. izq., trasera der.…" />
            </div>
            <div className="field">
              <label htmlFor="odometerKm">Odómetro</label>
              <input id="odometerKm" name="odometerKm" type="number" min={0} />
            </div>
            <div className="field">
              <label htmlFor="treadDepthMm">Dibujo (mm)</label>
              <input id="treadDepthMm" name="treadDepthMm" type="number" step="0.1" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="notes">Notas</label>
              <input id="notes" name="notes" />
            </div>
            <button className="btn" type="submit">Registrar</button>
          </form>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Historial de movimientos</h2>
        <table className="data">
          <thead>
            <tr><th>Fecha</th><th>Movimiento</th><th>Vehículo</th><th>Posición</th><th>Odómetro</th><th>Notas</th><th>Usuario</th></tr>
          </thead>
          <tbody>
            {tire.movements.map((m) => (
              <tr key={m.id}>
                <td>{fmtDateTime(m.createdAt)}</td>
                <td>{MOVEMENT_LABEL[m.type] ?? m.type}</td>
                <td>{m.vehicle?.plate ?? "—"}</td>
                <td>{m.fromPosition || m.toPosition ? `${m.fromPosition ?? "depósito"} → ${m.toPosition ?? "depósito"}` : "—"}</td>
                <td>{m.odometerKm ? `${fmtNumber(m.odometerKm)} km` : "—"}</td>
                <td>{m.notes ?? "—"}</td>
                <td>{m.performedBy.name}</td>
              </tr>
            ))}
            {tire.movements.length === 0 && <tr><td colSpan={7} className="muted">Sin movimientos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
