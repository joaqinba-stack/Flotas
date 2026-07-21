import { datetimeInputValue } from "@/lib/format";
import type { CatalogOption } from "@/lib/data/catalogs";

type VehicleOption = { id: string; plate: string; fuelType: string };
type JornadaOption = { id: string; purpose: string; vehicle: { plate: string } };

export function FuelLoadForm({
  action,
  vehicles,
  jornadas,
  fuelTypes,
  stations,
  fixedVehicleId,
}: {
  action: (formData: FormData) => Promise<void>;
  vehicles: VehicleOption[];
  jornadas: JornadaOption[];
  fuelTypes: CatalogOption[];
  stations: CatalogOption[];
  fixedVehicleId?: string;
}) {
  return (
    <form className="stack" action={action}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="vehicleId">Vehículo</label>
          <select id="vehicleId" name="vehicleId" required defaultValue={fixedVehicleId ?? ""}>
            <option value="" disabled>Seleccionar…</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.plate}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="jornadaId">Jornada operativa (trazabilidad)</label>
          <select id="jornadaId" name="jornadaId" defaultValue="">
            <option value="">Sin jornada</option>
            {jornadas.map((j) => (
              <option key={j.id} value={j.id}>{j.vehicle.plate} — {j.purpose}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="loadedAt">Fecha y hora de carga</label>
          <input id="loadedAt" name="loadedAt" type="datetime-local" required defaultValue={datetimeInputValue(new Date())} />
        </div>
        <div className="field">
          <label htmlFor="odometerKm">Odómetro (km)</label>
          <input id="odometerKm" name="odometerKm" type="number" required min={0} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="liters">Litros</label>
          <input id="liters" name="liters" type="number" step="0.01" required min={0.01} />
        </div>
        <div className="field">
          <label htmlFor="pricePerLiter">Precio por litro</label>
          <input id="pricePerLiter" name="pricePerLiter" type="number" step="0.01" />
        </div>
        <div className="field">
          <label htmlFor="fuelType">Combustible</label>
          <select id="fuelType" name="fuelType" defaultValue="DIESEL">
            {fuelTypes.map((f) => (
              <option key={f.code} value={f.code}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="station">Estación / punto de carga</label>
        <input id="station" name="station" list="station-options" placeholder="Opcional" />
        <datalist id="station-options">
          {stations.map((st) => (
            <option key={st.code} value={st.code}>{st.label}</option>
          ))}
        </datalist>
      </div>
      <div>
        <button className="btn" type="submit">Registrar carga</button>
      </div>
    </form>
  );
}
