import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listOrgUnits } from "@/lib/data/org-units";
import { createUserAction } from "../actions";

export default async function NuevoUsuarioPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.ADMIN);
  const params = await searchParams;
  const orgUnits = await listOrgUnits(session);

  return (
    <div>
      <h1>Nuevo usuario</h1>
      {params.error && <p className="alert-error">{params.error}</p>}
      <div className="card">
        <form className="stack" action={createUserAction}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="name">Nombre y apellido</label>
              <input id="name" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="email">Email (será el login)</label>
              <input id="email" name="email" type="email" required />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="role">Rol</label>
              <select id="role" name="role" required defaultValue="SUPERVISOR">
                <option value="ADMIN">Administrador</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="DESK_AGENT">Mesa 24/7</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="orgUnitId">Unidad organizacional (requerida salvo Administrador)</label>
              <select id="orgUnitId" name="orgUnitId" defaultValue="">
                <option value="">— Sin unidad (solo Administrador) —</option>
                {orgUnits.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña inicial (mín. 8)</label>
              <input id="password" name="password" type="password" required minLength={8} />
            </div>
          </div>
          <p className="muted">
            Para cuentas de <strong>conductor</strong> o <strong>proveedor</strong>, usá las secciones
            Conductores / Proveedores: allí el alta crea el usuario ya vinculado.
          </p>
          <div>
            <button className="btn" type="submit">Crear usuario</button>
          </div>
        </form>
      </div>
    </div>
  );
}
