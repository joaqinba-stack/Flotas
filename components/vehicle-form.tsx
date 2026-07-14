import type { OrgUnit, Vehicle } from "@/lib/data/types";

export function VehicleForm({
  action,
  orgUnits,
  vehicle,
}: {
  action: (formData: FormData) => Promise<void>;
  orgUnits: Array<Pick<OrgUnit, "id" | "name" | "path">>;
  vehicle?: Vehicle | null;
}) {
  return (
    <form className="stack" action={action}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="plate">Placa</label>
          <input id="plate" name="plate" required defaultValue={vehicle?.plate ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="year">Año</label>
          <input id="year" name="year" type="number" required defaultValue={vehicle?.year ?? ""} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="brand">Marca</label>
          <input id="brand" name="brand" required defaultValue={vehicle?.brand ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="model">Modelo</label>
          <input id="model" name="model" required defaultValue={vehicle?.model ?? ""} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="type">Tipo de unidad</label>
          <input id="type" name="type" required placeholder="Utilitario, camión, sedán…" defaultValue={vehicle?.type ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="fuelType">Combustible</label>
          <select id="fuelType" name="fuelType" defaultValue={vehicle?.fuelType ?? "NAFTA"}>
            <option value="NAFTA">Nafta</option>
            <option value="DIESEL">Diésel</option>
            <option value="GNC">GNC</option>
            <option value="ELECTRICO">Eléctrico</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="tankCapacityLiters">Capacidad de tanque (L)</label>
          <input id="tankCapacityLiters" name="tankCapacityLiters" type="number" step="0.1" defaultValue={vehicle?.tankCapacityLiters?.toString() ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="odometerKm">Odómetro (km)</label>
          <input id="odometerKm" name="odometerKm" type="number" required defaultValue={vehicle?.odometerKm ?? 0} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="orgUnitId">Unidad organizacional</label>
        <select id="orgUnitId" name="orgUnitId" required defaultValue={vehicle?.orgUnitId ?? ""}>
          <option value="" disabled>Seleccionar…</option>
          {orgUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {"—".repeat(Math.max(0, u.path.split("/").length - 3))} {u.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <button className="btn" type="submit">{vehicle ? "Guardar cambios" : "Crear vehículo"}</button>
      </div>
    </form>
  );
}
