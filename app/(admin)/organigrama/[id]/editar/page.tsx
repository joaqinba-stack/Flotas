import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getOrgUnit, listOrgUnits } from "@/lib/data/org-units";
import { updateOrgUnitAction } from "../../actions";

export default async function EditarUnidadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const { id } = await params;
  const [unit, units, sp] = await Promise.all([
    getOrgUnit(session, id),
    listOrgUnits(session),
    searchParams,
  ]);
  return (
    <div>
      <h1>Editar unidad — {unit.name}</h1>
      {sp.error && <p className="alert-error">{sp.error}</p>}
      <div className="card">
        <form className="stack" action={updateOrgUnitAction.bind(null, id)}>
          <div className="field">
            <label htmlFor="name">Nombre</label>
            <input id="name" name="name" required defaultValue={unit.name} />
          </div>
          <div className="field">
            <label htmlFor="kind">Tipo</label>
            <select id="kind" name="kind" defaultValue={unit.kind}>
              <option value="DIRECCION">Dirección</option>
              <option value="DEPARTAMENTO">Departamento</option>
              <option value="BASE_LOGISTICA">Base logística</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="parentId">Depende de</label>
            <select id="parentId" name="parentId" defaultValue={unit.parentId ?? ""}>
              <option value="">(raíz)</option>
              {units
                .filter((u) => u.id !== id)
                .map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
            </select>
          </div>
          <div>
            <button className="btn" type="submit">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
