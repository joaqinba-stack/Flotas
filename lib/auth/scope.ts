import type { SessionUser } from "./session";
import { Role } from "@/lib/data/types";
import { ForbiddenError } from "@/lib/errors";

// Filtro por jerarquía organizacional (materialized path) para entidades con
// relación `orgUnit`. ADMIN ve todo; SUPERVISOR/DESK_AGENT ven su subárbol.
// DRIVER/SUPPLIER nunca se scopean por organigrama: cada repositorio aplica su
// filtro duro por driverId/supplierId propio.
export function buildOrgScopeWhere(
  session: SessionUser,
  relationName = "orgUnit",
): Record<string, unknown> {
  if (session.role === Role.ADMIN) return {};
  if (session.role === Role.SUPERVISOR || session.role === Role.DESK_AGENT) {
    if (!session.orgPath) throw new ForbiddenError("Usuario sin unidad organizacional asignada");
    return { [relationName]: { path: { startsWith: session.orgPath } } };
  }
  throw new ForbiddenError("Rol sin acceso por organigrama");
}

export function isOrgScoped(session: SessionUser): boolean {
  return session.role === Role.SUPERVISOR || session.role === Role.DESK_AGENT;
}

// Verifica que un path concreto esté dentro del subárbol del viewer.
export function assertPathInScope(session: SessionUser, path: string): void {
  if (session.role === Role.ADMIN) return;
  if (
    (session.role === Role.SUPERVISOR || session.role === Role.DESK_AGENT) &&
    session.orgPath &&
    path.startsWith(session.orgPath)
  ) {
    return;
  }
  throw new ForbiddenError();
}
