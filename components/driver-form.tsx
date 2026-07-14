import type { Driver, OrgUnit } from "@/lib/data/types";
import { dateInputValue } from "@/lib/format";

export function DriverForm({
  action,
  orgUnits,
  driver,
}: {
  action: (formData: FormData) => Promise<void>;
  orgUnits: Array<Pick<OrgUnit, "id" | "name">>;
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
          <label htmlFor="documentId">Documento (DNI)</label>
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
          <input id="licenseCategory" name="licenseCategory" required defaultValue={driver?.licenseCategory ?? ""} />
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
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="SUSPENDED">Suspendido</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="orgUnitId">Unidad organizacional</label>
          <select id="orgUnitId" name="orgUnitId" required defaultValue={driver?.orgUnitId ?? ""}>
            <option value="" disabled>Seleccionar…</option>
            {orgUnits.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
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
