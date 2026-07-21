import Link from "next/link";
import type { Driver, OrgUnit } from "@/lib/data/types";
import type { CatalogOption } from "@/lib/data/catalogs";
import { dateInputValue } from "@/lib/format";

export function DriverForm({
  action,
  orgUnits,
  statuses,
  licenseCategories,
  driver,
}: {
  action: (formData: FormData) => Promise<void>;
  orgUnits: Array<Pick<OrgUnit, "id" | "name">>;
  statuses: CatalogOption[];
  licenseCategories: CatalogOption[];
  driver?: Driver | null;
}) {
  return (
    <form className="stack" action={action}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="firstName">Nombre</label>
          <input id="firstName" name="firstName" required defaultValue={driver?.firstName ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="lastName">Apellido</label>
          <input id="lastName" name="lastName" required defaultValue={driver?.lastName ?? ""} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="documentId">Documento (Cédula)</label>
          <input id="documentId" name="documentId" required defaultValue={driver?.documentId ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="phone">Teléfono</label>
          <input id="phone" name="phone" defaultValue={driver?.phone ?? ""} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="licenseNumber">Licencia N°</label>
          <input id="licenseNumber" name="licenseNumber" required defaultValue={driver?.licenseNumber ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="licenseCategory">Categoría</label>
          {/* Datalist y no select: el campo es texto libre en la base y hay
              legajos cargados antes de existir el catálogo. Sugiere los valores
              de Datos sin bloquear los que ya estaban. */}
          <input
            id="licenseCategory"
            name="licenseCategory"
            list="licenseCategory-options"
            required
            defaultValue={driver?.licenseCategory ?? ""}
          />
          <datalist id="licenseCategory-options">
            {licenseCategories.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="licenseExpiry">Vencimiento</label>
          <input id="licenseExpiry" name="licenseExpiry" type="date" required defaultValue={dateInputValue(driver?.licenseExpiry)} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="status">Estado</label>
          <select id="status" name="status" defaultValue={driver?.status ?? "ACTIVE"}>
            {statuses.map((s) => (
              <option key={s.code} value={s.code}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="orgUnitId">Unidad organizacional</label>
          <select
            id="orgUnitId"
            name="orgUnitId"
            required
            defaultValue={driver?.orgUnitId ?? ""}
            disabled={orgUnits.length === 0}
          >
            <option value="" disabled>Seleccionar…</option>
            {orgUnits.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          {/* Sin unidades el select queda vacío y el alta falla sin explicar por
              qué: el organigrama se carga en su propia sección. */}
          {orgUnits.length === 0 && (
            <small className="muted">
              No hay unidades cargadas. Creá la primera en{" "}
              <Link href="/organigrama">Organigrama</Link>.
            </small>
          )}
        </div>
      </div>
      {!driver && (
        <>
          <h3>Acceso al portal del conductor (opcional)</h3>
          <div className="form-row">
            <div className="field">
              <label htmlFor="loginEmail">Email de acceso</label>
              <input id="loginEmail" name="loginEmail" type="email" />
            </div>
            <div className="field">
              <label htmlFor="loginPassword">Contraseña (mín. 8)</label>
              <input id="loginPassword" name="loginPassword" type="password" />
            </div>
          </div>
        </>
      )}
      <div>
        <button className="btn" type="submit">{driver ? "Guardar cambios" : "Crear conductor"}</button>
      </div>
    </form>
  );
}
