import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listUsers } from "@/lib/data/users";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  DRIVER: "Conductor",
  SUPPLIER: "Proveedor",
  DESK_AGENT: "Mesa 24/7",
};

export default async function UsuariosPage() {
  const session = await requireSession(Role.ADMIN);
  const users = await listUsers(session);

  return (
    <div>
      <div className="page-header">
        <h1>Usuarios</h1>
        <Link className="btn" href="/usuarios/nuevo">Nuevo usuario</Link>
      </div>

      <table className="data">
        <thead>
          <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Unidad / vínculo</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td><Link href={`/usuarios/${u.id}`}><strong>{u.name}</strong></Link></td>
              <td className="mono">{u.email}</td>
              <td>{ROLE_LABEL[u.role]}</td>
              <td>
                {u.driver
                  ? `Conductor: ${u.driver.firstName} ${u.driver.lastName}`
                  : u.supplier
                    ? `Proveedor: ${u.supplier.name}`
                    : (u.orgUnit?.name ?? "—")}
              </td>
              <td>{u.active ? <span className="badge green">Activo</span> : <span className="badge red">Inactivo</span>}</td>
            </tr>
          ))}
          {users.length === 0 && <tr><td colSpan={5} className="muted">Sin usuarios.</td></tr>}
        </tbody>
      </table>

      <p className="muted" style={{ marginTop: 12 }}>
        Las cuentas de <strong>conductores</strong> y <strong>proveedores</strong> se crean desde sus
        secciones (Conductores / Proveedores) para mantener el vínculo con el legajo u orden de servicio.
      </p>
    </div>
  );
}
