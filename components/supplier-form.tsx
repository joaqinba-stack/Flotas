import type { Supplier } from "@/lib/data/types";

export function SupplierForm({
  action,
  supplier,
}: {
  action: (formData: FormData) => Promise<void>;
  supplier?: Supplier | null;
}) {
  return (
    <form className="stack" action={action}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="name">Razón social</label>
          <input id="name" name="name" required defaultValue={supplier?.name ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="taxId">CUIT</label>
          <input id="taxId" name="taxId" required defaultValue={supplier?.taxId ?? ""} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="serviceTypes">Rubros / servicios</label>
        <input id="serviceTypes" name="serviceTypes" required defaultValue={supplier?.serviceTypes ?? ""} placeholder="Mecánica, gomería, electricidad…" />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="contactName">Contacto</label>
          <input id="contactName" name="contactName" defaultValue={supplier?.contactName ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="contactEmail">Email de contacto</label>
          <input id="contactEmail" name="contactEmail" type="email" defaultValue={supplier?.contactEmail ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="contactPhone">Teléfono</label>
          <input id="contactPhone" name="contactPhone" defaultValue={supplier?.contactPhone ?? ""} />
        </div>
      </div>
      {supplier && (
        <div className="field">
          <label>
            <input type="checkbox" name="active" defaultChecked={supplier.active} /> Proveedor activo
          </label>
        </div>
      )}
      {!supplier && (
        <>
          <h3>Acceso al portal del proveedor (opcional)</h3>
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
        <button className="btn" type="submit">{supplier ? "Guardar cambios" : "Crear proveedor"}</button>
      </div>
    </form>
  );
}
