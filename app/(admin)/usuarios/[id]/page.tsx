import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getUser } from "@/lib/data/users";
import { listOrgUnits } from "@/lib/data/org-units";
import {
  updateUserAction,
  setUserPasswordAction,
  generateResetLinkAction,
} from "../actions";

const MANAGED_ROLES: Role[] = [Role.ADMIN, Role.SUPERVISOR, Role.DESK_AGENT];

export default async function UsuarioDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string; resetUrl?: string }>;
}) {
  const session = await requireSession(Role.ADMIN);
  const { id } = await params;
  const sp = await searchParams;
  const [user, orgUnits] = await Promise.all([getUser(session, id), listOrgUnits(session)]);
  const roleEditable = MANAGED_ROLES.includes(user.role);

  return (
    <div>
      <div className="page-header">
        <h1>{user.name}</h1>
        {user.active ? <span className="badge green">Activo</span> : <span className="badge red">Inactivo</span>}
      </div>
      {sp.error && <p className="alert-error">{sp.error}</p>}
      {sp.ok && <p className="alert-ok">{sp.ok}</p>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Datos de la cuenta</h2>
        <form className="stack" action={updateUserAction.bind(null, user.id)}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="name">Nombre y apellido</label>
              <input id="name" name="name" required defaultValue={user.name} />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={user.email} disabled />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="role">Rol</label>
              {roleEditable ? (
                <select id="role" name="role" defaultValue={user.role}>
                  <option value="ADMIN">Administrador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="DESK_AGENT">Mesa 24/7</option>
                </select>
              ) : (
                <input
                  value={user.role === Role.DRIVER ? "Conductor (vinculado a legajo)" : "Proveedor (vinculado a razón social)"}
                  disabled
                />
              )}
            </div>
            <div className="field">
              <label htmlFor="orgUnitId">Unidad organizacional (requerida salvo Administrador)</label>
              <select id="orgUnitId" name="orgUnitId" defaultValue={user.orgUnitId ?? ""}>
                <option value="">— Sin unidad (solo Administrador) —</option>
                {orgUnits.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
          {(user.driver || user.supplier) && (
            <p className="muted">
              Vinculado a {user.driver ? `conductor ${user.driver.firstName} ${user.driver.lastName}` : `proveedor ${user.supplier?.name}`}.
            </p>
          )}
          <div className="field">
            <label>
              <input type="checkbox" name="active" defaultChecked={user.active} /> Cuenta activa (desmarcá para bloquear el acceso)
            </label>
          </div>
          <div>
            <button className="btn" type="submit">Guardar cambios</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Contraseña</h2>
        <form className="filter-bar" action={setUserPasswordAction.bind(null, user.id)}>
          <div className="field">
            <label htmlFor="password">Nueva contraseña (mín. 8)</label>
            <input id="password" name="password" type="password" required minLength={8} />
          </div>
          <button className="btn" type="submit">Cambiar contraseña</button>
        </form>

        <h3>Link de recuperación</h3>
        <p className="muted">
          Genera un link de un solo uso (vence en 60 minutos) para que la persona defina su propia
          contraseña — el mismo que produce “¿Olvidaste tu contraseña?” en el login.
        </p>
        <form action={generateResetLinkAction.bind(null, user.id)}>
          <button className="btn secondary" type="submit">Generar link de recuperación</button>
        </form>
        {sp.resetUrl && (
          <div className="field" style={{ marginTop: 12 }}>
            <label>Compartí este link con la persona (un solo uso):</label>
            <input className="mono" readOnly defaultValue={sp.resetUrl} />
          </div>
        )}
      </div>
    </div>
  );
}
