import { datetimeInputValue } from "@/lib/format";
import type { CatalogOption } from "@/lib/data/catalogs";

type VehicleOption = { id: string; plate: string };
type JornadaOption = { id: string; purpose: string; vehicle: { plate: string } };

export function IncidentForm({
  action,
  vehicles,
  jornadas,
  urgencies,
  categories,
}: {
  action: (formData: FormData) => Promise<void>;
  vehicles: VehicleOption[];
  jornadas: JornadaOption[];
  urgencies: CatalogOption[];
  categories: CatalogOption[];
}) {
  return (
    <form className="stack" action={action}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="vehicleId">Vehículo</label>
          <select id="vehicleId" name="vehicleId" required defaultValue="">
            <option value="" disabled>Seleccionar…</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.plate}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="jornadaId">Jornada vinculada</label>
          <select id="jornadaId" name="jornadaId" defaultValue="">
            <option value="">Sin jornada</option>
            {jornadas.map((j) => (
              <option key={j.id} value={j.id}>{j.vehicle.plate} — {j.purpose}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="title">Título</label>
        <input id="title" name="title" required />
      </div>
      <div className="field">
        <label htmlFor="description">Descripción</label>
        <textarea id="description" name="description" rows={3} required />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="category">Categoría</label>
          <input id="category" name="category" list="category-options" required placeholder="Mecánica, choque, robo…" />
          <datalist id="category-options">
            {categories.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="urgency">Urgencia</label>
          <select id="urgency" name="urgency" defaultValue="MEDIUM">
            {urgencies.map((u) => (
              <option key={u.code} value={u.code}>{u.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="occurredAt">Ocurrió</label>
          <input id="occurredAt" name="occurredAt" type="datetime-local" required defaultValue={datetimeInputValue(new Date())} />
        </div>
      </div>
      <div>
        <button className="btn" type="submit">Registrar incidencia</button>
      </div>
    </form>
  );
}
