import type { Geofence, OrgUnit } from "@/lib/data/types";

export function GeofenceForm({
  action,
  orgUnits,
  geofence,
}: {
  action: (formData: FormData) => Promise<void>;
  orgUnits: Array<Pick<OrgUnit, "id" | "name">>;
  geofence?: Geofence | null;
}) {
  return (
    <form className="stack" action={action}>
      <div className="field">
        <label htmlFor="name">Nombre</label>
        <input id="name" name="name" required defaultValue={geofence?.name ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="description">Descripción</label>
        <input id="description" name="description" defaultValue={geofence?.description ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="orgUnitId">Unidad organizacional (vacío = institucional, aplica a toda la flota)</label>
        <select id="orgUnitId" name="orgUnitId" defaultValue={geofence?.orgUnitId ?? ""}>
          <option value="">Institucional</option>
          {orgUnits.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="polygon">
          Polígono — lista JSON de vértices [lat, lon], mínimo 3, en orden
        </label>
        <textarea
          id="polygon"
          name="polygon"
          rows={4}
          required
          className="mono"
          placeholder="[[-25.26,-57.58],[-25.27,-57.58],[-25.27,-57.57]]"
          defaultValue={geofence ? JSON.stringify(geofence.polygon) : ""}
        />
      </div>
      {geofence && (
        <div className="field">
          <label>
            <input type="checkbox" name="active" defaultChecked={geofence.active} /> Geocerca activa
          </label>
        </div>
      )}
      <div>
        <button className="btn" type="submit">{geofence ? "Guardar cambios" : "Crear geocerca"}</button>
      </div>
    </form>
  );
}
