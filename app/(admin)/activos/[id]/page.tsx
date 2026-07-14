import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getAuxAsset } from "@/lib/data/aux-assets";
import { listVehicles } from "@/lib/data/vehicles";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime } from "@/lib/format";
import { registerAuxAssetMovementAction } from "../actions";

const MOVEMENT_LABEL: Record<string, string> = {
  ASSIGN: "Asignación",
  RETURN: "Devolución",
  REPAIR: "A reparación",
  RETIRE: "Baja",
};

export default async function ActivoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const { id } = await params;
  const [asset, vehicles, sp] = await Promise.all([
    getAuxAsset(session, id),
    listVehicles(session),
    searchParams,
  ]);

  return (
    <div>
      <div className="page-header">
        <h1>{asset.code} — {asset.name} <StatusBadge value={asset.status} /></h1>
      </div>
      {sp.error && <p className="alert-error">{sp.error}</p>}

      <div className="card">
        <dl className="detail-grid">
          <div><dt>Categoría</dt><dd>{asset.category}</dd></div>
          <div>
            <dt>Ubicación actual</dt>
            <dd>{asset.currentVehicle ? <Link href={`/flota/${asset.currentVehicle.id}`}>{asset.currentVehicle.plate}</Link> : "Depósito"}</dd>
          </div>
        </dl>
      </div>

      {asset.status !== "RETIRED" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Registrar movimiento</h2>
          <form className="filter-bar" action={registerAuxAssetMovementAction.bind(null, id)}>
            <div className="field">
              <label htmlFor="type">Tipo</label>
              <select id="type" name="type" required defaultValue="ASSIGN">
                <option value="ASSIGN">Asignar a vehículo</option>
                <option value="RETURN">Devolver a depósito</option>
                <option value="REPAIR">A reparación</option>
                <option value="RETIRE">Baja</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="vehicleId">Vehículo</label>
              <select id="vehicleId" name="vehicleId" defaultValue="">
                <option value="">—</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.plate}</option>
                ))}
              </select>
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
            <tr><th>Fecha</th><th>Movimiento</th><th>Vehículo</th><th>Notas</th><th>Usuario</th></tr>
          </thead>
          <tbody>
            {asset.movements.map((m) => (
              <tr key={m.id}>
                <td>{fmtDateTime(m.createdAt)}</td>
                <td>{MOVEMENT_LABEL[m.type] ?? m.type}</td>
                <td>{m.vehicle?.plate ?? "—"}</td>
                <td>{m.notes ?? "—"}</td>
                <td>{m.performedBy.name}</td>
              </tr>
            ))}
            {asset.movements.length === 0 && <tr><td colSpan={5} className="muted">Sin movimientos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
