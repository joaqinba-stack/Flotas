import Link from "next/link";
import type { OrgUnit, Vehicle } from "@/lib/data/types";
import type { CatalogOption } from "@/lib/data/catalogs";

export function VehicleForm({
  action,
  orgUnits,
  fuelTypes,
  brands,
  types,
  vehicle,
}: {
  action: (formData: FormData) => Promise<void>;
  orgUnits: Array<Pick<OrgUnit, "id" | "name" | "path">>;
  fuelTypes: CatalogOption[];
  brands: CatalogOption[];
  types: CatalogOption[];
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
          <input id="brand" name="brand" list="brand-options" required defaultValue={vehicle?.brand ?? ""} />
          <datalist id="brand-options">
            {brands.map((b) => (
              <option key={b.code} value={b.code}>{b.label}</option>
            ))}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="model">Modelo</label>
          <input id="model" name="model" required defaultValue={vehicle?.model ?? ""} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="type">Tipo de unidad</label>
          <input id="type" name="type" list="type-options" required placeholder="Utilitario, camión, sedán…" defaultValue={vehicle?.type ?? ""} />
          <datalist id="type-options">
            {types.map((t) => (
              <option key={t.code} value={t.code}>{t.label}</option>
            ))}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="fuelType">Combustible</label>
          <select id="fuelType" name="fuelType" defaultValue={vehicle?.fuelType ?? "NAFTA"}>
            {fuelTypes.map((f) => (
              <option key={f.code} value={f.code}>{f.label}</option>
            ))}
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
        <select
          id="orgUnitId"
          name="orgUnitId"
          required
          defaultValue={vehicle?.orgUnitId ?? ""}
          disabled={orgUnits.length === 0}
        >
          <option value="" disabled>Seleccionar…</option>
          {orgUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {"—".repeat(Math.max(0, u.path.split("/").length - 3))} {u.name}
            </option>
          ))}
        </select>
        {orgUnits.length === 0 && (
          <small className="muted">
            No hay unidades cargadas. Creá la primera en <Link href="/organigrama">Organigrama</Link>.
          </small>
        )}
      </div>
      <div>
        <button className="btn" type="submit">{vehicle ? "Guardar cambios" : "Crear vehículo"}</button>
      </div>
    </form>
  );
}
