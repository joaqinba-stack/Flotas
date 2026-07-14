import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listVehicles } from "@/lib/data/vehicles";
import { listSuppliers } from "@/lib/data/suppliers";
import { createServiceOrderAction } from "../actions";

export default async function NuevaOrdenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const [vehicles, suppliers, params] = await Promise.all([
    listVehicles(session),
    listSuppliers(session),
    searchParams,
  ]);
  return (
    <div>
      <h1>Nueva orden de servicio</h1>
      {params.error && <p className="alert-error">{params.error}</p>}
      <div className="card">
        <form className="stack" action={createServiceOrderAction}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="supplierId">Proveedor</label>
              <select id="supplierId" name="supplierId" required defaultValue="">
                <option value="" disabled>Seleccionar…</option>
                {suppliers.filter((s) => s.active).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="vehicleId">Vehículo</label>
              <select id="vehicleId" name="vehicleId" required defaultValue="">
                <option value="" disabled>Seleccionar…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.plate}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="title">Título</label>
            <input id="title" name="title" required />
          </div>
          <div className="field">
            <label htmlFor="description">Trabajo solicitado</label>
            <textarea id="description" name="description" rows={3} required />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="costEstimate">Costo estimado</label>
              <input id="costEstimate" name="costEstimate" type="number" step="0.01" />
            </div>
            <div className="field">
              <label htmlFor="scheduledFor">Programada para</label>
              <input id="scheduledFor" name="scheduledFor" type="datetime-local" />
            </div>
          </div>
          <div>
            <button className="btn" type="submit">Crear orden</button>
          </div>
        </form>
      </div>
    </div>
  );
}
